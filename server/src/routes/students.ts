import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { classRepo } from '../repositories/classRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import type { Student } from '../data/types.js';
import { chargeRepo, paymentRepo } from '../repositories/financeRepo.js';
import { toLocalDate } from '../lib/date.js';
import { debtMap, generateChargeFor, studentDebt } from '../services/finance.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const phoneRe = /^\+998\d{9}$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const optionalStr = z.string().trim().max(500).nullable().transform((v) => v || null);

const studentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: optionalStr,
  birthDate: z.string().regex(dateRe).nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  classId: z.string().nullable(),
  parentName: z.string().trim().min(1).max(120),
  parentPhone: z.string().regex(phoneRe),
  parentPhone2: z.string().regex(phoneRe).nullable(),
  address: optionalStr,
  district: optionalStr,
  isBoarding: z.boolean(),
  clubs: z.array(z.string()).max(10),
  monthlyFee: z.number().int().min(0).max(100_000_000),
  discountPercent: z.number().int().min(0).max(100),
  status: z.enum(['ACTIVE', 'TRIAL', 'LEFT']),
  enrolledAt: z.string().regex(dateRe),
  notes: optionalStr,
});
type StudentInput = z.infer<typeof studentSchema>;

const listQuery = z.object({
  ...pageQuery,
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'TRIAL', 'LEFT']).optional(),
  classId: z.string().optional(),
  boarding: z.enum(['true', 'false']).optional(),
  club: z.string().max(80).optional(),
  sort: z.enum(['name', 'date', 'debt']).default('name'),
  debtor: z.enum(['true']).optional(),
});

async function present(s: Student, debt: number | null = null) {
  const cls = s.classId ? await classRepo.findById(s.classId) : null;
  return { ...s, fullName: fullName(s), className: cls?.name ?? null, debt };
}

const seesFinance = (role: string) => role !== 'TEACHER';

/** Rejects a NEW seat in a full class (existing members moving nowhere are unaffected). */
async function assertSeat(classId: string | null, status: string, current?: Student) {
  if (!classId || status === 'LEFT') return;
  const cls = await classRepo.findById(classId);
  if (!cls) throw new ApiError(400, 'VALIDATION_ERROR');
  if (current && current.classId === classId && current.status !== 'LEFT') return;
  const taken = (await studentRepo.occupancy()).get(classId) ?? 0;
  if (taken >= cls.capacity) throw new ApiError(409, 'CLASS_FULL');
}

studentsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const rows = await studentRepo.list({
      q: q.q, status: q.status, classId: q.classId, club: q.club, sort: q.sort === 'debt' ? 'name' : q.sort,
      boarding: q.boarding === undefined ? undefined : q.boarding === 'true',
    });
    const finance = seesFinance(req.user!.role);
    const debts = finance ? await debtMap() : null;
    let list = rows;
    if (finance && q.debtor) list = list.filter((s) => (debts!.get(s.id)?.debt ?? 0) > 0);
    if (finance && q.sort === 'debt') list = [...list].sort((a, b) => (debts!.get(b.id)?.debt ?? 0) - (debts!.get(a.id)?.debt ?? 0));
    const page = paginate(list, q.page, q.limit);
    res.json({ ...page, items: await Promise.all(page.items.map((s) => present(s, debts ? Math.max(0, debts.get(s.id)?.debt ?? 0) : null))) });
  } catch (e) {
    next(e);
  }
});

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

studentsRouter.get('/export', async (req, res, next) => {
  try {
    const q = listQuery.parse({ ...req.query, page: 1, limit: 100 });
    const rows = await studentRepo.list({
      q: q.q, status: q.status, classId: q.classId, club: q.club, sort: q.sort === 'debt' ? 'name' : q.sort,
      boarding: q.boarding === undefined ? undefined : q.boarding === 'true',
    });
    const head = ['Full name', 'Class', 'Status', 'Boarding', 'Parent', 'Parent phone', 'Monthly fee', 'Discount %', 'Enrolled'];
    const lines = [head.map(csvCell).join(',')];
    for (const s of rows) {
      const p = await present(s);
      lines.push(
        [p.fullName, p.className, s.status, s.isBoarding ? 'yes' : 'no', s.parentName, s.parentPhone, s.monthlyFee, s.discountPercent, s.enrolledAt]
          .map(csvCell).join(','),
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send('﻿' + lines.join('\r\n'));
  } catch (e) {
    next(e);
  }
});

studentsRouter.get('/:id/finance', requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'), async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.id!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    const [charges, payments, info] = await Promise.all([chargeRepo.byStudent(s.id), paymentRepo.byStudent(s.id), studentDebt(s.id)]);
    const timeline = [
      ...charges.map((c) => ({ kind: 'CHARGE' as const, id: c.id, date: c.dueDate, period: c.period, amount: c.amount, method: null })),
      ...payments.map((p) => ({ kind: 'PAYMENT' as const, id: p.id, date: toLocalDate(p.paidAt), period: p.period, amount: p.amount, method: p.method })),
    ].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'PAYMENT' ? -1 : 1));
    res.json({ balance: -info.debt, debt: Math.max(0, info.debt), overdueDays: info.overdueDays, timeline });
  } catch (e) {
    next(e);
  }
});

studentsRouter.get('/:id', async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.id!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    res.json(await present(s));
  } catch (e) {
    next(e);
  }
});

studentsRouter.post('/', requireRole('DIRECTOR', 'MANAGER'), validateBody(studentSchema), async (req, res, next) => {
  try {
    const body = req.body as StudentInput;
    await assertSeat(body.classId, body.status);
    const rec = await studentRepo.create({ ...body, leftAt: body.status === 'LEFT' ? toLocalDate() : null });
    if (rec.status === 'ACTIVE') await generateChargeFor(rec);
    res.status(201).json(await present(rec));
  } catch (e) {
    next(e);
  }
});

studentsRouter.patch('/:id', requireRole('DIRECTOR', 'MANAGER'), validateBody(studentSchema), async (req, res, next) => {
  try {
    const body = req.body as StudentInput;
    const current = await studentRepo.findById(req.params.id!);
    if (!current) throw new ApiError(404, 'NOT_FOUND');
    await assertSeat(body.classId, body.status, current);
    const leftAt = body.status === 'LEFT' ? (current.leftAt ?? toLocalDate()) : null;
    const updated = (await studentRepo.update(current.id, { ...body, leftAt }))!;
    if (updated.status === 'ACTIVE' && current.status !== 'ACTIVE') await generateChargeFor(updated); // newly active students are billed for this month
    res.json(await present(updated));
  } catch (e) {
    next(e);
  }
});
