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
 * Obtiene la configuración de la empresa (establecimientos, almacenes, series y métodos de pago)
 * en tiempo real desde la API del Facturador Pro del tenant correspondiente.
 */
export async function getCompanyBillingConfig(companyId: string) {
  const cacheKey = `company_billing_config_v6:${companyId}`;
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
    
    // 1. Consultar /company del tenant
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
      console.warn(`[Branch Resolver] Warning fetching warehouses for company ${companyId}:`, itemErr.message);
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
    console.warn(`[Branch Resolver] Warning loading billing config for ${companyId}:`, error.message);
    return { establishments: [], series: [], paymentMethods: [], warehouses: {} };
  }
}

/**
 * Obtiene la lista dinámica y unificada de TODAS las Sucursales y sus Vendedores
 * para CUALQUIER empresa conectada.
 */
export async function getCompanyBranches(companyId: string): Promise<BranchInfo[]> {
  const config = await getCompanyBillingConfig(companyId);
  const officialEstablishments = config.establishments || [];
  const officialSeries = config.series || [];
  const warehouses = config.warehouses || {};

  // 1. Diccionario dinámico de nombres de sucursal por ID
  const branchNameById: Record<number, string> = {};
  
  // Agregar nombres desde almacenes descubiertos en la API
  for (const [idStr, name] of Object.entries(warehouses)) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id)) branchNameById[id] = name as string;
  }

  // Agregar o enriquecer con descripciones oficiales de establishments
  for (const est of officialEstablishments) {
    if (est.id && est.description) {
      branchNameById[est.id] = est.description;
    }
  }

  // 2. Consultar dinámicamente todas las series y vendedores con ventas en la base de datos
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

  // 3. Función dinámica para resolver a qué sucursal pertenece cada serie
  const resolveEstIdForSeries = (s: string): number => {
    // A. Si está explícitamente en officialSeries de Facturador Pro
    const off = officialSeries.find((os: any) => os.number === s);
    if (off && off.establishment_id) return off.establishment_id;

    // B. Analizar correlativo numérico de la serie (ej: B001, F002, B006, etc.)
    const match = s.match(/([A-Za-z]+)(\d+)/);
    if (match) {
      const num = parseInt(match[2], 10);
      
      // Si el número coincide directamente con una sucursal registrada
      if (branchNameById[num]) return num;

      // Mapeo estándar de correlativos para sucursales registradas
      if (num === 6 && branchNameById[2]) return 2;
      if (num === 9 && branchNameById[5]) return 5;
      if (num === 8 && branchNameById[4]) return 4;
      if ((num === 7 || num === 3) && branchNameById[3]) return 3;
      if ((num === 5 || num === 1) && branchNameById[1]) return 1;
    }
    
    // C. Si hay un establecimiento principal oficial, usarlo
    if (officialEstablishments.length > 0 && officialEstablishments[0].id) {
      return officialEstablishments[0].id;
    }

    return 1;
  };

  // 4. Inicializar todas las sucursales detectadas en la API del tenant
  for (const [idStr, name] of Object.entries(branchNameById)) {
    const estId = parseInt(idStr, 10);
    
    // Series oficiales asignadas en Facturador Pro a este establecimiento
    const estSeries = officialSeries
      .filter((s: any) => s.establishment_id === estId)
      .map((s: any) => s.number);

    branchesMap[String(estId)] = {
      id: String(estId),
      name: name,
      series: [...estSeries],
      establishmentId: estId,
      sellers: []
    };
  }

  // 5. Asignar dinámicamente cada serie de ventas y sus vendedores a la sucursal correspondiente
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

    // Vincular vendedores que emiten en esta serie
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

  // 6. Filtrar sucursales que tengan series o ventas, o mantener las oficiales del tenant
  const result = Object.values(branchesMap).filter(b => 
    b.series.length > 0 || 
    (b.establishmentId && officialEstablishments.some((e: any) => e.id === b.establishmentId))
  );

  // Si queda vacía (empresa nueva sin datos), generar Sucursal Principal dinámica
  if (result.length === 0) {
    result.push({
      id: '1',
      name: branchNameById[1] || 'Sucursal Principal',
      series: []
    });
  }

  return result.sort((a, b) => {
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
  
  // 1. Buscar por ID exacto (ej: "1", "2", "3", "4", "5")
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

  // 3. Buscar por nombre exacto de la sucursal
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
