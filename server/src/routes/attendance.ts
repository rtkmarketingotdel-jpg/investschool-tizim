import { Router } from 'express';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { checkIn, checkOut, monthStats, punchSchema, type PunchInput } from '../services/attendance.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const publicSettings = () => ({
  workStart: settings.workStart,
  workEnd: settings.workEnd,
  graceMinutes: settings.graceMinutes,
  radiusM: settings.radiusM,
  workDays: settings.workDays,
});

attendanceRouter.get('/today', async (req, res, next) => {
  try {
    const today = toLocalDate();
    const record = await attendanceRepo.findByUserDate(req.user!.id, today);
    res.json({ today, record, settings: publicSettings() });
  } catch (e) {
    next(e);
  }
});

attendanceRouter.post('/check-in', validateBody(punchSchema), async (req, res, next) => {
  try {
    const record = await checkIn(req.user!, req.body as PunchInput, req.headers['user-agent']);
    res.json({ record });
  } catch (e) {
    next(e);
  }
});

attendanceRouter.post('/check-out', validateBody(punchSchema), async (req, res, next) => {
  try {
    res.json({ record: await checkOut(req.user!, req.body as PunchInput) });
  } catch (e) {
    next(e);
  }
});

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

attendanceRouter.get('/mine', async (req, res, next) => {
  try {
    const month = monthSchema.catch(toLocalDate().slice(0, 7)).parse(req.query.month);
    const records = await attendanceRepo.list({
      from: `${month}-01`,
      to: `${month}-31`,
      userId: req.user!.id,
    });
    res.json({ records, stats: monthStats(records) });
  } catch (e) {
    next(e);
  }
});

const listQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

attendanceRouter.get('/', requireRole('DIRECTOR', 'ADMIN', 'ACCOUNTANT'), async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const today = toLocalDate();
    const from = q.from ?? addDays(today, -6);
    const to = q.to ?? today;
    const all = await attendanceRepo.list({ from, to, userId: q.userId });
    const start = (q.page - 1) * q.limit;
    const items = await Promise.all(
      all.slice(start, start + q.limit).map(async (r) => {
        const u = await userRepo.findById(r.userId);
        return { ...r, user: u ? { id: u.id, fullName: u.fullName, position: u.position } : null };
      }),
    );
    // Today's summary counts active employees without a record as "not yet checked in".
    const todayRecords = await attendanceRepo.list({ from: today, to: today });
    res.json({
      items,
      total: all.length,
      page: q.page,
      limit: q.limit,
      today: { ...monthStats(todayRecords), workers: todayRecords.filter((r) => r.checkInAt).length },
    });
  } catch (e) {
    next(e);
  }
});
