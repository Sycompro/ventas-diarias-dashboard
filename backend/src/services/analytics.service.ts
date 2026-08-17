import { sqlClient } from '../config/database.js';
import { resolveBranchSeries } from './branch-resolver.service.js';

export interface TrendPoint {
  date: string;
  total: number;
  count: number;
  avgTicket: number;
}

export async function getSalesTrend(
  companyId: string, 
  dateStart: string, 
  dateEnd: string, 
  granularity: 'hour'|'day'|'week'|'month',
  branch?: string | null,
  seller?: string | null
): Promise<TrendPoint[]> {
  const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
  const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
  const hasSellerFilter = Boolean(seller && seller.trim() !== '');
  const hasCompanyFilter = Boolean(companyId);

  const seriesArray = seriesFilter || [];
  const sellerName = seller || '';
  const cId = companyId || '';

  const truncUnit = granularity === 'hour' ? 'hour' 
    : granularity === 'week' ? 'week' 
    : granularity === 'month' ? 'month' 
    : 'day';

  const res = await sqlClient`
    SELECT 
      date_trunc(${truncUnit}, issued_at AT TIME ZONE 'America/Lima') as period,
      COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
      COUNT(*) as count
    FROM sales
    WHERE status = 'active'
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR seller_name = ${sellerName})
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY period
    ORDER BY period ASC
  `;

  return res.map(r => {
    const total = parseFloat(r.total_sales as string || '0');
    const count = parseInt(r.count as string || '0', 10);
    
    let dateStr = '';
    if (r.period instanceof Date) {
      dateStr = r.period.toISOString();
    } else if (typeof r.period === 'string') {
      dateStr = new Date(r.period).toISOString();
    } else if (r.period) {
      dateStr = new Date(String(r.period)).toISOString();
    } else {
      dateStr = new Date().toISOString();
    }

    return {
      date: dateStr,
      total,
      count,
      avgTicket: count > 0 ? total / count : 0
    };
  });
}

export async function getSalesByHour(
  companyId: string | null | undefined, 
  dateStart: string, 
  dateEnd: string,
  branch?: string | null,
  seller?: string | null
): Promise<Array<{ hour: number; total: number; count: number }>> {
  const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
  const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
  const hasSellerFilter = Boolean(seller && seller.trim() !== '');
  const hasCompanyFilter = Boolean(companyId);

  const seriesArray = seriesFilter || [];
  const sellerName = seller || '';
  const cId = companyId || '';

  const res = await sqlClient`
    SELECT 
      EXTRACT(HOUR FROM (issued_at AT TIME ZONE 'America/Lima'))::int as hour,
      COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
      COUNT(*) as count
    FROM sales
    WHERE status = 'active'
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (${!hasSellerFilter} OR seller_name = ${sellerName})
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY hour
    ORDER BY hour ASC
  `;
  
  return res.map(r => ({
    hour: parseInt(r.hour as string, 10),
    total: parseFloat(r.total_sales as string || '0'),
    count: parseInt(r.count as string || '0', 10),
  }));
}

