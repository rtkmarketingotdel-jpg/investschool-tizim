import { Router } from 'express';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import { addDays, isoWeekday, toLocalDate } from '../lib/date.js';
import { haversineM } from '../lib/geo.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { setStatus } from '../services/attendanceEffects.js';
import { ApiError } from '../lib/errors.js';
import { allowedBranches, checkIn, checkOut, monthStats, punchSchema, type PunchInput } from '../services/attendance.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const publicSettings = () => ({
  workStart: settings.workStart,
  workEnd: settings.workEnd,
  graceMinutes: settings.graceMinutes,
  workDays: settings.workDays,
});

attendanceRouter.get('/today', async (req, res, next) => {
  try {
    const today = toLocalDate();
    const record = await attendanceRepo.findByUserDate(req.user!.id, today);
    const branches = (await allowedBranches(req.user!)).map((b) => ({ id: b.id, name: b.name, lat: b.lat, lng: b.lng, radiusM: b.radiusM }));
    res.json({ today, record, settings: { ...publicSettings(), geoEnforced: settings.geoEnforced, maxGpsAccuracyM: settings.maxGpsAccuracyM }, branches });
  } catch (e) {
    next(e);
  }
});

attendanceRouter.post('/check-in', validateBody(punchSchema), async (req, res, next) => {
  try {
    const { record, selfie } = await checkIn(req.user!, req.body as PunchInput, req.headers['user-agent']);
    res.json({ record, selfie });
  } catch (e) {
    next(e);
  }
});

