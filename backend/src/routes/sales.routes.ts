import { Router } from 'express';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { getSalesTrend, getSalesByHour, getRankingBySeller, getRankingByCompany } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { db, sqlClient } from '../config/database.js';
import { sales } from '../db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

const parseDateRange = (req: any) => {
  const companyId = req.user.companyId || (req.query.companyId as string);
  const dateStart = (req.query.dateStart as string) || new Date().toISOString().split('T')[0];
  const dateEnd = (req.query.dateEnd as string) || new Date().toISOString().split('T')[0];
  return { companyId, dateStart, dateEnd };
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
        COUNT(DISTINCT s.id)::int as "count",
        SUM(p.amount::numeric)::numeric as "amount"
      FROM sale_payments p
      JOIN sales s ON p.sale_id = s.id
      WHERE s.company_id = ${companyId} AND s.status = 'active'
        AND s.issued_at::date >= ${dateStart}::date AND s.issued_at::date <= ${dateEnd}::date
      GROUP BY p.payment_method_id, s.seller_name
      ORDER BY amount DESC
    `;
    res.json(result);
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
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    
    let conditions = and(
      eq(sales.companyId, companyId),
      eq(sales.status, 'active'),
      gte(sales.issuedAt, new Date(dateStart)),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999Z'))
    );
    
    if (branch) {
      conditions = and(conditions, eq(sales.series, branch));
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

    const pivotMap: Record<string, {
      sede: string;
      vendedores: Record<string, {
        vendedor: string;
        efectivo: number;
        tarjeta: number;
        transferencia: number;
        yapePlin: number;
        otros: number;
        total: number;
      }>;
      efectivo: number;
      tarjeta: number;
      transferencia: number;
      yapePlin: number;
      otros: number;
      total: number;
    }> = {};

    for (const sale of salesList) {
      let series = sale.series;
      if (!series && sale.number && sale.number.includes('-')) {
        series = sale.number.split('-')[0];
      }
      const Sede = series || 'Sede Principal';
      const seller = sale.sellerName || 'Sin Vendedor';

      if (!pivotMap[Sede]) {
        pivotMap[Sede] = {
          sede: Sede,
          vendedores: {},
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          yapePlin: 0,
          otros: 0,
          total: 0
        };
      }

      if (!pivotMap[Sede].vendedores[seller]) {
        pivotMap[Sede].vendedores[seller] = {
          vendedor: seller,
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          yapePlin: 0,
          otros: 0,
          total: 0
        };
      }

      const saleTotal = parseFloat(sale.total);

      if (sale.payments && sale.payments.length > 0) {
        for (const payment of sale.payments) {
          const amount = parseFloat(payment.amount);
          const method = payment.paymentMethodId;

          let category: 'efectivo' | 'tarjeta' | 'transferencia' | 'yapePlin' | 'otros' = 'otros';
          if (method === '01') category = 'efectivo';
          else if (['02', '04', '06'].includes(method)) category = 'tarjeta';
          else if (method === '03') category = 'transferencia';
          else if (method === '05') category = 'yapePlin';

          pivotMap[Sede][category] += amount;
          pivotMap[Sede].total += amount;

          pivotMap[Sede].vendedores[seller][category] += amount;
          pivotMap[Sede].vendedores[seller].total += amount;
        }
      } else {
        pivotMap[Sede].efectivo += saleTotal;
        pivotMap[Sede].total += saleTotal;

        pivotMap[Sede].vendedores[seller].efectivo += saleTotal;
        pivotMap[Sede].vendedores[seller].total += saleTotal;
      }
    }

    const result = Object.values(pivotMap).map(Sede => ({
      ...Sede,
      vendedores: Object.values(Sede.vendedores).sort((a, b) => b.total - a.total)
    })).sort((a, b) => b.total - a.total);

    res.json(result);
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
    const branch = req.query.branch as string;
    const seller = req.query.seller as string;
    
    let conditions = and(
      eq(sales.companyId, companyId),
      gte(sales.issuedAt, new Date(dateStart)),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999Z'))
    );
    
    if (branch) {
      conditions = and(conditions, eq(sales.series, branch));
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

export default router;
