import { db, sqlClient } from '../config/database.js';
import { redis } from '../config/redis.js';

export interface DashboardMetrics {
  totalSales: number;
  documentsCount: number;
  averageTicket: number;
  byDocumentType: { facturas: number; boletas: number; notasCredito: number };
  byPaymentMethod: Record<string, number>;
  topProducts: Array<{ description: string; quantity: number; total: number; category: string }>;
  salesBySeller: Array<{ name: string; total: number; count: number; avgTicket: number }>;
}

export async function getDashboardMetrics(companyId: string | null, dateStart: string, dateEnd: string): Promise<DashboardMetrics> {
  const cacheKey = `metrics:${companyId || 'all'}:${dateStart}:${dateEnd}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query principal de ventas
  const salesRes = companyId
    ? await sqlClient`
        SELECT 
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
          COUNT(*) as count,
          COALESCE(SUM(CASE WHEN document_type_id = '01' THEN total::numeric ELSE 0 END), 0) as facturas,
          COALESCE(SUM(CASE WHEN document_type_id = '03' THEN total::numeric ELSE 0 END), 0) as boletas,
          COALESCE(SUM(CASE WHEN document_type_id = '07' THEN total::numeric ELSE 0 END), 0) as notas_credito
        FROM sales 
        WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `
    : await sqlClient`
        SELECT 
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total_sales,
          COUNT(*) as count,
          COALESCE(SUM(CASE WHEN document_type_id = '01' THEN total::numeric ELSE 0 END), 0) as facturas,
          COALESCE(SUM(CASE WHEN document_type_id = '03' THEN total::numeric ELSE 0 END), 0) as boletas,
          COALESCE(SUM(CASE WHEN document_type_id = '07' THEN total::numeric ELSE 0 END), 0) as notas_credito
        FROM sales 
        WHERE status = 'active' AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `;

  const row = salesRes[0];
  const totalSales = parseFloat(row.total_sales as string || '0');
  const documentsCount = parseInt(row.count as string || '0', 10);

  // Métodos de pago
  const paymentsRes = companyId
    ? await sqlClient`
        SELECT p.payment_method_id, COALESCE(SUM(p.amount::numeric), 0) as total
        FROM sale_payments p
        JOIN sales s ON p.sale_id = s.id
        WHERE s.status = 'active' AND s.company_id = ${companyId} AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
        GROUP BY p.payment_method_id
      `
    : await sqlClient`
        SELECT p.payment_method_id, COALESCE(SUM(p.amount::numeric), 0) as total
        FROM sale_payments p
        JOIN sales s ON p.sale_id = s.id
        WHERE s.status = 'active' AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
        GROUP BY p.payment_method_id
      `;

  const byPaymentMethod: Record<string, number> = {};
  paymentsRes.forEach(r => {
    byPaymentMethod[r.payment_method_id as string] = parseFloat(r.total as string);
  });

  // Top productos
  const productsRes = companyId
    ? await sqlClient`
        SELECT i.description, SUM(i.quantity::numeric) as quantity, SUM(i.total::numeric) as total, COALESCE(i.category, 'GENERAL') as category
        FROM sale_items i
        JOIN sales s ON i.sale_id = s.id
        WHERE s.status = 'active' AND s.company_id = ${companyId} AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
        GROUP BY i.description, i.category
        ORDER BY total DESC
        LIMIT 10
      `
    : await sqlClient`
        SELECT i.description, SUM(i.quantity::numeric) as quantity, SUM(i.total::numeric) as total, COALESCE(i.category, 'GENERAL') as category
        FROM sale_items i
        JOIN sales s ON i.sale_id = s.id
        WHERE s.status = 'active' AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
        GROUP BY i.description, i.category
        ORDER BY total DESC
        LIMIT 10
      `;

  // Ventas por vendedor
  const sellersRes = companyId
    ? await sqlClient`
        SELECT seller_name, 
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total,
          COUNT(*) as count
        FROM sales
        WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
        GROUP BY seller_name
        ORDER BY total DESC
      `
    : await sqlClient`
        SELECT seller_name, 
          COALESCE(SUM(CASE WHEN document_type_id != '07' THEN total::numeric ELSE -total::numeric END), 0) as total,
          COUNT(*) as count
        FROM sales
        WHERE status = 'active' AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
        GROUP BY seller_name
        ORDER BY total DESC
      `;

  const result: DashboardMetrics = {
    totalSales,
    documentsCount,
    averageTicket: documentsCount > 0 ? totalSales / documentsCount : 0,
    byDocumentType: {
      facturas: parseFloat(row.facturas as string || '0'),
      boletas: parseFloat(row.boletas as string || '0'),
      notasCredito: parseFloat(row.notas_credito as string || '0'),
    },
    byPaymentMethod,
    topProducts: productsRes.map(r => ({
      description: r.description as string,
      quantity: parseFloat(r.quantity as string),
      total: parseFloat(r.total as string),
      category: r.category as string,
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

  await redis.setex(cacheKey, 180, JSON.stringify(result));
  return result;
}
