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
 * Obtiene la configuración de la empresa (establecimientos, series y métodos de pago)
 * en tiempo real desde la API del Facturador Pro del tenant correspondiente.
 * 
 * NOTA: La API /company solo retorna el establecimiento asignado al usuario del token,
 * no todos los establecimientos de la empresa. Por eso complementamos con datos de raw_json.
 */
export async function getCompanyBillingConfig(companyId: string) {
  const cacheKey = `company_billing_config_v8:${companyId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) return { establishments: [], series: [], paymentMethods: [] };
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    // 1. Consultar /company del tenant (retorna establecimientos y series visibles para este token)
    const compRes = await client.get('/company');
    const establishments = compRes.data?.establishments || [];
    const series = compRes.data?.series || [];
    const paymentMethods = compRes.data?.payment_method_types || [];

    // 2. Descubrir todos los almacenes/sucursales reales de la empresa desde /document/search-items
    const warehouseNames: Record<number, string> = {};
    try {
      const searchRes = await client.get('/document/search-items');
      const items = searchRes.data?.data?.items || searchRes.data?.data || [];
      if (Array.isArray(items)) {
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
      }
    } catch (e: any) {}

    // Asegurar que el método '99' (Crédito) esté presente
    if (!paymentMethods.find((pm: any) => pm.id === '99')) {
      paymentMethods.push({ id: '99', description: 'Crédito' });
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
 * Obtiene la lista dinámica y unificada de TODAS las Sucursales
 * para CUALQUIER empresa conectada.
 * 
 * ARQUITECTURA 100% DINÁMICA:
 * 1. Lee almacenes y locales desde /document/search-items (catálogo completo de sedes físicas)
 * 2. Lee establecimientos y series desde API /company
 * 3. Enriquece con establishment_id y nombres desde los documentos sincronizados (raw_json)
 * 4. Correlaciona series usando el patrón de sufijo numérico
 */
export async function getCompanyBranches(companyId: string): Promise<BranchInfo[]> {
  const config = await getCompanyBillingConfig(companyId);
  const officialEstablishments = config.establishments || [];
  const officialSeries = config.series || [];
  const warehouses = config.warehouses || {};

  // 1. Diccionario dinámico de nombres de sucursal por establishment_id
  const branchNameById: Record<number, string> = {};

  // A. Agregar todos los locales descubiertos desde almacenes
  for (const [idStr, name] of Object.entries(warehouses)) {
    const id = parseInt(idStr, 10);
    if (!isNaN(id) && name) branchNameById[id] = name as string;
  }

  // B. Agregar o enriquecer con descripciones oficiales de establishments de /company
  for (const est of officialEstablishments) {
    if (est.id && est.description) {
      branchNameById[est.id] = est.description;
    }
  }

  // 2. Mapeo real de Series -> establishment_id
  const seriesToEstId: Record<string, number> = {};
  const seriesToBranchName: Record<string, string> = {};

  // A. Desde las series oficiales de Facturador Pro (/company)
  for (const os of officialSeries) {
    if (os.number && os.establishment_id) {
      seriesToEstId[os.number] = os.establishment_id;
    }
  }

  // B. Desde los registros de venta reales sincronizados (sales.raw_json)
  // Esta es la fuente MÁS CONFIABLE porque contiene datos de TODAS las sedes
  // que el admin haya sincronizado, incluyendo establishment_id del seller
  let allDbSeries: string[] = [];
  try {
    const dbSalesInfo = await sqlClient`
      SELECT DISTINCT 
        series,
        COALESCE(
          (raw_json->>'establishment_id')::int,
          (raw_json->'establishment'->>'id')::int,
          (raw_json->>'establishmentId')::int,
          (raw_json->'seller'->>'establishment_id')::int
        ) as est_id,
        COALESCE(
          raw_json->>'establishment_description',
          raw_json->'establishment'->>'description',
          raw_json->>'establishment_name',
          raw_json->'seller'->'establishment'->>'description'
        ) as est_desc
      FROM sales
      WHERE company_id = ${companyId} AND series IS NOT NULL AND series != ''
      ORDER BY series ASC
    `;

    dbSalesInfo.forEach((r: any) => {
      const s = r.series as string;
      if (s && !allDbSeries.includes(s)) allDbSeries.push(s);
      
      if (s && r.est_id && !seriesToEstId[s]) {
        seriesToEstId[s] = r.est_id;
      }
      if (r.est_id && r.est_desc && !branchNameById[r.est_id]) {
        branchNameById[r.est_id] = r.est_desc;
      }
      if (s && r.est_desc) {
        seriesToBranchName[s] = r.est_desc;
      }
    });
  } catch (e: any) {
    console.warn(`[Branch Resolver] Could not query sales series:`, e.message);
  }

  // C. Construir mapa de correlación de sufijo numérico y detectar offset si existe
  // Ejemplo: si F006 -> est_id=2, entonces offset = 6 - 2 = 4
  const suffixToEstId: Record<string, number> = {};
  let detectedOffset: number | null = null;

  for (const [s, estId] of Object.entries(seriesToEstId)) {
    const match = s.match(/([A-Za-z]+)(\d+)/);
    if (match) {
      const rawSuffix = match[2];
      const numVal = parseInt(rawSuffix, 10);
      
      suffixToEstId[rawSuffix] = estId;
      suffixToEstId[String(numVal)] = estId;
      suffixToEstId[String(numVal).padStart(2, '0')] = estId;
      suffixToEstId[String(numVal).padStart(3, '0')] = estId;

      if (numVal > estId && detectedOffset === null) {
        detectedOffset = numVal - estId;
      }
    }
  }

  // 3. Función para resolver a qué sucursal pertenece cada serie
  const resolveEstIdForSeries = (s: string): number => {
    // Paso 1: Asignación directa conocida desde la API o desde raw_json
    if (seriesToEstId[s]) return seriesToEstId[s];

    const match = s.match(/([A-Za-z]+)(\d+)/);
    if (match) {
      const rawSuffix = match[2];
      const numericVal = parseInt(rawSuffix, 10);

      // Paso 2: Coincidencia en suffixToEstId
      if (suffixToEstId[rawSuffix]) return suffixToEstId[rawSuffix];
      if (suffixToEstId[String(numericVal)]) return suffixToEstId[String(numericVal)];

      // Paso 3: Aplicar offset detectado (ej: serie 5 -> estId 1, serie 9 -> estId 5)
      if (detectedOffset !== null) {
        const offsetEstId = numericVal - detectedOffset;
        if (branchNameById[offsetEstId]) return offsetEstId;
      }

      // Paso 4: Si el número coincide directamente con un ID de establecimiento
      if (branchNameById[numericVal]) return numericVal;
    }

    // Paso 5: Fallback al primer establecimiento oficial
    if (officialEstablishments.length > 0 && officialEstablishments[0].id) {
      return officialEstablishments[0].id;
    }

    return 1;
  };

  // 4. Inicializar todas las sucursales oficiales detectadas
  const branchesMap: Record<string, BranchInfo> = {};

  for (const [idStr, name] of Object.entries(branchNameById)) {
    const estId = parseInt(idStr, 10);
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

  // 5. Asignar cada serie encontrada en ventas a su sucursal
  for (const s of allDbSeries) {
    const estId = resolveEstIdForSeries(s);
    const key = String(estId);

    if (!branchesMap[key]) {
      const name = seriesToBranchName[s] || branchNameById[estId] || `Sucursal ${estId}`;
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

  // 6. Retornar todas las sucursales descubiertas
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

  if (result.length === 0) {
    result.push({
      id: '1',
      name: 'Sucursal Principal',
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
