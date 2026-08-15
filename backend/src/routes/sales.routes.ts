import { Router } from 'express';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { getSalesTrend, getSalesByHour, getRankingBySeller, getRankingByCompany } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { db, sqlClient } from '../config/database.js';
import { sales, companies } from '../db/schema.js';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { decrypt } from '../services/crypto.service.js';
import { createBillingClient, fetchDocuments } from '../services/billing-api.service.js';
import axios from 'axios';
import https from 'https';

const router = Router();
router.use(authenticate);

const parseDateRange = (req: any) => {
  const companyId = req.user.companyId || (req.query.companyId as string);
  const dateStart = (req.query.dateStart as string) || new Date().toISOString().split('T')[0];
  const dateEnd = (req.query.dateEnd as string) || new Date().toISOString().split('T')[0];
  return { companyId, dateStart, dateEnd };
};

// Cached company config resolver
const getCompanyConfig = async (companyId: string) => {
  const cacheKey = `company_config_v2:${companyId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) throw new Error('Company not found');
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    const res = await client.get('/company');
    const data = {
      establishments: res.data?.establishments || [],
      series: res.data?.series || [],
      paymentMethods: res.data?.payment_method_types || []
    };
    
    await redis.setex(cacheKey, 600, JSON.stringify(data)); // 10 minutes cache
    return data;
  } catch (error: any) {
    console.error(`[Sales Route] Error loading company config:`, error.message);
    return { establishments: [], series: [], paymentMethods: [] };
  }
};

router.get('/metrics', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const data = await getDashboardMetrics(companyId, dateStart, dateEnd);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching metrics' });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const data = await getSalesTrend(companyId, dateStart, dateEnd, 'day');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching trends' });
  }
});

router.get('/by-hour', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const data = await getSalesByHour(companyId, dateStart, dateEnd);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching hourly data' });
  }
});

router.get('/by-payment-detailed', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const result = await sqlClient`
      SELECT 
        p.payment_method_id as "paymentMethodId",
        COALESCE(s.seller_name, 'Sin Vendedor') as "seller",
        s.series as "series",
        COUNT(DISTINCT s.id)::int as "count",
        SUM(p.amount::numeric)::numeric as "amount"
      FROM sale_payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.company_id = ${companyId} AND s.status = 'active'
        AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
      GROUP BY p.payment_method_id, s.seller_name, s.series
      ORDER BY amount DESC
    `;

    // Map series to Sede description dynamically
    const config = await getCompanyConfig(companyId);
    const getSedeName = (seriesName: string): string => {
      const seriesObj = config.series.find((s: any) => s.number === seriesName);
      if (seriesObj) {
        const estObj = config.establishments.find((e: any) => e.id === seriesObj.establishment_id);
        if (estObj && estObj.description) {
          return estObj.description;
        }
      }
      return 'Sede Principal';
    };

    const mappedResult = result.map(r => {
      const configMethod = config.paymentMethods.find((m: any) => m.id === r.paymentMethodId);
      const defaultDescriptions: Record<string, string> = {
        '01': 'Efectivo',
        '02': 'Yape',
        '03': 'Tarjeta de débito',
        '04': 'Transferencia',
        '06': 'Tarjeta crédito visa',
        '10': 'Contado'
      };
      const methodName = configMethod?.description || defaultDescriptions[r.paymentMethodId] || `Método ${r.paymentMethodId}`;

      return {
        paymentMethodId: r.paymentMethodId,
        paymentMethodName: methodName,
        seller: r.seller,
        branch: getSedeName(r.series),
        count: r.count,
        amount: parseFloat(r.amount || 0)
      };
    });

    res.json(mappedResult);
  } catch (err: any) {
    console.error('Error fetching detailed payment metrics:', err.message);
    res.status(500).json({ message: 'Error fetching detailed payment metrics' });
  }
});

router.get('/by-seller', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const data = await getRankingBySeller(companyId, dateStart, dateEnd);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching seller ranking' });
  }
});

router.get('/pivot', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const branch = req.query.branch as string; // establishment_id (e.g. "1")
    const seller = req.query.seller as string;
    
    const config = await getCompanyConfig(companyId);
    
    let conditions = and(
      eq(sales.companyId, companyId),
      eq(sales.status, 'active'),
      gte(sales.issuedAt, new Date(dateStart)),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999Z'))
    );
    
    if (branch) {
      // Find all series numbers belonging to this establishment
      const branchId = parseInt(branch, 10);
      const matchedSeries = config.series
        .filter((s: any) => s.establishment_id === branchId)
        .map((s: any) => s.number);
      
      if (matchedSeries.length > 0) {
        conditions = and(conditions, inArray(sales.series, matchedSeries));
      } else {
        // If no series match, return empty to avoid leaking other branches
        return res.json({
          paymentMethods: config.paymentMethods.map((m: any) => ({ id: m.id, description: m.description })),
          pivotData: []
        });
      }
    }
    
    if (seller) {
      conditions = and(conditions, eq(sales.sellerName, seller));
    }

    const salesList = await db.query.sales.findMany({
      where: conditions,
      with: {
        payments: true
      }
    });

    // Helper to map series name to Sede description
    const getSedeName = (seriesName: string): string => {
      const seriesObj = config.series.find((s: any) => s.number === seriesName);
      if (seriesObj) {
        const estObj = config.establishments.find((e: any) => e.id === seriesObj.establishment_id);
        if (estObj && estObj.description) {
          return estObj.description;
        }
      }
      return 'Sede Principal';
    };

    // Pre-populate active payment methods list for response
    const activePaymentMethods = config.paymentMethods.map((m: any) => ({
      id: m.id,
      description: m.description
    }));

    const pivotMap: Record<string, {
      sede: string;
      payments: Record<string, number>;
      vendedores: Record<string, {
        vendedor: string;
        payments: Record<string, number>;
        total: number;
      }>;
      total: number;
    }> = {};

    for (const sale of salesList) {
      let seriesName = sale.series;
      if (!seriesName && sale.number && sale.number.includes('-')) {
        seriesName = sale.number.split('-')[0];
      }
      
      const Sede = getSedeName(seriesName);
      const sellerName = sale.sellerName || 'Sin Vendedor';

      if (!pivotMap[Sede]) {
        pivotMap[Sede] = {
          sede: Sede,
          payments: {},
          vendedores: {},
          total: 0
        };
        // Initialize payments record
        activePaymentMethods.forEach((m: any) => {
          pivotMap[Sede].payments[m.id] = 0;
        });
      }

      if (!pivotMap[Sede].vendedores[sellerName]) {
        pivotMap[Sede].vendedores[sellerName] = {
          vendedor: sellerName,
          payments: {},
          total: 0
        };
        // Initialize payments record
        activePaymentMethods.forEach((m: any) => {
          pivotMap[Sede].vendedores[sellerName].payments[m.id] = 0;
        });
      }

      const saleTotal = parseFloat(sale.total);

      if (sale.payments && sale.payments.length > 0) {
        for (const payment of sale.payments) {
          const amount = parseFloat(payment.amount);
          const method = payment.paymentMethodId;

          // Ensure the payment method ID exists in the map
          if (pivotMap[Sede].payments[method] === undefined) {
            pivotMap[Sede].payments[method] = 0;
          }
          if (pivotMap[Sede].vendedores[sellerName].payments[method] === undefined) {
            pivotMap[Sede].vendedores[sellerName].payments[method] = 0;
          }

          pivotMap[Sede].payments[method] += amount;
          pivotMap[Sede].total += amount;

          pivotMap[Sede].vendedores[sellerName].payments[method] += amount;
          pivotMap[Sede].vendedores[sellerName].total += amount;
        }
      } else {
        // Fallback: If no payments recorded in db, put the whole total as Cash ("01")
        const defaultMethod = '01';
        if (pivotMap[Sede].payments[defaultMethod] === undefined) {
          pivotMap[Sede].payments[defaultMethod] = 0;
        }
        if (pivotMap[Sede].vendedores[sellerName].payments[defaultMethod] === undefined) {
          pivotMap[Sede].vendedores[sellerName].payments[defaultMethod] = 0;
        }

        pivotMap[Sede].payments[defaultMethod] += saleTotal;
        pivotMap[Sede].total += saleTotal;

        pivotMap[Sede].vendedores[sellerName].payments[defaultMethod] += saleTotal;
        pivotMap[Sede].vendedores[sellerName].total += saleTotal;
      }
    }

    const pivotData = Object.values(pivotMap).map(Sede => ({
      ...Sede,
      vendedores: Object.values(Sede.vendedores).sort((a, b) => b.total - a.total)
    })).sort((a, b) => b.total - a.total);

    res.json({
      paymentMethods: activePaymentMethods,
      pivotData
    });
  } catch (err: any) {
    console.error('Error fetching sales pivot metrics:', err.message);
    res.status(500).json({ message: 'Error fetching sales pivot metrics' });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const branch = req.query.branch as string; // establishment_id (e.g. "1")
    const seller = req.query.seller as string;
    
    const config = await getCompanyConfig(companyId);
    
    let conditions = and(
      eq(sales.companyId, companyId),
      gte(sales.issuedAt, new Date(dateStart)),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999Z'))
    );
    
    if (branch) {
      const branchId = parseInt(branch, 10);
      const matchedSeries = config.series
        .filter((s: any) => s.establishment_id === branchId)
        .map((s: any) => s.number);
      
      if (matchedSeries.length > 0) {
        conditions = and(conditions, inArray(sales.series, matchedSeries));
      } else {
        return res.json([]);
      }
    }
    if (seller) {
      conditions = and(conditions, eq(sales.sellerName, seller));
    }
    
    const result = await db.query.sales.findMany({
      where: conditions,
      limit,
      offset,
      orderBy: (sales, { desc }) => [desc(sales.issuedAt)]
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching documents' });
  }
});

router.get('/documents/:id', async (req, res) => {
  try {
    const result = await db.query.sales.findFirst({
      where: eq(sales.id, req.params.id),
      with: {
        items: true,
        payments: true
      }
    });
    
    if (!result) return res.status(404).json({ message: 'Document not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching document details' });
  }
});

router.get('/debug-categories', async (req, res) => {
  try {
    const categories = await sqlClient`
      SELECT category, count(*)::int as count, sum(total::numeric) as total
      FROM sale_items
      GROUP BY category
    `;
    const sampleItems = await sqlClient`
      SELECT description, quantity, total, category
      FROM sale_items
      LIMIT 30
    `;
    res.json({ categories, sampleItems });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/debug-sync-one', async (req: any, res) => {
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, req.user.companyId)
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    const decryptedToken = decrypt(company.apiTokenEncrypted, company.apiTokenIv, company.apiTokenTag);
    const client = createBillingClient(company.subdomain, decryptedToken);
    
    const docs = await fetchDocuments(client, '2026-08-01', '2026-08-15');
    if (docs.length === 0) return res.json({ message: 'No documents found' });
    
    const doc = docs[0];
    const xmlUrl = doc.download_xml;
    
    let xmlContent = '';
    let errorMsg = '';
    let success = false;
    
    if (xmlUrl) {
      try {
        const xmlRes = await axios.get(xmlUrl, {
          responseType: 'text',
          timeout: 5000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        xmlContent = xmlRes.data.substring(0, 200);
        success = true;
      } catch (err: any) {
        errorMsg = err.message + ' ' + (err.response?.data || '');
      }
    }
    
    res.json({
      number: doc.number,
      xmlUrl,
      success,
      errorMsg,
      xmlContent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

router.get('/debug-db', async (req, res) => {
  try {
    const paymentsCount = await sqlClient`SELECT COUNT(*)::int as count FROM sale_payments`;
    const distinctPayments = await sqlClient`SELECT payment_method_id as "methodId", COUNT(*)::int as count FROM sale_payments GROUP BY payment_method_id`;
    const salesCount = await sqlClient`SELECT COUNT(*)::int as count FROM sales`;
    const samplePayments = await sqlClient`SELECT * FROM sale_payments LIMIT 5`;
    
    // We can also search if there are any payments inside raw_json fields
    const rawPaymentsSearch = await sqlClient`
      SELECT id, number, raw_json->'payments' as "paymentsJson", raw_json->'payment_method_type' as "methodType"
      FROM sales 
      LIMIT 10
    `;

    res.json({
      paymentsCount: paymentsCount[0].count,
      distinctPayments,
      salesCount: salesCount[0].count,
      samplePayments,
      rawPaymentsSearch
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
