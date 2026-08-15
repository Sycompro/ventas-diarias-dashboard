import { Router } from 'express';
import { generateCSV, generateExcelBuffer } from '../services/reports.service.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Endpoint simulado, requeriría buscar datos y formatearlos
router.get('/csv', async (req, res) => {
  try {
    const data = [{ id: 1, total: 100 }, { id: 2, total: 200 }];
    const csv = generateCSV(data, ['id', 'total']);
    res.header('Content-Type', 'text/csv');
    res.attachment('report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Error generating CSV' });
  }
});

router.get('/excel', async (req, res) => {
  try {
    const data = [{ id: 1, total: 100 }, { id: 2, total: 200 }];
    const buffer = await generateExcelBuffer(data, 'Sales');
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('report.xlsx');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Error generating Excel' });
  }
});

export default router;
