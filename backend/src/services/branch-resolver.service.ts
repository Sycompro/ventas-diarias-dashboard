import { db, sqlClient } from '../config/database.js';
import { companies } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from './crypto.service.js';
import { createBillingClient } from './billing-api.service.js';
import { redis } from '../config/redis.js';

export interface BranchInfo {
  id: string;
  name: string;
  series: string[];
  establishmentId?: number;
  sellers?: string[];
}

/**
 * Obtiene la configuración completa de la empresa desde el Facturador Pro y la caché
 */
export async function getCompanyBillingConfig(companyId: string) {
  const cacheKey = `company_billing_config_v3:${companyId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // Redis optional fallback
  }

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) return { establishments: [], series: [], paymentMethods: [] };
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    const res = await client.get('/company');
    const data = {
      establishments: res.data?.establishments || [],
      series: res.data?.series || [],
      paymentMethods: res.data?.payment_method_types || []
    };
    
    try {
      await redis.setex(cacheKey, 600, JSON.stringify(data));
    } catch {}
    
    return data;
  } catch (error: any) {
    console.warn(`[Branch Resolver] Warning loading billing config:`, error.message);
    return { establishments: [], series: [], paymentMethods: [] };
  }
}

/**
 * Obtiene la lista completa y unificada de TODAS las Sedes reales de una empresa.
 * Combina:
 * 1. Los establecimientos oficiales registrados en el Facturador Pro.
 * 2. Las series con ventas reales registradas en la base de datos.
 */
export async function getCompanyBranches(companyId: string): Promise<BranchInfo[]> {
  const config = await getCompanyBillingConfig(companyId);
  const officialEstablishments = config.establishments || [];
  const officialSeries = config.series || [];

  // Consultar todas las series distintas y sus vendedores con ventas en la BD
  let dbSeriesRows: Array<{ series: string; seller_name: string }> = [];
  try {
    dbSeriesRows = await sqlClient`
      SELECT DISTINCT series, COALESCE(seller_name, 'Sin Vendedor') as seller_name
      FROM sales
      WHERE company_id = ${companyId} AND series IS NOT NULL AND series != ''
      ORDER BY series ASC
    `;
  } catch (e: any) {
    console.warn(`[Branch Resolver] Could not query sales series:`, e.message);
  }

  const allDbSeries = [...new Set(dbSeriesRows.map(r => r.series))];
  const sellersBySeries: Record<string, Set<string>> = {};
  dbSeriesRows.forEach(r => {
    if (!sellersBySeries[r.series]) sellersBySeries[r.series] = new Set();
    if (r.seller_name) sellersBySeries[r.series].add(r.seller_name);
  });

  const branches: BranchInfo[] = [];
  const coveredSeries = new Set<string>();

  // 1. Procesar establecimientos oficiales de Facturador Pro
  for (const est of officialEstablishments) {
    const estId = est.id;
    const estName = est.description || `Sede ${estId}`;
    
    // Series asignadas formalmente a este establecimiento
    const estSeries = officialSeries
      .filter((s: any) => s.establishment_id === estId)
      .map((s: any) => s.number);

    // Vendedores asociados a esas series
    const estSellers = new Set<string>();
    estSeries.forEach((s: string) => {
      coveredSeries.add(s);
      const sellers = sellersBySeries[s];
      if (sellers) sellers.forEach(sel => estSellers.add(sel));
    });

    branches.push({
      id: String(estId),
      name: estName,
      series: estSeries,
      establishmentId: estId,
      sellers: [...estSellers]
    });
  }

  // 2. Procesar series en ventas que NO están en ningún establecimiento oficial
  // Agrupar por prefijo o identificador de sede/caja
  const unmappedSeries = allDbSeries.filter(s => !coveredSeries.has(s));
  
  // Agrupar series huérfanas por su correlativo o serie
  // Ej: B005, B008, B009, NV08
  const groupedUnmapped: Record<string, string[]> = {};
  for (const s of unmappedSeries) {
    // Si es una serie como B008 o NV08, agrupar por correlativo '08' o usar la serie directa
    const match = s.match(/([A-Za-z]+)(\d+)/);
    const suffix = match ? match[2] : s;
    const groupKey = suffix;
    if (!groupedUnmapped[groupKey]) groupedUnmapped[groupKey] = [];
    groupedUnmapped[groupKey].push(s);
  }

  for (const [groupKey, seriesList] of Object.entries(groupedUnmapped)) {
    const sellers = new Set<string>();
    seriesList.forEach(s => {
      const sels = sellersBySeries[s];
      if (sels) sels.forEach(sel => sellers.add(sel));
    });

    // Nombre legible para la sede/caja
    const sampleSeries = seriesList[0];
    const sellerSample = [...sellers][0];
    let branchName = `Sede / Caja ${seriesList.join(', ')}`;
    if (sellerSample) {
      branchName = `Sede ${seriesList.join('/')} (${sellerSample.split(' ')[0]})`;
    }

    branches.push({
      id: `series:${seriesList.join(',')}`,
      name: branchName,
      series: seriesList,
      sellers: [...sellers]
    });
  }

  // Si no se encontró ningún establecimiento ni serie, retornar Sede Principal por defecto
  if (branches.length === 0) {
    branches.push({
      id: '1',
      name: 'Sede Principal',
      series: []
    });
  }

  return branches;
}

/**
 * Resuelve el parámetro `branch` a la lista de series correspondientes
 */
export async function resolveBranchSeries(companyId: string, branchParam?: string | null): Promise<string[] | null> {
  if (!branchParam || branchParam === 'all' || branchParam === '') {
    return null; // Todas las sedes
  }

  const branches = await getCompanyBranches(companyId);
  
  // 1. Buscar por ID exacto (ej: "2" o "series:B005" o "series:B008,NV08")
  const foundById = branches.find(b => b.id === branchParam);
  if (foundById && foundById.series.length > 0) {
    return foundById.series;
  }

  // 2. Si el parámetro es un número de establecimiento
  const numId = parseInt(branchParam, 10);
  if (!isNaN(numId)) {
    const foundByEst = branches.find(b => b.establishmentId === numId);
    if (foundByEst && foundByEst.series.length > 0) {
      return foundByEst.series;
    }
  }

  // 3. Si el parámetro es directamente una serie o contiene series separadas por coma
  if (branchParam.includes('series:')) {
    const raw = branchParam.replace('series:', '');
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  // 4. Si el parámetro coincide con el nombre de una serie directa
  return [branchParam];
}

/**
 * Obtiene el nombre amigable de la sede para una serie específica
 */
export function getBranchNameForSeries(seriesName: string, branches: BranchInfo[]): string {
  for (const b of branches) {
    if (b.series.includes(seriesName)) {
      return b.name;
    }
  }
  return `Sede ${seriesName}`;
}
