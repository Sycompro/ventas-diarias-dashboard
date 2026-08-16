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

export async function comparePeriods(companyId: string, period1Start: string, period1End: string, period2Start: string, period2End: string) {
  const getMetrics = async (start: string, end: string) => {
    const res = await sqlClient`
      SELECT 
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId} 
        AND (issued_at AT TIME ZONE 'America/Lima')::date >= ${start}::date 
        AND (issued_at AT TIME ZONE 'America/Lima')::date <= ${end}::date
    `;
    return {
      total: parseFloat(res[0]?.total_sales as string || '0'),
      count: parseInt(res[0]?.count as string || '0', 10),
    };
  };

  const p1 = await getMetrics(period1Start, period1End);
  const p2 = await getMetrics(period2Start, period2End);
  const diff = p1.total - p2.total;
  const percentage = p2.total === 0 ? (p1.total > 0 ? 100 : 0) : (diff / p2.total) * 100;

  return {
    period1: { ...p1, avgTicket: p1.count > 0 ? p1.total / p1.count : 0 },
    period2: { ...p2, avgTicket: p2.count > 0 ? p2.total / p2.count : 0 },
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
