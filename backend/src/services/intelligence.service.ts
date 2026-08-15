import { sqlClient } from '../config/database.js';

export interface Anomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Insight {
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  data?: Record<string, unknown>;
}

export interface HealthStatus {
  sales: 'healthy' | 'attention' | 'critical';
  goals: 'healthy' | 'attention' | 'critical';
  trends: 'healthy' | 'attention' | 'critical';
  overall: 'healthy' | 'attention' | 'critical';
}

export async function detectAnomalies(companyId: string): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Comparar ventas de hoy vs promedio de las últimas 4 semanas
  const todayRes = await sqlClient`
    SELECT COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as today_sales
    FROM sales 
    WHERE company_id = ${companyId} AND status = 'active' AND issued_at::date = CURRENT_DATE
  `;

  const avgRes = await sqlClient`
    SELECT 
      COALESCE(AVG(daily_total), 0) as avg_sales,
      COALESCE(STDDEV(daily_total), 0) as stddev_sales
    FROM (
      SELECT issued_at::date as day, 
        SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END) as daily_total
      FROM sales 
      WHERE company_id = ${companyId} AND status = 'active' 
        AND issued_at::date >= CURRENT_DATE - 28 AND issued_at::date < CURRENT_DATE
      GROUP BY day
    ) daily
  `;

  const todaySales = parseFloat(todayRes[0]?.today_sales as string || '0');
  const avgSales = parseFloat(avgRes[0]?.avg_sales as string || '0');
  const stddevSales = parseFloat(avgRes[0]?.stddev_sales as string || '0');

  if (avgSales > 0 && stddevSales > 0) {
    const lowerBound = avgSales - 1.5 * stddevSales;
    if (todaySales < lowerBound && todaySales < avgSales * 0.7) {
      const dropPercent = ((avgSales - todaySales) / avgSales * 100).toFixed(1);
      anomalies.push({
        type: 'sales_drop',
        description: `Las ventas de hoy (S/. ${todaySales.toFixed(2)}) están ${dropPercent}% por debajo del promedio diario (S/. ${avgSales.toFixed(2)}).`,
        severity: todaySales < avgSales * 0.5 ? 'high' : 'medium',
      });
    }
  }

  if (todaySales === 0) {
    anomalies.push({
      type: 'no_sales',
      description: 'No se han registrado ventas hoy. Verificar operaciones.',
      severity: 'high',
    });
  }

  // Verificar incremento inusual de notas de crédito
  const ncRes = await sqlClient`
    SELECT COUNT(*) as nc_count
    FROM sales
    WHERE company_id = ${companyId} AND document_type_id = '07' AND issued_at::date = CURRENT_DATE
  `;
  const ncCount = parseInt(ncRes[0]?.nc_count as string || '0', 10);
  if (ncCount >= 5) {
    anomalies.push({
      type: 'high_credit_notes',
      description: `Se han emitido ${ncCount} notas de crédito hoy, lo cual es inusualmente alto.`,
      severity: ncCount >= 10 ? 'high' : 'medium',
    });
  }

  return anomalies;
}

export async function generateInsights(companyId: string, date: string): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Mejor vendedor del día
  const bestSellerRes = await sqlClient`
    SELECT seller_name, SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END) as total
    FROM sales 
    WHERE company_id = ${companyId} AND status = 'active' AND issued_at::date = ${date}::date
    GROUP BY seller_name ORDER BY total DESC LIMIT 1
  `;
  if (bestSellerRes.length > 0 && bestSellerRes[0].seller_name) {
    insights.push({
      title: 'Mejor vendedor del día',
      description: `${bestSellerRes[0].seller_name} lidera las ventas con S/. ${parseFloat(bestSellerRes[0].total as string).toFixed(2)}.`,
      type: 'positive',
      data: { sellerName: bestSellerRes[0].seller_name, total: parseFloat(bestSellerRes[0].total as string) },
    });
  }

  // Hora más productiva
  const bestHourRes = await sqlClient`
    SELECT EXTRACT(HOUR FROM issued_at)::int as hour, SUM(total::numeric) as total
    FROM sales 
    WHERE company_id = ${companyId} AND status = 'active' AND issued_at::date = ${date}::date
    GROUP BY hour ORDER BY total DESC LIMIT 1
  `;
  if (bestHourRes.length > 0) {
    const hour = parseInt(bestHourRes[0].hour as string, 10);
    insights.push({
      title: 'Hora más productiva',
      description: `El horario de ${hour}:00 a ${hour + 1}:00 registró las mayores ventas del día.`,
      type: 'positive',
      data: { hour, total: parseFloat(bestHourRes[0].total as string) },
    });
  }

  // Método de pago predominante
  const bestPaymentRes = await sqlClient`
    SELECT p.payment_method_id, SUM(p.amount::numeric) as total
    FROM sale_payments p
    JOIN sales s ON p.sale_id = s.id
    WHERE s.company_id = ${companyId} AND s.status = 'active' AND s.issued_at::date = ${date}::date
    GROUP BY p.payment_method_id ORDER BY total DESC LIMIT 1
  `;
  if (bestPaymentRes.length > 0) {
    const methodNames: Record<string, string> = { '01': 'Efectivo', '02': 'Tarjeta', '03': 'Transferencia', '05': 'Yape/Plin' };
    const methodId = bestPaymentRes[0].payment_method_id as string;
    insights.push({
      title: 'Método de pago predominante',
      description: `${methodNames[methodId] || 'Otro'} es el método de pago más utilizado hoy.`,
      type: 'neutral',
      data: { paymentMethodId: methodId, total: parseFloat(bestPaymentRes[0].total as string) },
    });
  }

  return insights;
}

export async function getHealthStatus(companyId: string): Promise<HealthStatus> {
  // Ventas de hoy vs promedio
  const todayRes = await sqlClient`
    SELECT COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total
    FROM sales WHERE company_id = ${companyId} AND status = 'active' AND issued_at::date = CURRENT_DATE
  `;
  const avgRes = await sqlClient`
    SELECT COALESCE(AVG(daily_total), 0) as avg_sales
    FROM (
      SELECT issued_at::date as day, SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END) as daily_total
      FROM sales WHERE company_id = ${companyId} AND status = 'active' AND issued_at::date >= CURRENT_DATE - 14 AND issued_at::date < CURRENT_DATE
      GROUP BY day
    ) d
  `;

  const todaySales = parseFloat(todayRes[0]?.total as string || '0');
  const avgSales = parseFloat(avgRes[0]?.avg_sales as string || '0');

  let salesStatus: 'healthy' | 'attention' | 'critical' = 'healthy';
  if (avgSales > 0) {
    const ratio = todaySales / avgSales;
    if (ratio < 0.5) salesStatus = 'critical';
    else if (ratio < 0.8) salesStatus = 'attention';
  }

  // Determinar estado general
  const overall = salesStatus === 'critical' ? 'critical' : salesStatus === 'attention' ? 'attention' : 'healthy';

  return {
    sales: salesStatus,
    goals: 'healthy', // Se calculará con datos de metas reales
    trends: salesStatus,
    overall,
  };
}
