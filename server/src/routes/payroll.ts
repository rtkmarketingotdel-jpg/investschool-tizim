import { Router } from 'express';
import { z } from 'zod';
import { toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { adjustmentRepo, payrollRepo } from '../repositories/financeRepo.js';
import { audit, notifyRoles } from '../repositories/notificationRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { calculatePeriod, isLocked, previewPayroll, refreshDraft } from '../services/payroll.js';

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

const periodRe = /^\d{4}-\d{2}$/;
const periodSchema = z.string().regex(periodRe);

// Every employee may read their own payslips.
payrollRouter.get('/mine', async (req, res, next) => {
  try {
    const rows = await payrollRepo.byUser(req.user!.id);
    const withAdj = await Promise.all(rows.map(async (p) => ({ ...p, adjustments: await adjustmentRepo.forUserPeriod(p.userId, p.period) })));
    const current = await previewPayroll(req.user!.id, req.user!.baseSalary, toLocalDate().slice(0, 7));
    res.json({ items: withAdj, current });
  } catch (e) {
    next(e);
  }
});

const finance = requireRole('DIRECTOR', 'ACCOUNTANT');

async function present(p: NonNullable<Awaited<ReturnType<typeof payrollRepo.findById>>>) {
  const u = await userRepo.findById(p.userId);
  return { ...p, fullName: u?.fullName ?? '—', position: u?.position ?? '' };
}

payrollRouter.get('/', finance, async (req, res, next) => {
  try {
    const period = periodSchema.catch(toLocalDate().slice(0, 7)).parse(req.query.period);
    const rows = await payrollRepo.byPeriod(period);
    const items = (await Promise.all(rows.map(present))).sort((a, b) => a.fullName.localeCompare(b.fullName));
    res.json({
      period, items,
      summary: {
        total: items.reduce((s, r) => s + r.total, 0),
        bonus: items.reduce((s, r) => s + r.bonusTotal, 0),
        fine: items.reduce((s, r) => s + r.fineTotal, 0),
      },
    });
  } catch (e) {
    next(e);
  }
});

payrollRouter.post('/calculate', finance, validateBody(z.object({ period: periodSchema })), async (req, res, next) => {
  try {
    const { period } = req.body as { period: string };
    const result = await calculatePeriod(period);
    await audit(req.user!.id, 'payroll.calculate', 'payroll', period, result);
    await notifyRoles(['DIRECTOR'], 'notif.payrollPending', { period }, '/finance/payroll');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

payrollRouter.get('/export', finance, async (req, res, next) => {
  try {
    const period = periodSchema.catch(toLocalDate().slice(0, 7)).parse(req.query.period);
    const rows = await Promise.all((await payrollRepo.byPeriod(period)).map(present));
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Employee', 'Position', 'Base', 'Bonus', 'Fine', 'Total', 'Worked days', 'Late', 'Absent', 'Status'].map(cell).join(',')];
    for (const r of rows) lines.push([r.fullName, r.position, r.baseSalary, r.bonusTotal, r.fineTotal, r.total, r.workedDays, r.lateCount, r.absentCount, r.status].map(cell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payroll-${period}.csv"`);
    res.send('﻿' + lines.join('\r\n'));
  } catch (e) {
    next(e);
  }
});

payrollRouter.get('/:id', finance, async (req, res, next) => {
  try {
    const p = await payrollRepo.findById(req.params.id!);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    res.json({ ...(await present(p)), adjustments: await adjustmentRepo.forUserPeriod(p.userId, p.period) });
  } catch (e) {
    next(e);
  }
});

const adjustSchema = z.object({
  userId: z.string().min(1),
  period: periodSchema,
  type: z.enum(['BONUS', 'FINE']),
  amount: z.number().int().min(1000).max(100_000_000),
  reason: z.string().trim().min(3).max(300),
});

payrollRouter.post('/adjustments', finance, validateBody(adjustSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof adjustSchema>;
    if (!(await userRepo.findById(body.userId))) throw new ApiError(404, 'NOT_FOUND');
    const existing = await payrollRepo.find(body.userId, body.period);
    if (existing && isLocked(existing)) throw new ApiError(409, 'PAYROLL_LOCKED');
    const adj = await adjustmentRepo.create({ ...body, source: 'MANUAL', attendanceId: null });
    await refreshDraft(body.userId, body.period);
    await audit(req.user!.id, 'payroll.adjustment', 'payroll', adj.id, { userId: body.userId, type: body.type, amount: body.amount });
    res.status(201).json({ adjustment: adj });
  } catch (e) {
    next(e);
  }
});

payrollRouter.post('/:id/approve', requireRole('DIRECTOR'), async (req, res, next) => {
  try {
    const p = await payrollRepo.findById(req.params.id!);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    if (p.status !== 'DRAFT') throw new ApiError(409, 'PAYROLL_BAD_STATE');
    const updated = await payrollRepo.update(p.id, { status: 'APPROVED', approvedAt: new Date() });
    await audit(req.user!.id, 'payroll.approve', 'payroll', p.id, { userId: p.userId, period: p.period, total: p.total });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

payrollRouter.post('/:id/pay', finance, async (req, res, next) => {
  try {
    const p = await payrollRepo.findById(req.params.id!);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    if (p.status !== 'APPROVED') throw new ApiError(409, 'PAYROLL_BAD_STATE');
    const updated = await payrollRepo.update(p.id, { status: 'PAID', paidAt: new Date() });
    await audit(req.user!.id, 'payroll.pay', 'payroll', p.id, { userId: p.userId, period: p.period, total: p.total });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});
