import { db, sqlClient } from '../config/database.js';
import { redis } from '../config/redis.js';
import { eq } from 'drizzle-orm';
import { companies } from '../db/schema.js';
import { decrypt } from './crypto.service.js';
import { createBillingClient } from './billing-api.service.js';

export interface DashboardMetrics {
  totalSales: number;
  documentsCount: number;
  averageTicket: number;
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
          COALESCE(SUM(CASE WHEN document_type_id = '07' THEN -total::numeric ELSE total::numeric END), 0) as total_sales,
          COUNT(*) as count,
          COALESCE(SUM(CASE WHEN document_type_id = '01' THEN total::numeric ELSE 0 END), 0) as facturas_amount,
          COUNT(CASE WHEN document_type_id = '01' THEN 1 END) as facturas_count,
          COALESCE(SUM(CASE WHEN document_type_id = '03' THEN total::numeric ELSE 0 END), 0) as boletas_amount,
          COUNT(CASE WHEN document_type_id = '03' THEN 1 END) as boletas_count,
          COALESCE(SUM(CASE WHEN document_type_id = '07' THEN total::numeric ELSE 0 END), 0) as notas_credito_amount,
          COUNT(CASE WHEN document_type_id = '07' THEN 1 END) as notas_credito_count,
          COALESCE(SUM(CASE WHEN document_type_id = '80' THEN total::numeric ELSE 0 END), 0) as notas_venta_amount,
          COUNT(CASE WHEN document_type_id = '80' THEN 1 END) as notas_venta_count
        FROM sales 
        WHERE status = 'active' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `
    : await sqlClient`
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
          COUNT(CASE WHEN document_type_id = '80' THEN 1 END) as notas_venta_count
        FROM sales 
        WHERE status = 'active' AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `;

  const row = salesRes[0];
  const totalSales = parseFloat(row.total_sales as string || '0');
  const documentsCount = parseInt(row.count as string || '0', 10);

  // Query para documentos anulados
  const voidedRes = companyId
    ? await sqlClient`
        SELECT COALESCE(SUM(total::numeric), 0) as amount, COUNT(*)::int as count
        FROM sales
        WHERE status = 'voided' AND company_id = ${companyId} AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `
    : await sqlClient`
        SELECT COALESCE(SUM(total::numeric), 0) as amount, COUNT(*)::int as count
        FROM sales
        WHERE status = 'voided' AND issued_at::date >= ${dateStart}::date AND issued_at::date <= ${dateEnd}::date
      `;
  const voidedRow = voidedRes[0];
  const voidedAmount = parseFloat(voidedRow.amount as string || '0');
  const voidedCount = parseInt(voidedRow.count as string || '0', 10);

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

  // Get active payment methods from facturador config
  let configMethods: any[] = [];
  if (companyId) {
    try {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
      });
      if (company) {
        const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
        const client = createBillingClient(company.subdomain, decryptedToken);
        const res = await client.get('/company');
        configMethods = res.data?.payment_method_types || [];
      }
    } catch (e: any) {
      console.warn(`[Metrics Service] Warning: Could not fetch company config for descriptions:`, e.message);
    }
  }

  const byPaymentMethod: Record<string, { amount: number, description: string }> = {};

  // Pre-fill with all config methods as 0 to ensure they are listed on the donut chart
  configMethods.forEach((m: any) => {
    byPaymentMethod[m.id] = { amount: 0, description: m.description };
  });

  paymentsRes.forEach(r => {
    const methodId = r.payment_method_id as string;
    const amount = parseFloat(r.total as string);
    const configMethod = configMethods.find((m: any) => m.id === methodId);
    
    // Nice description fallbacks
    const defaultDescriptions: Record<string, string> = {
      '01': 'Efectivo',
      '02': 'Yape',
      '03': 'Tarjeta de débito',
      '04': 'Transferencia',
      '06': 'Tarjeta crédito visa',
      '10': 'Contado'
    };
    const description = configMethod?.description || defaultDescriptions[methodId] || `Método ${methodId}`;

    byPaymentMethod[methodId] = {
      amount,
      description
    };
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

  // Query para Productos vs Servicios
  const itemTypeRes = companyId
    ? await sqlClient`
        SELECT 
          COALESCE(SUM(CASE WHEN i.category = '02' THEN i.total::numeric ELSE 0 END), 0) as services_total,
          COALESCE(SUM(CASE WHEN i.category != '02' THEN i.total::numeric ELSE 0 END), 0) as products_total
        FROM sale_items i
        JOIN sales s ON i.sale_id = s.id
        WHERE s.status = 'active' AND s.company_id = ${companyId} AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
      `
    : await sqlClient`
        SELECT 
          COALESCE(SUM(CASE WHEN i.category = '02' THEN i.total::numeric ELSE 0 END), 0) as services_total,
          COALESCE(SUM(CASE WHEN i.category != '02' THEN i.total::numeric ELSE 0 END), 0) as products_total
        FROM sale_items i
        JOIN sales s ON i.sale_id = s.id
        WHERE s.status = 'active' AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
      `;

  const itemTypeRow = itemTypeRes[0];
  const productsTotal = parseFloat(itemTypeRow.products_total as string || '0');
  const servicesTotal = parseFloat(itemTypeRow.services_total as string || '0');

  const result: DashboardMetrics = {
    totalSales,
    documentsCount,
    averageTicket: documentsCount > 0 ? totalSales / documentsCount : 0,
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
