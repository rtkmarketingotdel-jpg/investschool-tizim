import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { classesRouter } from './routes/classes.js';
import { staffRouter } from './routes/staff.js';
import { studentsRouter } from './routes/students.js';
import { attendanceRouter } from './routes/attendance.js';
import { UPLOAD_DIR } from './services/attendance.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: [env.clientUrl, 'http://localhost:5173'] }));
  app.use(express.json({ limit: '3mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/classes', classesRouter);
  app.use('/api/staff', staffRouter);
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
