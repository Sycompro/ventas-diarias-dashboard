import { sqlClient } from '../config/database.js';

export interface TrendPoint {
  date: string;
  total: number;
  count: number;
  avgTicket: number;
}

export async function getSalesTrend(companyId: string, dateStart: string, dateEnd: string, granularity: 'hour'|'day'|'week'|'month'): Promise<TrendPoint[]> {
  let res;
  if (granularity === 'hour') {
    res = await sqlClient`
      SELECT 
        date_trunc('hour', issued_at) as period,
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      GROUP BY period
      ORDER BY period ASC
    `;
  } else if (granularity === 'week') {
    res = await sqlClient`
      SELECT 
        date_trunc('week', issued_at) as period,
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      GROUP BY period
      ORDER BY period ASC
    `;
  } else if (granularity === 'month') {
    res = await sqlClient`
      SELECT 
        date_trunc('month', issued_at) as period,
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      GROUP BY period
      ORDER BY period ASC
    `;
  } else {
    res = await sqlClient`
      SELECT 
        date_trunc('day', issued_at) as period,
        COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
        COUNT(*) as count
      FROM sales
      WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      GROUP BY period
      ORDER BY period ASC
    `;
  }

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

export async function getSalesByHour(companyId: string | null | undefined, dateStart: string, dateEnd: string): Promise<Array<{ hour: number; total: number; count: number }>> {
  const res = companyId
    ? await sqlClient`
        SELECT 
          EXTRACT(HOUR FROM issued_at)::int as hour,
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
          COUNT(*) as count
        FROM sales
        WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
        GROUP BY hour
        ORDER BY hour ASC
      `
    : await sqlClient`
        SELECT 
          EXTRACT(HOUR FROM issued_at)::int as hour,
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
          COUNT(*) as count
        FROM sales
        WHERE status = 'active' AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
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
      WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${start}::date AND issued_at::date <= ${end}::date
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

export async function getRankingBySeller(companyId: string, dateStart: string, dateEnd: string) {
  const res = await sqlClient`
    SELECT seller_name, 
      COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total,
      COUNT(*) as count
    FROM sales
    WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
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
    WHERE s.status = 'active' AND s.company_id = ANY(${companyIds}) AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
    GROUP BY c.id, c.name
    ORDER BY total DESC
  `;
  
  return res.map(r => ({
    companyName: r.company_name as string,
    total: parseFloat(r.total as string || '0'),
    count: parseInt(r.count as string || '0', 10),
  }));
}
