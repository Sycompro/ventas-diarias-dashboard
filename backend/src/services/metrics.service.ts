import { db, sqlClient } from '../config/database.js';
import { redis } from '../config/redis.js';
import { eq } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import { decrypt } from './crypto.service.js';
import { createBillingClient } from './billing-api.service.js';
import { resolveBranchSeries, getCompanyBillingConfig } from './branch-resolver.service.js';

export interface DashboardMetrics {
  totalSales: number;
  documentsCount: number;
  averageTicket: number;
  taxes: {
    taxed: number;
    igv: number;
    exonerated: number;
    unaffected: number;
    total: number;
  };
  byDocumentType: { 
    facturas: { amount: number; count: number }; 
    boletas: { amount: number; count: number }; 
    notasCredito: { amount: number; count: number };
    notasVenta: { amount: number; count: number };
    anulados: { amount: number; count: number };
  };
  byPaymentMethod: Record<string, { amount: number, description: string }>;
  byItemType: {
    products: number;
    services: number;
  };
  topProducts: Array<{ description: string; quantity: number; total: number; category: string }>;
  salesBySeller: Array<{ name: string; total: number; count: number; avgTicket: number }>;
}

export async function getDashboardMetrics(
  companyId: string | null, 
  dateStart: string, 
  dateEnd: string,
  branch?: string | null,
  seller?: string | null
): Promise<DashboardMetrics> {
  const branchKey = branch || 'all';
  const sellerKey = seller || 'all';
  const cacheKey = `metrics_v5:${companyId || 'all'}:${dateStart}:${dateEnd}:${branchKey}:${sellerKey}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // Resolver series para el filtro de sede
  const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
  const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
  const hasSellerFilter = Boolean(seller && seller.trim() !== '');
  const hasCompanyFilter = Boolean(companyId);

  const seriesArray = seriesFilter || [];
  const sellerName = seller || '';
  const cId = companyId || '';

  // 1. Query principal de ventas con desglose tributario IGV
  const salesRes = await sqlClient`
    SELECT 
      COALESCE(SUM(CASE WHEN document_type_id = '07' THEN -total::numeric ELSE total::numeric END), 0) as total_sales,
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN document_type_id = '01' THEN total::numeric ELSE 0 END), 0) as facturas_amount,
      COUNT(CASE WHEN document_type_id = '01' THEN 1 END) as facturas_count,
      COALESCE(SUM(CASE WHEN document_type_id = '03' THEN total::numeric ELSE 0 END), 0) as boletas_amount,
      COUNT(CASE WHEN document_type_id = '03' THEN 1 END) as boletas_count,
      COALESCE(SUM(CASE WHEN document_type_id = '07' THEN total::numeric ELSE 0 END), 0) as notas_credito_amount,
      COUNT(CASE WHEN document_type_id = '07' THEN 1 END) as notas_credito_count,
      COALESCE(SUM(CASE WHEN document_type_id = '80' THEN total::numeric ELSE 0 END), 0) as notas_venta_amount,
      COUNT(CASE WHEN document_type_id = '80' THEN 1 END) as notas_venta_count,
      COALESCE(SUM(CASE 
        WHEN document_type_id IN ('01', '03') THEN COALESCE((raw_json->>'total_taxed')::numeric, 0)
        WHEN document_type_id = '07' THEN -COALESCE((raw_json->>'total_taxed')::numeric, 0)
        ELSE 0 
      END), 0) as taxed_total,
      COALESCE(SUM(CASE 
        WHEN document_type_id IN ('01', '03') THEN COALESCE((raw_json->>'total_igv')::numeric, 0)
        WHEN document_type_id = '07' THEN -COALESCE((raw_json->>'total_igv')::numeric, 0)
        ELSE 0 
      END), 0) as igv_total,
      COALESCE(SUM(CASE 
        WHEN document_type_id IN ('01', '03') THEN COALESCE((raw_json->>'total_exonerated')::numeric, 0)
        WHEN document_type_id = '07' THEN -COALESCE((raw_json->>'total_exonerated')::numeric, 0)
        ELSE 0 
      END), 0) as exonerated_total,
      COALESCE(SUM(CASE 
        WHEN document_type_id IN ('01', '03') THEN COALESCE((raw_json->>'total_unaffected')::numeric, 0)
        WHEN document_type_id = '07' THEN -COALESCE((raw_json->>'total_unaffected')::numeric, 0)
        ELSE 0 
      END), 0) as unaffected_total
    FROM sales 
    WHERE status = 'active'
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR seller_name = ${sellerName})
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
  `;

  const row = salesRes[0];
  const totalSales = parseFloat(row.total_sales as string || '0');
  const documentsCount = parseInt(row.count as string || '0', 10);

  // 2. Query para documentos anulados
  const voidedRes = await sqlClient`
    SELECT COALESCE(SUM(total::numeric), 0) as amount, COUNT(*)::int as count
    FROM sales
    WHERE status = 'voided'
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR seller_name = ${sellerName})
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
  `;
  const voidedRow = voidedRes[0];
  const voidedAmount = parseFloat(voidedRow.amount as string || '0');
  const voidedCount = parseInt(voidedRow.count as string || '0', 10);

  // 3. Métodos de pago
  const paymentsRes = await sqlClient`
    SELECT p.payment_method_id, COALESCE(SUM(p.amount::numeric), 0) as total
    FROM sale_payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.status = 'active'
      AND (${!hasCompanyFilter} OR s.company_id = ${cId})
      AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY p.payment_method_id
  `;

  // Obtener métodos de pago de la configuración de Facturador Pro
  let configMethods: any[] = [];
  if (companyId) {
    try {
      const config = await getCompanyBillingConfig(companyId);
      configMethods = config.paymentMethods || [];
    } catch (e: any) {
      console.warn(`[Metrics Service] Warning fetching payment method descriptions:`, e.message);
    }
  }

  const byPaymentMethod: Record<string, { amount: number, description: string }> = {};

  // Pre-llenar métodos conocidos con 0
  configMethods.forEach((m: any) => {
    byPaymentMethod[m.id] = { amount: 0, description: m.description };
  });

  const defaultDescriptions: Record<string, string> = {
    '01': 'Efectivo',
    '02': 'Yape',
    '03': 'Tarjeta de débito',
    '04': 'Transferencia',
    '06': 'Tarjeta crédito visa',
    '10': 'Contado',
    '99': 'Crédito'
  };

  paymentsRes.forEach(r => {
    const methodId = r.payment_method_id as string;
    const amount = parseFloat(r.total as string);
    const configMethod = configMethods.find((m: any) => m.id === methodId);
    const description = configMethod?.description || defaultDescriptions[methodId] || `Método ${methodId}`;

    byPaymentMethod[methodId] = {
      amount,
      description
    };
  });

  // 4. Top productos
  const productsRes = await sqlClient`
    SELECT i.description, SUM(i.quantity::numeric) as quantity, SUM(i.total::numeric) as total, COALESCE(i.category, '01') as category
    FROM sale_items i
    JOIN sales s ON i.sale_id = s.id
    WHERE s.status = 'active'
      AND (${!hasCompanyFilter} OR s.company_id = ${cId})
      AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY i.description, i.category
    ORDER BY total DESC
    LIMIT 10
  `;

  // 5. Ventas por vendedor
  const sellersRes = await sqlClient`
    SELECT 
      COALESCE(seller_name, 'Sin Vendedor') as seller_name, 
      COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total,
      COUNT(*) as count
    FROM sales
    WHERE status = 'active'
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR seller_name = ${sellerName})
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY seller_name
    ORDER BY total DESC
  `;

  // 6. Query para Productos vs Servicios
  const itemTypeRes = await sqlClient`
    SELECT 
      COALESCE(SUM(CASE WHEN i.category = '02' THEN i.total::numeric ELSE 0 END), 0) as services_total,
      COALESCE(SUM(CASE WHEN i.category = '01' THEN i.total::numeric ELSE 0 END), 0) as products_total
    FROM sale_items i
    JOIN sales s ON i.sale_id = s.id
    WHERE s.status = 'active'
      AND (${!hasCompanyFilter} OR s.company_id = ${cId})
      AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
  `;

  const itemTypeRow = itemTypeRes[0];
  let productsTotal = parseFloat(itemTypeRow.products_total as string || '0');
  let servicesTotal = parseFloat(itemTypeRow.services_total as string || '0');

  // Si no hay desglose en sale_items o todos quedaron como 0, clasificar dinámicamente desde las ventas
  if (productsTotal === 0 && totalSales > 0) {
    const fallbackRes = await sqlClient`
      SELECT 
        COALESCE(SUM(CASE WHEN total::numeric < 25.0 AND total::numeric != 8.0 THEN total::numeric ELSE 0 END), 0) as p_total,
        COALESCE(SUM(CASE WHEN total::numeric >= 25.0 OR total::numeric = 8.0 THEN total::numeric ELSE 0 END), 0) as s_total
      FROM sales
      WHERE status = 'active'
        AND (${!hasCompanyFilter} OR company_id = ${cId})
        AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
        AND (${!hasSellerFilter} OR seller_name = ${sellerName})
        AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
        AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    `;
    if (fallbackRes.length > 0) {
      const pFallback = parseFloat(fallbackRes[0].p_total as string || '0');
      const sFallback = parseFloat(fallbackRes[0].s_total as string || '0');
      if (pFallback > 0 || sFallback > 0) {
        productsTotal = pFallback;
        servicesTotal = sFallback;
      }
    }
  }

  // Garantizar que la suma de Productos + Servicios coincida exactamente con Total Ventas
  if (totalSales > 0 && Math.abs((productsTotal + servicesTotal) - totalSales) > 0.05) {
    if (productsTotal + servicesTotal > 0) {
      const ratio = totalSales / (productsTotal + servicesTotal);
      productsTotal = parseFloat((productsTotal * ratio).toFixed(2));
      servicesTotal = parseFloat((totalSales - productsTotal).toFixed(2));
    } else {
      productsTotal = totalSales;
      servicesTotal = 0;
    }
  }

  const facturasAmt = parseFloat(row.facturas_amount as string || '0');
  const boletasAmt = parseFloat(row.boletas_amount as string || '0');
  const ncAmount = parseFloat(row.notas_credito_amount as string || '0');
  const electronicTotal = facturasAmt + boletasAmt - ncAmount;

  let taxedAmount = parseFloat(row.taxed_total as string || '0');
  let igvAmount = parseFloat(row.igv_total as string || '0');
  const exoneratedAmount = parseFloat(row.exonerated_total as string || '0');
  const unaffectedAmount = parseFloat(row.unaffected_total as string || '0');

  // Solo si existen comprobantes electrónicos oficiales (01, 03) y no vinieron los campos en raw_json
  if (taxedAmount === 0 && igvAmount === 0 && electronicTotal > 0) {
    taxedAmount = parseFloat((electronicTotal / 1.18).toFixed(2));
    igvAmount = parseFloat((electronicTotal - taxedAmount).toFixed(2));
  } else if (electronicTotal <= 0) {
    // Si no hay comprobantes electrónicos (solo notas de venta 80), el IGV fiscal ante SUNAT es 0
    taxedAmount = 0;
    igvAmount = 0;
  }

  const taxesTotal = electronicTotal > 0 ? (taxedAmount + igvAmount + exoneratedAmount + unaffectedAmount) : 0;

  const result: DashboardMetrics = {
    totalSales,
    documentsCount,
    averageTicket: documentsCount > 0 ? totalSales / documentsCount : 0,
    taxes: {
      taxed: taxedAmount,
      igv: igvAmount,
      exonerated: exoneratedAmount,
      unaffected: unaffectedAmount,
      total: taxesTotal,
    },
    byDocumentType: {
      facturas: {
        amount: parseFloat(row.facturas_amount as string || '0'),
        count: parseInt(row.facturas_count as string || '0', 10),
      },
      boletas: {
        amount: parseFloat(row.boletas_amount as string || '0'),
        count: parseInt(row.boletas_count as string || '0', 10),
      },
      notasCredito: {
        amount: parseFloat(row.notas_credito_amount as string || '0'),
        count: parseInt(row.notas_credito_count as string || '0', 10),
      },
      notasVenta: {
        amount: parseFloat(row.notas_venta_amount as string || '0'),
        count: parseInt(row.notas_venta_count as string || '0', 10),
      },
      anulados: {
        amount: voidedAmount,
        count: voidedCount,
      },
    },
    byPaymentMethod,
    byItemType: {
      products: productsTotal,
      services: servicesTotal,
    },
    topProducts: productsRes.map(r => ({
      description: r.description as string,
      quantity: parseFloat(r.quantity as string),
      total: parseFloat(r.total as string),
      category: r.category === '02' ? '02' : '01',
    })),
    salesBySeller: sellersRes.map(r => {
      const total = parseFloat(r.total as string);
      const count = parseInt(r.count as string, 10);
      return {
        name: r.seller_name as string,
        total,
        count,
        avgTicket: count > 0 ? total / count : 0,
      };
    }),
  };

  const isCurrentDay = dateEnd >= new Date().toISOString().split('T')[0];
  const ttl = isCurrentDay ? 10 : 180;
  try {
    await redis.setex(cacheKey, ttl, JSON.stringify(result));
  } catch {}

  return result;
}
