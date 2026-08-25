import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './routes/auth';
import platformRoutes from './routes/platform';
import userRoutes from './routes/users';
import branchRoutes from './routes/branches';
import productRoutes from './routes/products';
import supplierRoutes from './routes/suppliers';
import purchaseRoutes from './routes/purchases';
import inventoryRoutes from './routes/inventory';
import posRoutes from './routes/pos';
import customerRoutes from './routes/customers';
import prescriptionRoutes from './routes/prescriptions';
import financeRoutes from './routes/finance';
import reportRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import settingsRoutes from './routes/settings';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '12mb' })); // base64 prescription photos

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'tenalesew-api', time: new Date().toISOString() }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/platform', platformRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/v1/purchases', purchaseRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/pos', posRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/prescriptions', prescriptionRoutes);
  app.use('/api/v1/finance', financeRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
