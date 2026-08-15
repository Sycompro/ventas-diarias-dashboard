import { Router } from 'express';
import { getAlerts, markAsRead } from '../services/alerts.service.js';
import { detectAnomalies, generateInsights, getHealthStatus } from '../services/intelligence.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/alerts', async (req, res) => {
  try {
    const { companyId, unread } = req.query as any;
    const unreadOnly = unread === 'true';
    const alerts = await getAlerts(companyId, unreadOnly);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching alerts' });
  }
});

router.put('/alerts/:id/read', async (req, res) => {
  try {
    await markAsRead(req.params.id);
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating alert' });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const { companyId } = req.query as any;
    const date = new Date().toISOString().split('T')[0];
    const insights = await generateInsights(companyId, date);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ message: 'Error generating insights' });
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const { companyId } = req.query as any;
    const anomalies = await detectAnomalies(companyId);
    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ message: 'Error detecting anomalies' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const { companyId } = req.query as any;
    const health = await getHealthStatus(companyId);
    res.json(health);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching health status' });
  }
});

export default router;
