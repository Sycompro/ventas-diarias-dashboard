import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { env } from './config/env.js';
import { generalLimiter, authLimiter } from './middleware/rate-limit.middleware.js';
import { syncAllCompanies } from './services/sync.service.js';

import authRoutes from './routes/auth.routes.js';
import companiesRoutes from './routes/companies.routes.js';
import salesRoutes from './routes/sales.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import intelligenceRoutes from './routes/intelligence.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());
app.use('/api/', generalLimiter);

// Rutas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/reports', reportsRoutes);

// Tarea programada: Sincronización automática cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  console.log('Iniciando sincronización programada...');
  try {
    await syncAllCompanies();
    console.log('Sincronización completada exitosamente.');
  } catch (error) {
    console.error('Error durante la sincronización programada:', error);
  }
});

// Manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ocurrió un error inesperado en el servidor.' });
});

// Iniciar servidor
const port = env.PORT;
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en modo ${env.NODE_ENV} en el puerto ${port}`);
});
