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
import { syncCompany } from '../services/sync.service.js';
import { 
  getCompanyBillingConfig, 
  getCompanyBranches, 
  resolveBranchSeries, 
  getBranchNameForSeries 
} from '../services/branch-resolver.service.js';
import axios from 'axios';
import https from 'https';

const router = Router();
router.use(authenticate);

const parseDateRange = (req: any) => {
  let companyId = req.user.companyId;
  if ((req.user.role === 'admin' || req.user.role === 'superadmin') && req.query.companyId) {
    companyId = req.query.companyId as string;
  }
  const dateStart = (req.query.dateStart as string) || new Date().toISOString().split('T')[0];
  const dateEnd = (req.query.dateEnd as string) || new Date().toISOString().split('T')[0];
  return { companyId, dateStart, dateEnd };
};

const syncInProgress: Record<string, Promise<any>> = {};

let initialDedupDone = false;
async function ensureDeduplicated() {
  if (initialDedupDone) return;
  try {
    await sqlClient`
      DELETE FROM sales a USING sales b
      WHERE a.id < b.id 
        AND a.company_id = b.company_id 
        AND a.document_type_id = b.document_type_id 
        AND a.series = b.series 
        AND a.number = b.number;
    `;

    await sqlClient`
      UPDATE sale_items si
      SET total = (s.total::numeric / sub.cnt)::numeric(12,2),
          unit_price = (s.total::numeric / sub.cnt / GREATEST(si.quantity::numeric, 1))::numeric(12,2)
      FROM sales s
      JOIN (
        SELECT sale_id, COUNT(*) as cnt, SUM(total::numeric) as sum_total
        FROM sale_items
        GROUP BY sale_id
        HAVING COUNT(*) > 1
      ) sub ON sub.sale_id = s.id
      WHERE si.sale_id = s.id AND sub.sum_total > s.total::numeric + 0.05;
    `;
    await sqlClient`CREATE INDEX IF NOT EXISTS idx_sales_perf ON sales (company_id, status, issued_at)`;
    await sqlClient`CREATE INDEX IF NOT EXISTS idx_sales_series ON sales (company_id, series)`;
    await sqlClient`CREATE INDEX IF NOT EXISTS idx_sale_payments_perf ON sale_payments (sale_id, payment_method_id)`;
    await sqlClient`CREATE INDEX IF NOT EXISTS idx_sale_items_perf ON sale_items (sale_id, category)`;
    initialDedupDone = true;
  } catch (e: any) {
    console.warn('[Dedup] Warning during initial sales deduplication:', e.message);
  }
}

/**
 * Sincroniza en segundo plano de forma 100% no bloqueante.
 * La respuesta HTTP se devuelve de inmediato desde la base de datos (<10ms).
 */