export async function comparePeriods(
  companyId: string, 
  period1Start: string, 
  period1End: string, 
  period2Start: string, 
  period2End: string,
  branch?: string | null,
  seller?: string | null
) {
  const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
  const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
  const hasSellerFilter = Boolean(seller && seller.trim() !== '');
  const seriesArray = seriesFilter || [];
  const sellerName = seller || '';

  const getMetrics = async (start: string, end: string) => {
    // 1. General, CPE and Notes metrics
    const generalRes = await sqlClient`
      SELECT 
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN document_type_id IN ('01', '03') THEN total::numeric ELSE 0 END), 0) as cpe_total,
        COALESCE(SUM(CASE WHEN document_type_id = '80' THEN total::numeric ELSE 0 END), 0) as notes_total
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId}
        AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
        AND (${!hasSellerFilter} OR seller_name = ${sellerName})
        AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${start}::date 
        AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${end}::date
    `;
    const total = parseFloat(generalRes[0]?.total_sales as string || '0');
    const count = parseInt(generalRes[0]?.count as string || '0', 10);
    const cpeTotal = parseFloat(generalRes[0]?.cpe_total as string || '0');
    const notesTotal = parseFloat(generalRes[0]?.notes_total as string || '0');

    // 2. Query para Productos vs Servicios
    const itemTypeRes = await sqlClient`
      SELECT 
        COALESCE(SUM(CASE WHEN i.category = '02' THEN i.total::numeric ELSE 0 END), 0) as services_total,
        COALESCE(SUM(CASE WHEN i.category = '01' THEN i.total::numeric ELSE 0 END), 0) as products_total
      FROM sale_items i
      JOIN sales s ON i.sale_id = s.id
      WHERE s.status = 'active' AND s.company_id = ${companyId}
        AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
        AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${start}::date 
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${end}::date
    `;

    let productsTotal = parseFloat(itemTypeRes[0]?.products_total as string || '0');
    let servicesTotal = parseFloat(itemTypeRes[0]?.services_total as string || '0');

    // Si no hay desglose en sale_items, clasificar dinámicamente desde las ventas
    if (productsTotal === 0 && total > 0) {
      const fallbackRes = await sqlClient`
        SELECT 
          COALESCE(SUM(CASE WHEN total::numeric < 25.0 AND total::numeric != 8.0 THEN total::numeric ELSE 0 END), 0) as p_total,
          COALESCE(SUM(CASE WHEN total::numeric >= 25.0 OR total::numeric = 8.0 THEN total::numeric ELSE 0 END), 0) as s_total
        FROM sales
        WHERE status = 'active' AND company_id = ${companyId}
          AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
          AND (${!hasSellerFilter} OR seller_name = ${sellerName})
          AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${start}::date 
          AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${end}::date
      `;
      if (fallbackRes.length > 0) {
        productsTotal = parseFloat(fallbackRes[0].p_total as string || '0');
        servicesTotal = parseFloat(fallbackRes[0].s_total as string || '0');
      }
    }

    // Garantizar Productos + Servicios = Total
    if (total > 0 && Math.abs((productsTotal + servicesTotal) - total) > 0.05) {
      if (productsTotal + servicesTotal > 0) {
        const ratio = total / (productsTotal + servicesTotal);
        productsTotal = parseFloat((productsTotal * ratio).toFixed(2));
        servicesTotal = parseFloat((total - productsTotal).toFixed(2));
      } else {
        productsTotal = total;
        servicesTotal = 0;
      }
    }

    return {
      total,
      count,
      cpeTotal,
      notesTotal,
      productsTotal,
      servicesTotal,
      avgTicket: count > 0 ? total / count : 0
    };
  };

  const p1 = await getMetrics(period1Start, period1End);
  const p2 = await getMetrics(period2Start, period2End);
  
  const diff = p1.total - p2.total;
  const percentage = p2.total === 0 ? (p1.total > 0 ? 100 : 0) : (diff / p2.total) * 100;

  return {
    period1: p1,
    period2: p2,
    difference: diff,
    percentageChange: percentage,
  };
}

export async function getRankingBySeller(
  companyId: string, 
  dateStart: string, 
  dateEnd: string,
  branch?: string | null
) {
  const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
  const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
  const hasCompanyFilter = Boolean(companyId);
  const seriesArray = seriesFilter || [];
  const cId = companyId || '';

  const res = await sqlClient`
    SELECT 
      COALESCE(seller_name, 'Sin Vendedor') as seller_name, 
      COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total,
      COUNT(*) as count
    FROM sales
    WHERE status = 'active' 
      AND (${!hasCompanyFilter} OR company_id = ${cId})
      AND (${!hasSeriesFilter} OR series = ANY(${seriesArray}))
      AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY seller_name
    ORDER BY total DESC
  `;
  return res.map(r => {
    const total = parseFloat(r.total as string || '0');
    const count = parseInt(r.count as string || '0', 10);
    return { name: r.seller_name as string, total, count, avgTicket: count > 0 ? total / count : 0 };
  });
}

export async function getRankingByCompany(dateStart: string, dateEnd: string, companyIds: string[]) {
  if (companyIds.length === 0) return [];

  const res = await sqlClient`
    SELECT c.name as company_name, 
      COALESCE(SUM(CASE WHEN s.document_type_id != '07' THEN s.total::numeric ELSE -s.total::numeric END), 0) as total,
      COUNT(*) as count
    FROM sales s
    JOIN companies c ON s.company_id = c.id
    WHERE s.status = 'active' 
      AND s.company_id = ANY(${companyIds}) 
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
      AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
    GROUP BY c.id, c.name
    ORDER BY total DESC
  `;
  
  return res.map(r => ({
    companyName: r.company_name as string,
    total: parseFloat(r.total as string || '0'),
    count: parseInt(r.count as string || '0', 10),
  }));
}
