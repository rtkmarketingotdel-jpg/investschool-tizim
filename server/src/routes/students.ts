import { Router } from 'express';
import { csvCell } from '../lib/csv.js';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo } from '../repositories/groupRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import type { Student } from '../data/types.js';
import { chargeRepo, paymentRepo, removeStudentFinance } from '../repositories/financeRepo.js';
import { contractRepo } from '../repositories/contractRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { lastDebtSms } from '../data/mockSms.js';
import { feedbackRepo } from '../repositories/feedbackRepo.js';
import { gradeRepo } from '../repositories/gradeRepo.js';
import { studentBotLink } from '../services/studentTelegram.js';
import { toLocalDate } from '../lib/date.js';
import { debtMap, studentDebt, syncCourseCharge } from '../services/finance.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const phoneRe = /^\+998\d{9}$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const optionalStr = z.string().trim().max(500).nullable().transform((v) => v || null);

const STATUSES = ['ACTIVE', 'GRADUATED', 'LEFT'] as const;
/** "  " and "" mean "not given" for optional document numbers; spaces inside are ignored. */
const blankToNull = (v: unknown) => (typeof v === 'string' ? v.replace(/\s/g, '') || null : v);

const studentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: optionalStr,
  birthDate: z.string().regex(dateRe).nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  groupId: z.string().nullable(),
  phone: z.string().regex(phoneRe),
  phone2: z.string().regex(phoneRe).nullable(),
  passport: z.preprocess(blankToNull, z.string().toUpperCase().regex(/^[A-Z]{2}\d{7}$/).nullable()),
  pinfl: z.preprocess(blankToNull, z.string().regex(/^\d{14}$/).nullable()),
  address: optionalStr,
  district: optionalStr,
  coursePrice: z.number().int().min(0).max(1_000_000_000),
  discountPercent: z.number().int().min(0).max(100),
  status: z.enum(STATUSES),
  enrolledAt: z.string().regex(dateRe),
  notes: optionalStr,
});
type StudentInput = z.infer<typeof studentSchema>;

const listQuery = z.object({
  ...pageQuery,
  q: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  groupId: z.string().optional(),
  courseId: z.string().optional(),
  sort: z.enum(['name', 'date', 'debt']).default('name'),
  debtor: z.enum(['true']).optional(),
});

async function present(s: Student, debt: number | null = null) {
  const group = s.groupId ? await groupRepo.findById(s.groupId) : null;
  const course = group ? await courseRepo.findById(group.courseId) : null;
  const { telegramCode: _code, telegramChatId, ...rest } = s;
  void _code;
  return { ...rest, telegramLinked: !!telegramChatId, fullName: fullName(s), groupName: group?.name ?? null, courseId: course?.id ?? null, courseName: course?.name ?? null, debt };
}

const seesFinance = (role: string) => role !== 'TEACHER';

/** Rejects a NEW seat in a full group (existing members staying put are unaffected). */
async function assertSeat(groupId: string | null, status: string, current?: Student) {
  if (!groupId || status === 'LEFT') return;
  const group = await groupRepo.findById(groupId);
  if (!group) throw new ApiError(400, 'VALIDATION_ERROR');
  if (current && current.groupId === groupId && current.status !== 'LEFT') return;
  const taken = (await studentRepo.occupancy()).get(groupId) ?? 0;
  if (taken >= group.capacity) throw new ApiError(409, 'GROUP_FULL');
}

studentsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const rows = await studentRepo.list({
      q: q.q, status: q.status, groupId: q.groupId, courseId: q.courseId, sort: q.sort === 'debt' ? 'name' : q.sort,
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



studentsRouter.get('/export', async (req, res, next) => {
  try {
    const q = listQuery.parse({ ...req.query, page: 1, limit: 100 });
    const rows = await studentRepo.list({
      q: q.q, status: q.status, groupId: q.groupId, courseId: q.courseId, sort: q.sort === 'debt' ? 'name' : q.sort,
    });
    const head = ['Full name', 'Course', 'Group', 'Status', 'Phone', 'Passport', 'PINFL', 'Birth date', 'Course price', 'Discount %', 'Enrolled'];
    const lines = [head.map(csvCell).join(',')];
    for (const s of rows) {
      const p = await present(s);
      lines.push(
        [p.fullName, p.courseName, p.groupName, s.status, s.phone, s.passport, s.pinfl, s.birthDate, s.coursePrice, s.discountPercent, s.enrolledAt]
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
      ...charges.map((c) => ({ kind: 'CHARGE' as const, id: c.id, date: toLocalDate(c.createdAt), dueDate: c.dueDate, amount: c.amount, method: null })),
      ...payments.map((p) => ({ kind: 'PAYMENT' as const, id: p.id, date: toLocalDate(p.paidAt), dueDate: null, amount: p.amount, method: p.method })),
    ].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'PAYMENT' ? -1 : 1));
    const billed = charges.reduce((n, c) => n + c.amount, 0);
    res.json({
      billed, paid: payments.reduce((n, p) => n + p.amount, 0), balance: -info.debt, debt: Math.max(0, info.debt),
      dueDate: charges[0]?.dueDate ?? null, overdueDays: info.overdueDays, timeline,
    });
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
    await assertSeat(body.groupId, body.status);
    const rec = await studentRepo.create({ ...body, externalId: null, externalCourse: null, telegramChatId: null, telegramCode: null, leftAt: body.status === 'LEFT' ? toLocalDate() : null });
    await syncCourseCharge(rec);
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
    await assertSeat(body.groupId, body.status, current);
    const leftAt = body.status === 'LEFT' ? (current.leftAt ?? toLocalDate()) : null;
    const updated = (await studentRepo.update(current.id, { ...body, leftAt }))!;
    await syncCourseCharge(updated); // the course bill follows the price, discount and group
    res.json(await present(updated));
  } catch (e) {
    next(e);
  }
});

/**
 * Deletes a trainee together with their course bill, payments and contracts.
 * Payments are money history: deleting a trainee who paid is the director's call only, and must be confirmed with ?withPayments=true.
 */
studentsRouter.delete('/:id', requireRole('DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.id!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    const paid = await paymentRepo.byStudent(s.id);
    if (paid.length) {
      if (req.user!.role !== 'DIRECTOR') throw new ApiError(403, 'STUDENT_HAS_PAYMENTS', { count: paid.length });
      if (req.query.withPayments !== 'true') throw new ApiError(409, 'STUDENT_HAS_PAYMENTS', { count: paid.length });
    }
    const removed = { ...removeStudentFinance(s.id), contracts: await contractRepo.removeByStudent(s.id) };
    lastDebtSms.delete(s.id);
    await feedbackRepo.removeForStudent(s.id);
    await gradeRepo.removeForStudent(s.id);
    await studentRepo.remove(s.id);
    await audit(req.user!.id, 'student.delete', 'student', s.id, {
      name: fullName(s), phone: s.phone, externalId: s.externalId, paidTotal: paid.reduce((n, p) => n + p.amount, 0), ...removed,
    });
    res.json({ ok: true, removed });
  } catch (e) {
    next(e);
  }
});

/** The trainee's personal bot link (made on first request); renew=true makes a new one and the old link stops working. */
studentsRouter.post('/:id/telegram-link', requireRole('DIRECTOR', 'MANAGER'), validateBody(z.object({ renew: z.boolean().default(false) })), async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.id!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    const link = await studentBotLink(s, (req.body as { renew: boolean }).renew);
    if (!link) throw new ApiError(400, 'TELEGRAM_NOT_CONFIGURED');
    res.json({ link, linked: !!s.telegramChatId });
  } catch (e) {
    next(e);
  }
});

studentsRouter.delete('/:id/telegram', requireRole('DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const s = await studentRepo.update(req.params.id!, { telegramChatId: null });
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'student.telegram.unlink', 'student', s.id);
    res.json({ linked: false });
  } catch (e) {
    next(e);
  }
});
