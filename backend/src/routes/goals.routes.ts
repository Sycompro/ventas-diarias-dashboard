import { Router } from 'express';
import { getGoalProgress, createGoal, getGoals, updateGoal, deleteGoal } from '../services/goals.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const goals = await getGoals(req.query.companyId as string);
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goals' });
  }
});

router.post('/', async (req, res) => {
  try {
    const goal = await createGoal(req.body);
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Error creating goal' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const goal = await updateGoal(req.params.id, req.body);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ message: 'Error updating goal' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteGoal(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting goal' });
  }
});

router.get('/progress', async (req, res) => {
  try {
    const date = new Date().toISOString().split('T')[0];
    const progress = await getGoalProgress(req.query.companyId as string, date);
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goal progress' });
  }
});

export default router;