attendanceRouter.post('/check-out', validateBody(punchSchema), async (req, res, next) => {
  try {
    const { record, selfie } = await checkOut(req.user!, req.body as PunchInput);
    res.json({ record, selfie });
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

const patchSchema = z.object({
  status: z.enum(['ON_TIME', 'LATE', 'ABSENT', 'EXCUSED']),
  note: z.string().trim().max(500).nullable(),
});

attendanceRouter.patch('/:id', requireRole('DIRECTOR', 'ADMIN'), validateBody(patchSchema), async (req, res, next) => {
  try {
    const rec = (await attendanceRepo.list({ from: '0000-01-01', to: '9999-12-31' })).find((r) => r.id === req.params.id);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    const body = req.body as z.infer<typeof patchSchema>;
    res.json({ record: await setStatus(rec, body.status, body.note, req.user!.id) });
  } catch (e) {
    next(e);
  }
});

async function buildMatrix(month: string) {
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const records = await attendanceRepo.list({ from: `${month}-01`, to: `${month}-31` });
  const users = (await userRepo.list()).filter((u) => u.isActive && u.role !== 'DIRECTOR').sort((a, b) => a.fullName.localeCompare(b.fullName));
  const rows = users.map((u) => {
    const mine = records.filter((r) => r.userId === u.id);
    const byDate: Record<string, string> = {};
    for (const r of mine) byDate[r.date] = r.status;
    return { user: { id: u.id, fullName: u.fullName, position: u.position }, days: byDate, totals: monthStats(mine) };
  });
  return { month, days, workDays: settings.workDays, rows };
}

attendanceRouter.get('/matrix', requireRole('DIRECTOR', 'ADMIN', 'ACCOUNTANT'), async (req, res, next) => {
  try {
    res.json(await buildMatrix(monthSchema.catch(toLocalDate().slice(0, 7)).parse(req.query.month)));
  } catch (e) {
    next(e);
  }
});

attendanceRouter.get('/matrix/export', requireRole('DIRECTOR', 'ADMIN', 'ACCOUNTANT'), async (req, res, next) => {
  try {
    const m = await buildMatrix(monthSchema.catch(toLocalDate().slice(0, 7)).parse(req.query.month));
    const code: Record<string, string> = { ON_TIME: '+', LATE: 'L', ABSENT: '-', EXCUSED: 'E' };
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Employee', ...m.days.map((d) => d.slice(8)), 'On time', 'Late', 'Absent', 'Excused'].map(cell).join(',')];
    for (const r of m.rows) {
      lines.push([r.user.fullName, ...m.days.map((d) => code[r.days[d] ?? ''] ?? ''), r.totals.onTime, r.totals.late, r.totals.absent, r.totals.excused].map(cell).join(','));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${m.month}.csv"`);
    res.send('\uFEFF' + lines.join('\r\n'));
  } catch (e) {
    next(e);
  }
});

const dayQuery = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), branchId: z.string().optional() });

/** Every active employee for one day (also those without a record), for the director's overview. */
attendanceRouter.get('/day', requireRole('DIRECTOR', 'ADMIN', 'ACCOUNTANT'), async (req, res, next) => {
  try {
    const q = dayQuery.parse(req.query);
    const date = q.date ?? toLocalDate();
    const [users, records, branches] = await Promise.all([userRepo.list(), attendanceRepo.list({ from: date, to: date }), branchRepo.list()]);
    const byUser = new Map(records.map((r) => [r.userId, r]));
    const bName = new Map(branches.map((b) => [b.id, b.name]));
    const rows = users
      .filter((u) => u.isActive && u.role !== 'DIRECTOR' && (!q.branchId || u.branchId === q.branchId))
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((u) => {
        const r = byUser.get(u.id) ?? null;
        const branchId = r?.branchId ?? u.branchId;
        return {
          user: { id: u.id, fullName: u.fullName, position: u.position, role: u.role },
          branchId, branchName: branchId ? (bName.get(branchId) ?? null) : null,
          record: r, state: r ? r.status : 'NOT_YET',
        };
      });
    const count = (s: string) => rows.filter((r) => r.state === s).length;
    res.json({
      date, rows, isWorkday: settings.workDays.includes(isoWeekday(date)),
      summary: { total: rows.length, came: rows.filter((r) => r.record?.checkInAt).length, onTime: count('ON_TIME'), late: count('LATE'), absent: count('ABSENT'), excused: count('EXCUSED'), notYet: count('NOT_YET'), left: rows.filter((r) => r.record?.checkOutAt).length },
    });
  } catch (e) {
    next(e);
  }
});

/** Live map: employees who checked in today and have not left yet (a dot disappears on check-out). */
attendanceRouter.get('/map', requireRole('DIRECTOR', 'ADMIN', 'ACCOUNTANT'), async (_req, res, next) => {
  try {
    const today = toLocalDate();
    const [records, branches] = await Promise.all([attendanceRepo.list({ from: today, to: today }), branchRepo.list()]);
    const points = [];
    for (const r of records) {
      if (!r.checkInAt || r.checkOutAt || r.checkInLat == null || r.checkInLng == null) continue;
      const u = await userRepo.findById(r.userId);
      if (!u) continue;
      const home = r.geoOffset ? branches.find((b) => b.id === r.branchId) : undefined;
      const lat = home && r.geoOffset ? home.lat + r.geoOffset[0] : r.checkInLat;
      const lng = home && r.geoOffset ? home.lng + r.geoOffset[1] : r.checkInLng;
      points.push({
        userId: u.id, fullName: u.fullName, position: u.position, lat, lng, checkInAt: r.checkInAt,
        status: r.status, lateMinutes: r.lateMinutes, distanceM: home ? haversineM(lat, lng, home.lat, home.lng) : r.checkInDistanceM, photoUrl: r.checkInPhotoUrl,
        branchName: branches.find((b) => b.id === r.branchId)?.name ?? null,
      });
    }
    res.json({
      branches: branches.map((b) => ({ id: b.id, name: b.name, lat: b.lat, lng: b.lng, radiusM: b.radiusM })),
      points,
      counts: { onSite: points.length, left: records.filter((r) => r.checkOutAt).length },
    });
  } catch (e) {
    next(e);
  }
});
