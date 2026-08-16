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
 * Obtiene la configuración completa y los nombres reales de almacenes/sucursales desde Facturador Pro
 */
export async function getCompanyBillingConfig(companyId: string) {
  const cacheKey = `company_billing_config_v5:${companyId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) return { establishments: [], series: [], paymentMethods: [], warehouses: {} };
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    // 1. Consultar /company
    const compRes = await client.get('/company');
    const establishments = compRes.data?.establishments || [];
    const series = compRes.data?.series || [];
    const paymentMethods = compRes.data?.payment_method_types || [];

    // 2. Consultar /items/records para extraer todos los nombres reales de los almacenes/sucursales
    const warehouseNames: Record<number, string> = {};
    try {
      const itemsRes = await client.get('/items/records', { params: { limit: 50 } });
      const items = itemsRes.data?.data || [];
      items.forEach((it: any) => {
        if (Array.isArray(it.warehouses)) {
          it.warehouses.forEach((w: any) => {
            const id = w.warehouse_id || w.id;
            const name = (w.warehouse_description || w.description || w.name || '')
              .replace(/^Almacén\s*-\s*/i, '')
              .replace(/^Almacen\s*-\s*/i, '')
              .trim();
            if (id && name) {
              warehouseNames[id] = name;
            }
          });
        }
      });
    } catch (itemErr: any) {
      console.warn(`[Branch Resolver] Could not fetch warehouses from items:`, itemErr.message);
    }

    const data = {
      establishments,
      series,
      paymentMethods,
      warehouses: warehouseNames
    };
    
    try {
      await redis.setex(cacheKey, 600, JSON.stringify(data));
    } catch {}
    
    return data;
  } catch (error: any) {
    console.warn(`[Branch Resolver] Warning loading billing config:`, error.message);
    return { establishments: [], series: [], paymentMethods: [], warehouses: {} };
  }
}

/**
 * Obtiene la lista completa con los NOMBRES REALES de todas las Sucursales de una empresa
 */
export async function getCompanyBranches(companyId: string): Promise<BranchInfo[]> {
  const config = await getCompanyBillingConfig(companyId);
  const officialEstablishments = config.establishments || [];
  const officialSeries = config.series || [];
  const warehouses = config.warehouses || {};

  // Diccionario consolidado de nombres de sucursal por ID
  const branchNameById: Record<number, string> = {};
  
  // Agregar desde warehouses (que contiene todas las sucursales reales de Facturador Pro)
  for (const [idStr, name] of Object.entries(warehouses)) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id)) branchNameById[id] = name as string;
  }

  // Agregar o sobrescribir con descripciones oficiales de establishments
  for (const est of officialEstablishments) {
    if (est.id && est.description) {
      branchNameById[est.id] = est.description;
    }
  }

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

  const branchesMap: Record<string, BranchInfo> = {};

  // Mapeo conocido o inferido de series a sucursal por ID correlativo
  // En Facturador Pro:
  // Serie terminada en 06 (B006, F006, NV06) -> Sucursal 2 ("LAS BRISAS")
  // Serie terminada en 09 (B009, F009, NV09) -> Sucursal 5 ("JOSE LEONARDO ORTIZ")
  // Serie terminada en 08 (B008, F008, NV08) -> Sucursal 4 ("PIMENTEL")
  // Serie terminada en 05 (B005, F005, NV05) -> Sucursal 1 ("LA PRADERA")
  // Serie terminada en 03 (B003, F003, NV03) -> Sucursal 3 ("LA VICTORIA")
  const resolveEstIdForSeries = (s: string): number => {
    // 1. Buscar si está en officialSeries
    const off = officialSeries.find((os: any) => os.number === s);
    if (off && off.establishment_id) return off.establishment_id;

    // 2. Extraer correlativo numérico de la serie
    const match = s.match(/([A-Za-z]+)(\d+)/);
    if (match) {
      const num = parseInt(match[2], 10);
      if (num === 6) return 2; // LAS BRISAS
      if (num === 9) return 5; // JOSE LEONARDO ORTIZ
      if (num === 8) return 4; // PIMENTEL
      if (num === 5) return 1; // LA PRADERA
      if (num === 3) return 3; // LA VICTORIA
      if (branchNameById[num]) return num;
    }
    return 1;
  };

  // Inicializar sucursales encontradas en Facturador Pro (IDs 1, 2, 3, 4, 5, etc.)
  for (const [idStr, name] of Object.entries(branchNameById)) {
    const estId = parseInt(idStr, 10);
    branchesMap[String(estId)] = {
      id: String(estId),
      name: name,
      series: [],
      establishmentId: estId,
      sellers: []
    };
  }

  // Asignar cada serie de ventas a su sucursal correspondiente
  for (const s of allDbSeries) {
    const estId = resolveEstIdForSeries(s);
    const key = String(estId);
    
    if (!branchesMap[key]) {
      const name = branchNameById[estId] || `Sucursal ${estId}`;
      branchesMap[key] = {
        id: key,
        name,
        series: [],
        establishmentId: estId,
        sellers: []
      };
    }

    if (!branchesMap[key].series.includes(s)) {
      branchesMap[key].series.push(s);
    }

    // Agregar vendedores
    const sellers = sellersBySeries[s];
    if (sellers) {
      if (!branchesMap[key].sellers) branchesMap[key].sellers = [];
      sellers.forEach(sel => {
        if (!branchesMap[key].sellers!.includes(sel)) {
          branchesMap[key].sellers!.push(sel);
        }
      });
    }
  }

  // Filtrar solo aquellas sucursales que tengan series o ventas, o mantener las oficiales
  const result = Object.values(branchesMap).filter(b => b.series.length > 0 || (b.establishmentId && officialEstablishments.some((e: any) => e.id === b.establishmentId)));

  // Si queda vacía, fallback
  if (result.length === 0) {
    result.push({
      id: '1',
      name: branchNameById[1] || 'LA PRADERA',
      series: []
    });
  }

  return result.sort((a, b) => {
    // Ordenar por ID numérico si es posible
    const numA = parseInt(a.id, 10) || 99;
    const numB = parseInt(b.id, 10) || 99;
    return numA - numB;
  });
}

/**
 * Resuelve el parámetro `branch` a la lista de series correspondientes
 */
export async function resolveBranchSeries(companyId: string, branchParam?: string | null): Promise<string[] | null> {
  if (!branchParam || branchParam === 'all' || branchParam === '') {
    return null; // Todas las sucursales
  }

  const branches = await getCompanyBranches(companyId);
  
  // 1. Buscar por ID exacto (ej: "1", "2", "4", "5")
  const foundById = branches.find(b => b.id === String(branchParam));
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

  // 3. Buscar por nombre exacto de la sucursal (ej: "LAS BRISAS", "PIMENTEL", "LA PRADERA")
  const foundByName = branches.find(b => b.name.toLowerCase() === branchParam.toLowerCase());
  if (foundByName && foundByName.series.length > 0) {
    return foundByName.series;
  }

  // 4. Si el parámetro coincide directamente con una serie
  return [branchParam];
}

/**
 * Obtiene el nombre amigable de la sucursal para una serie específica
 */
export function getBranchNameForSeries(seriesName: string, branches: BranchInfo[]): string {
  for (const b of branches) {
    if (b.series.includes(seriesName)) {
      return b.name;
    }
  }
  return `Sucursal ${seriesName}`;
}
