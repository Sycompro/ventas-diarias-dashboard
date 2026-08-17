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
import webhooksRoutes from './routes/webhooks.routes.js';

const app = express();

// Trust proxy for Railway reverse proxy rate limiting
app.set('trust proxy', 1);

// Middlewares — CORS must come BEFORE helmet and rate limiters
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors()); // Explicit preflight handler for all routes
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));
app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Syscom Dashboard API' });
});
app.use('/api/', generalLimiter);

// Rutas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/webhooks', webhooksRoutes);

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

async function initDatabaseIndexes() {
  try {
    const { sqlClient } = await import('./config/database.js');
    const { runSchemaMigrations } = await import('./db/migrations/apply.js');
    
    // 1. Correr migraciones de base de datos
    await runSchemaMigrations();

    // 2. Crear índices de rendimiento
    await sqlClient.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_sales_company_issued ON sales(company_id, issued_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sales_company_series_issued ON sales(company_id, series, issued_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sales_company_seller_issued ON sales(company_id, seller_name, issued_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sales_company_status ON sales(company_id, status);
      CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments(payment_method_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    `);
    console.log('⚡ Índices de alto rendimiento verificados en PostgreSQL.');
  } catch (e: any) {
    console.warn('Warning al verificar índices:', e.message);
  }
}

// Iniciar servidor
const port = env.PORT;
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en modo ${env.NODE_ENV} en el puerto ${port}`);
  initDatabaseIndexes();
});
