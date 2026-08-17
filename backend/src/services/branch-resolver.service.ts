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
}

/**
 * Obtiene la configuración de la empresa (establecimientos, almacenes, series y métodos de pago)
 * en tiempo real desde la API del Facturador Pro del tenant correspondiente.
 */
export async function getCompanyBillingConfig(companyId: string) {
  const cacheKey = `company_billing_config_v7:${companyId}`;
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
 * Obtiene la lista dinámica y unificada de TODAS las Sucursales (sin vendedores)
 * para CUALQUIER empresa conectada.
 * 
 * DISEÑO 100% DINÁMICO — SIN REGLAS HARDCODEADAS:
 * 1. Lee los establecimientos y series oficiales de la API de Facturador Pro
 * 2. Lee los nombres de almacenes/sucursales de la API
 * 3. Para series no registradas oficialmente (ej: Notas de Venta NV05),
 *    las correlaciona con series oficiales conocidas que tengan el mismo sufijo numérico
 * 4. NO usa ninguna regla específica de empresa ni mapeos manuales
 */
export async function getCompanyBranches(companyId: string): Promise<BranchInfo[]> {
  const config = await getCompanyBillingConfig(companyId);
  const officialEstablishments = config.establishments || [];
  const officialSeries = config.series || [];
  const warehouses = config.warehouses || {};

  // 1. Diccionario dinámico de nombres de sucursal por establishment_id
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

  // 2. Construir un mapa de sufijo numérico → establishment_id desde las series OFICIALES
  //    Esto nos permite correlacionar series no oficiales (NV05, etc.) con su sucursal correcta
  //    basándonos en datos REALES de la API, no en reglas hardcodeadas.
  const suffixToEstId: Record<string, number> = {};
  for (const os of officialSeries) {
    if (os.establishment_id && os.number) {
      const match = String(os.number).match(/([A-Za-z]+)(\d+)/);
      if (match) {
        const suffix = match[2]; // ej: "005", "006", "01", etc.
        // Solo registrar si no existe aún (la primera serie oficial tiene prioridad)
        if (!suffixToEstId[suffix]) {
          suffixToEstId[suffix] = os.establishment_id;
        }
      }
    }
  }

  // 3. Consultar dinámicamente todas las series con ventas en la base de datos
  let allDbSeries: string[] = [];
  try {
    const dbSeriesRows = await sqlClient`
      SELECT DISTINCT series
      FROM sales
      WHERE company_id = ${companyId} AND series IS NOT NULL AND series != ''
      ORDER BY series ASC
    `;
    allDbSeries = dbSeriesRows.map(r => r.series as string);
  } catch (e: any) {
    console.warn(`[Branch Resolver] Could not query sales series:`, e.message);
  }

  // 4. Función 100% dinámica para resolver a qué sucursal pertenece cada serie
  const resolveEstIdForSeries = (s: string): number => {
    // A. Si está explícitamente en officialSeries de Facturador Pro → usar su establishment_id
    const off = officialSeries.find((os: any) => os.number === s);
    if (off && off.establishment_id) return off.establishment_id;

    // B. Correlacionar con series oficiales conocidas por sufijo numérico
    //    Ej: Si "B005" está asignada oficialmente al establecimiento 1,
    //    entonces "NV05", "F005", "NV005" también pertenecen al establecimiento 1
    const match = s.match(/([A-Za-z]+)(\d+)/);
    if (match) {
      const rawSuffix = match[2]; // "05", "005", "5", "06", etc.
      
      // Buscar coincidencia exacta del sufijo
      if (suffixToEstId[rawSuffix]) return suffixToEstId[rawSuffix];
      
      // Normalizar: "05" → "005" y viceversa (con/sin zero-padding)
      const numericVal = parseInt(rawSuffix, 10);
      
      // Probar variantes de padding: "5" ↔ "05" ↔ "005"
      const variants = [
        String(numericVal),                          // "5"
        String(numericVal).padStart(2, '0'),          // "05"
        String(numericVal).padStart(3, '0'),          // "005"
      ];
      
      for (const variant of variants) {
        if (suffixToEstId[variant]) return suffixToEstId[variant];
      }
      
      // Si el número corresponde directamente a un establishment_id conocido
      if (branchNameById[numericVal]) return numericVal;
    }
    
    // C. Si hay un establecimiento principal oficial, usarlo como fallback
    if (officialEstablishments.length > 0 && officialEstablishments[0].id) {
      return officialEstablishments[0].id;
    }

    return 1;
  };

  // 5. Inicializar TODAS las sucursales detectadas en la API del tenant
  const branchesMap: Record<string, BranchInfo> = {};
  
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
      establishmentId: estId
    };
  }

  // 6. Asignar dinámicamente cada serie encontrada en ventas a la sucursal correspondiente
  for (const s of allDbSeries) {
    const estId = resolveEstIdForSeries(s);
    const key = String(estId);
    
    if (!branchesMap[key]) {
      const name = branchNameById[estId] || `Sucursal ${estId}`;
      branchesMap[key] = {
        id: key,
        name,
        series: [],
        establishmentId: estId
      };
    }

    if (!branchesMap[key].series.includes(s)) {
      branchesMap[key].series.push(s);
    }
  }

  // 7. Retornar TODAS las sucursales descubiertas (tengan o no ventas activas en el rango)
  const result: BranchInfo[] = [];
  const processedKeys = new Set<string>();

  for (const [idStr] of Object.entries(branchNameById)) {
    processedKeys.add(idStr);
    const existing = branchesMap[idStr];
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        id: idStr,
        name: branchNameById[parseInt(idStr, 10)],
        series: [],
        establishmentId: parseInt(idStr, 10)
      });
    }
  }

  for (const [key, b] of Object.entries(branchesMap)) {
    if (!processedKeys.has(key)) {
      result.push(b);
    }
  }

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
