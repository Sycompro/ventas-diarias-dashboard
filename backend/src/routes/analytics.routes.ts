import { Router } from 'express';
import { comparePeriods } from '../services/analytics.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/compare', async (req, res) => {
  try {
    const { companyId, p1Start, p1End, p2Start, p2End, branch, seller } = req.query as any;
    if (!companyId || !p1Start || !p1End || !p2Start || !p2End) {
      return res.status(400).json({ message: 'Missing parameters' });
    }
    const data = await comparePeriods(companyId, p1Start, p1End, p2Start, p2End, branch, seller);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error in comparison' });
  }
});

export default router;
