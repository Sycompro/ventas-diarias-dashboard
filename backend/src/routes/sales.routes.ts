import { Router } from 'express';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { getSalesTrend, getSalesByHour, getRankingBySeller, getRankingByCompany } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { db } from '../config/database.js';
import { sales } from '../db/schema.js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

const parseDateRange = (req: any) => {
  const companyId = req.query.companyId as string;
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

router.get('/by-seller', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const data = await getRankingBySeller(companyId, dateStart, dateEnd);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching seller ranking' });
  }
});

router.get('/documents', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd } = parseDateRange(req);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);
    
    let conditions = and(
      eq(sales.companyId, companyId),
      gte(sales.issuedAt, new Date(dateStart)),
      lte(sales.issuedAt, new Date(dateEnd + 'T23:59:59.999Z'))
    );
    
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
