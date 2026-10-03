import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { branchesRouter } from './routes/branches.js';
import { smsRouter } from './routes/sms.js';
import { profileRouter } from './routes/profile.js';
import { catalogRouter } from './routes/catalog.js';
import { classesRouter } from './routes/classes.js';
import { staffRouter } from './routes/staff.js';
import { studentsRouter } from './routes/students.js';
import { contractsRouter } from './routes/contracts.js';
import { dashboardRouter } from './routes/dashboard.js';
import { debtorsRouter } from './routes/debtors.js';
import { notificationsRouter } from './routes/notifications.js';
import { paymentsRouter } from './routes/payments.js';
import { payrollRouter } from './routes/payroll.js';
import { publicContractsRouter } from './routes/publicContracts.js';
import { settingsRouter } from './routes/settings.js';
import { attendanceRouter } from './routes/attendance.js';
import { UPLOAD_DIR } from './services/attendance.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: [...env.clientUrl.split(',').map((u) => u.trim()), 'http://localhost:5173'] }));
  app.use(express.json({ limit: '8mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/classes', classesRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/sms', smsRouter);
  app.use('/api/branches', branchesRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/debtors', debtorsRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/contracts', contractsRouter);
  app.use('/api/public/contracts', publicContractsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