async function ensureDateRangeSynced(companyId?: string, dateStart?: string, dateEnd?: string) {
  if (!companyId || !dateStart || !dateEnd) return;
  
  void ensureDeduplicated();

  const cacheKey = `sync_range:${companyId}:${dateStart}:${dateEnd}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return;
  } catch {}

  const memKey = `${companyId}:${dateStart}:${dateEnd}`;
  if (memKey in syncInProgress) {
    return;
  }

  const syncPromise = (async () => {
    try {
      await syncCompany(companyId, 0, dateStart, dateEnd);
      const isCurrentDay = dateEnd >= new Date().toISOString().split('T')[0];
      const ttl = isCurrentDay ? 30 : 180;
      try {
        await redis.setex(cacheKey, ttl, '1');
      } catch {}
    } catch (err: any) {
      console.warn(`[Auto-Sync] Error durante sincronización en background:`, err.message);
    } finally {
      delete syncInProgress[memKey];
    }
  })();

  syncInProgress[memKey] = syncPromise;
}

router.get('/metrics', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    const data = await getDashboardMetrics(companyId, dateStart, dateEnd, branch, seller);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching metrics:', err.message);
    res.status(500).json({ message: 'Error fetching metrics' });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    const granularity = (req.query.granularity as any) || 'day';
    const data = await getSalesTrend(companyId, dateStart, dateEnd, granularity, branch, seller);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching trends:', err.message);
    res.status(500).json({ message: 'Error fetching trends' });
  }
});

router.get('/by-hour', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    const data = await getSalesByHour(companyId, dateStart, dateEnd, branch, seller);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching hourly data:', err.message);
    res.status(500).json({ message: 'Error fetching hourly data' });
  }
});

router.get('/by-payment-detailed', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;

    const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
    const hasSeriesFilter = seriesFilter !== null && seriesFilter.length > 0;
    const hasSellerFilter = Boolean(seller && seller.trim() !== '');
    const hasCompanyFilter = Boolean(companyId);

    const seriesArray = seriesFilter || [];
    const sellerName = seller || '';
    const cId = companyId || '';

    const result = await sqlClient`
      SELECT 
        p.payment_method_id as "paymentMethodId",
        COALESCE(s.seller_name, 'Sin Vendedor') as "seller",
        s.series as "series",
        COUNT(DISTINCT s.id)::int as "count",
        SUM(p.amount::numeric)::numeric as "amount"
      FROM sale_payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.status = 'active'
        AND (${!hasCompanyFilter} OR s.company_id = ${cId})
        AND (${!hasSeriesFilter} OR s.series = ANY(${seriesArray}))
        AND (${!hasSellerFilter} OR s.seller_name = ${sellerName})
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date >= ${dateStart}::date 
        AND (s.issued_at AT TIME ZONE 'America/Lima')::date <= ${dateEnd}::date
      GROUP BY p.payment_method_id, s.seller_name, s.series
      ORDER BY amount DESC
    `;

    // Mapear series a nombres de Sede reales
    const branches = companyId ? await getCompanyBranches(companyId) : [];
    const config = companyId ? await getCompanyBillingConfig(companyId) : { paymentMethods: [] };

    const defaultDescriptions: Record<string, string> = {
      '01': 'Efectivo',
      '02': 'Yape',
      '03': 'Tarjeta de débito',
      '04': 'Transferencia',
      '06': 'Tarjeta crédito visa',
      '10': 'Contado',
      '99': 'Crédito'
    };

    const mappedResult = result.map(r => {
      const configMethod = config.paymentMethods?.find((m: any) => m.id === r.paymentMethodId);
      const methodName = configMethod?.description || defaultDescriptions[r.paymentMethodId] || `Método ${r.paymentMethodId}`;

      const branchName = getBranchNameForSeries(r.series, branches);
      return {
        paymentMethodId: r.paymentMethodId,
        paymentMethodName: methodName,
        method: methodName,
        seller: r.seller,
        branch: branchName,
        company: branchName,
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
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const data = await getRankingBySeller(companyId, dateStart, dateEnd, branch);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching seller ranking:', err.message);
    res.status(500).json({ message: 'Error fetching seller ranking' });
  }
});

router.get('/pivot', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    
    const branches = companyId ? await getCompanyBranches(companyId) : [];
    const config = companyId ? await getCompanyBillingConfig(companyId) : { paymentMethods: [] };
    const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
    
    let conditions = and(
      companyId ? eq(sales.companyId, companyId) : undefined,
      eq(sales.status, 'active'),
      gte(sales.issuedAt, new Date(dateStart + 'T00:00:00-05:00')),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999-05:00'))
    );
    
    if (seriesFilter && seriesFilter.length > 0) {
      conditions = and(conditions, inArray(sales.series, seriesFilter));
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

    // Payment methods activos
    const activePaymentMethods = (config.paymentMethods || []).map((m: any) => ({
      id: m.id,
      description: m.description
    }));

    if (!activePaymentMethods.some((m: any) => m.id === '99')) {
      activePaymentMethods.push({
        id: '99',
        description: 'Crédito'
      });
    }

    const pivotMap: Record<string, {
      sede: string;
      sucursal?: string;
      payments: Record<string, number>;
      vendedores: Record<string, {
        vendedor: string;
        payments: Record<string, number>;
        total: number;
      }>;
      total: number;
    }> = {};

    // Inicializar todas las sucursales oficiales de la empresa
    for (const b of branches) {
      pivotMap[b.name] = {
        sede: b.name,
        sucursal: b.name,
        payments: {},
        vendedores: {},
        total: 0
      };
      activePaymentMethods.forEach((m: any) => {
        pivotMap[b.name].payments[m.id] = 0;
      });
    }

    for (const sale of salesList) {
      let seriesName = sale.series;
      if (!seriesName && sale.number && sale.number.includes('-')) {
        seriesName = sale.number.split('-')[0];
      }
      
      const branchName = getBranchNameForSeries(seriesName, branches);
      const sellerName = sale.sellerName || 'Sin Vendedor';

      if (!pivotMap[branchName]) {
        pivotMap[branchName] = {
          sede: branchName,
          sucursal: branchName,
          payments: {},
          vendedores: {},
          total: 0
        };
        activePaymentMethods.forEach((m: any) => {
          pivotMap[branchName].payments[m.id] = 0;
        });
      }

      if (!pivotMap[branchName].vendedores[sellerName]) {
        pivotMap[branchName].vendedores[sellerName] = {
          vendedor: sellerName,
          payments: {},
          total: 0
        };
        activePaymentMethods.forEach((m: any) => {
          pivotMap[branchName].vendedores[sellerName].payments[m.id] = 0;
        });
      }

      const saleTotal = parseFloat(sale.total);

      if (sale.payments && sale.payments.length > 0) {
        for (const payment of sale.payments) {
          const amount = parseFloat(payment.amount);
          const method = payment.paymentMethodId;

          if (pivotMap[branchName].payments[method] === undefined) {
            pivotMap[branchName].payments[method] = 0;
          }
          if (pivotMap[branchName].vendedores[sellerName].payments[method] === undefined) {
            pivotMap[branchName].vendedores[sellerName].payments[method] = 0;
          }

          pivotMap[branchName].payments[method] += amount;
          pivotMap[branchName].total += amount;

          pivotMap[branchName].vendedores[sellerName].payments[method] += amount;
          pivotMap[branchName].vendedores[sellerName].total += amount;
        }
      } else {
        const defaultMethod = '01';
        if (pivotMap[branchName].payments[defaultMethod] === undefined) {
          pivotMap[branchName].payments[defaultMethod] = 0;
        }
        if (pivotMap[branchName].vendedores[sellerName].payments[defaultMethod] === undefined) {
          pivotMap[branchName].vendedores[sellerName].payments[defaultMethod] = 0;
        }

        pivotMap[branchName].payments[defaultMethod] += saleTotal;
        pivotMap[branchName].total += saleTotal;

        pivotMap[branchName].vendedores[sellerName].payments[defaultMethod] += saleTotal;
        pivotMap[branchName].vendedores[sellerName].total += saleTotal;
      }
    }

    const pivotData = Object.values(pivotMap).map(s => ({
      ...s,
      vendedores: Object.values(s.vendedores).sort((a, b) => b.total - a.total)
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
    await ensureDateRangeSynced(companyId, dateStart, dateEnd);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    
    const seriesFilter = companyId ? await resolveBranchSeries(companyId, branch) : null;
    
    let conditions = and(
      companyId ? eq(sales.companyId, companyId) : undefined,
      gte(sales.issuedAt, new Date(dateStart + 'T00:00:00-05:00')),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999-05:00'))
    );
    
    if (seriesFilter && seriesFilter.length > 0) {
      conditions = and(conditions, inArray(sales.series, seriesFilter));
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
  } catch (err: any) {
    console.error('Error fetching documents:', err.message);
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

export default router;
