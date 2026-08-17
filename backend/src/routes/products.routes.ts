import { Router } from 'express';
import { getProductAnalytics } from '../services/products.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/analytics', async (req, res) => {
  try {
    const { companyId, dateStart, dateEnd, branch, seller } = req.query as any;
    if (!companyId || !dateStart || !dateEnd) {
      return res.status(400).json({ message: 'Missing required parameters: companyId, dateStart, dateEnd' });
    }
    const data = await getProductAnalytics(companyId, dateStart, dateEnd, branch, seller);
    res.json(data);
  } catch (err: any) {
    console.error('Error in product analytics:', err);
    res.status(500).json({ message: 'Error generating product analytics' });
  }
});

export default router;
