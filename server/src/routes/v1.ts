import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Student } from '../data/types.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireApiKey } from '../middleware/apiKey.js';
import { validateBody } from '../middleware/validate.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { chargeRepo, paymentRepo } from '../repositories/financeRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { debtMap, studentDebt } from '../services/finance.js';
import { placeByCourseLabel, placeInGroup } from '../services/integration.js';
import { brand } from '../brand.config.js';
import { studentBotLink } from '../services/studentTelegram.js';

/**
 * Integration API for other systems (Nazorat AI): read the centre's data and send trainees who arrived.
 * Authenticated with an API key created in Settings → API. Responses use a stable public shape (no internal fields).
 */
export const v1Router = Router();
v1Router.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { error: 'TOO_MANY_REQUESTS' } }));
v1Router.use(requireApiKey);

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** "+998 90 123-45-67", "998901234567", "901234567" → "+998901234567" (null when it is not an Uzbek mobile number). */
const toPhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  const full = d.length === 9 ? `998${d}` : d;
  return /^998\d{9}$/.test(full) ? `+${full}` : null;
};
const phoneField = z.string().transform((v, ctx) => toPhone(v) ?? (ctx.addIssue({ code: 'custom', message: 'phone must be +998XXXXXXXXX' }), z.NEVER));
const blankToNull = (v: unknown) => (typeof v === 'string' && !v.trim() ? null : v);

async function lookups() {
  const [groups, courses, branches] = await Promise.all([groupRepo.list(), courseRepo.list(), branchRepo.list()]);
  return { group: new Map(groups.map((g) => [g.id, g])), course: new Map(courses.map((c) => [c.id, c])), branch: new Map(branches.map((b) => [b.id, b])) };
}
type Lookups = Awaited<ReturnType<typeof lookups>>;

function publicStudent(s: Student, l: Lookups, debt: number | null) {
  const g = s.groupId ? l.group.get(s.groupId) : undefined;
  return {
    id: s.id, externalId: s.externalId, fullName: fullName(s), firstName: s.firstName, lastName: s.lastName, middleName: s.middleName,
    birthDate: s.birthDate, gender: s.gender, phone: s.phone, phone2: s.phone2, passport: s.passport, pinfl: s.pinfl,
    district: s.district, address: s.address, status: s.status, enrolledAt: s.enrolledAt, leftAt: s.leftAt,
    externalCourse: s.externalCourse,
    group: g ? { id: g.id, name: g.name } : null,
    course: g ? { id: g.courseId, name: l.course.get(g.courseId)?.name ?? null } : null,
    coursePrice: s.coursePrice, discountPercent: s.discountPercent, debt,
  };
}

// ---------- index ----------
v1Router.get('/', (_req, res) => {
  res.json({
    name: `${brand.name} integration API`, version: 1,
    endpoints: [
      'GET /api/v1/students', 'GET /api/v1/students/:id', 'POST /api/v1/students',
      'GET /api/v1/courses', 'GET /api/v1/groups', 'GET /api/v1/payments', 'GET /api/v1/debtors',
      'GET /api/v1/staff', 'GET /api/v1/attendance',
    ],
  });
});

// ---------- trainees ----------
const studentsQuery = z.object({
  ...pageQuery,
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'LEFT']).optional(),
  groupId: z.string().optional(),
  courseId: z.string().optional(),
  externalId: z.string().optional(),
});

v1Router.get('/students', async (req, res, next) => {
  try {
    const q = studentsQuery.parse(req.query);
    let rows = await studentRepo.list({ q: q.q, status: q.status, groupId: q.groupId, courseId: q.courseId, sort: 'name' });
    if (q.externalId) rows = rows.filter((s) => s.externalId === q.externalId);
    const [l, debts] = await Promise.all([lookups(), debtMap()]);
    const page = paginate(rows, q.page, q.limit);
    res.json({ ...page, items: page.items.map((s) => publicStudent(s, l, Math.max(0, debts.get(s.id)?.debt ?? 0))) });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/students/:id', async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.id!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    const [l, info, charges, payments] = await Promise.all([lookups(), studentDebt(s.id), chargeRepo.byStudent(s.id), paymentRepo.byStudent(s.id)]);
    res.json({
      ...publicStudent(s, l, Math.max(0, info.debt)),
      finance: {
        billed: charges.reduce((n, c) => n + c.amount, 0), paid: payments.reduce((n, p) => n + p.amount, 0),
        debt: Math.max(0, info.debt), dueDate: info.oldestDueDate ?? charges[0]?.dueDate ?? null, overdueDays: info.overdueDays,
        payments: payments.map((p) => ({ id: p.id, amount: p.amount, method: p.method, paidAt: p.paidAt })),
      },
    });
  } catch (e) {
    next(e);
  }
});

const arrivalSchema = z.object({
  /** The trainee's id in the sending system: a repeated send updates the same trainee instead of adding a second one. */
  externalId: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: z.preprocess(blankToNull, z.string().trim().max(60).nullable()).default(null),
  phone: phoneField,
  phone2: z.preprocess(blankToNull, phoneField.nullable()).default(null),
  birthDate: z.preprocess(blankToNull, z.string().regex(dateRe).nullable()).default(null),
  gender: z.enum(['MALE', 'FEMALE']).default('MALE'),
  passport: z.preprocess((v) => (typeof v === 'string' ? v.replace(/\s/g, '').toUpperCase() || null : v), z.string().regex(/^[A-Z]{2}\d{7}$/).nullable()).default(null),
  pinfl: z.preprocess((v) => (typeof v === 'string' ? v.replace(/\s/g, '') || null : v), z.string().regex(/^\d{14}$/).nullable()).default(null),
  district: z.preprocess(blankToNull, z.string().trim().max(120).nullable()).default(null),
  address: z.preprocess(blankToNull, z.string().trim().max(500).nullable()).default(null),
  /** Course label of the sending system, e.g. "Samarqand santexnika"; linked to a group in Settings → API. */
  course: z.preprocess(blankToNull, z.string().trim().max(120).nullable()).default(null),
  /** Optional: put the trainee straight into this group (overrides the course label). */
  groupId: z.preprocess(blankToNull, z.string().nullable()).default(null),
  /** Arrival day (YYYY-MM-DD), today when omitted. */
  arrivedAt: z.preprocess(blankToNull, z.string().regex(dateRe).nullable()).default(null),
  notes: z.preprocess(blankToNull, z.string().trim().max(500).nullable()).default(null),
});

/** A trainee arrived at the centre: create them (or update the one with this externalId) and place them in a group. */
v1Router.post('/students', validateBody(arrivalSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof arrivalSchema>;
    if (b.groupId && !(await groupRepo.findById(b.groupId))) throw new ApiError(400, 'VALIDATION_ERROR', { groupId: 'unknown group' });
    const personal = {
      firstName: b.firstName, lastName: b.lastName, middleName: b.middleName, phone: b.phone, phone2: b.phone2, birthDate: b.birthDate,
      gender: b.gender, passport: b.passport, pinfl: b.pinfl, district: b.district, address: b.address,
    };
    const existing = (await studentRepo.list({})).find((s) => s.externalId === b.externalId) ?? null;
    let s: Student;
    if (existing) {
      // a repeated send refreshes the personal data only: group, price and status are managed in the centre
      s = (await studentRepo.update(existing.id, { ...personal, externalCourse: b.course ?? existing.externalCourse }))!;
    } else {
      s = await studentRepo.create({
        ...personal, externalId: b.externalId, externalCourse: b.course, telegramChatId: null, telegramCode: null, groupId: null, coursePrice: 0, discountPercent: 0,
        status: 'ACTIVE', enrolledAt: b.arrivedAt ?? toLocalDate(), leftAt: null, notes: b.notes,
      });
    }
    const placement = b.groupId ? await placeInGroup(s, b.groupId) : await placeByCourseLabel(s);
    await audit(null, existing ? 'api.student.update' : 'api.student.create', 'student', s.id, { key: req.apiKey!.name, externalId: b.externalId, placement });
    const l = await lookups();
    const fresh = (await studentRepo.findById(s.id))!;
    res.status(existing ? 200 : 201).json({
      created: !existing, placement, student: publicStudent(fresh, l, Math.max(0, (await studentDebt(fresh.id)).debt)),
      // personal link to the centre's bot: send it to the trainee so they rate their lessons
      telegram: { linked: !!fresh.telegramChatId, link: await studentBotLink(fresh) },
    });
  } catch (e) {
    next(e);
  }
});

// ---------- courses and groups ----------
v1Router.get('/courses', async (_req, res, next) => {
  try {
    res.json({ items: (await courseRepo.list()).map((c) => ({ id: c.id, name: c.name, durationMonths: c.durationMonths, price: c.price, description: c.description })) });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/groups', async (req, res, next) => {
  try {
    const status = z.enum(['PLANNED', 'ACTIVE', 'FINISHED']).optional().parse(req.query.status);
    const [l, occ, users] = await Promise.all([lookups(), studentRepo.occupancy(), userRepo.list()]);
    const teacher = new Map(users.map((u) => [u.id, u.fullName]));
    const items = [...l.group.values()]
      .map((g) => ({ g, st: groupStatus(g) }))
      .filter(({ st }) => !status || st === status)
      .map(({ g, st }) => ({
        id: g.id, name: g.name, status: st, course: { id: g.courseId, name: l.course.get(g.courseId)?.name ?? null },
        startDate: g.startDate, endDate: g.endDate, days: g.days, timeStart: g.timeStart, timeEnd: g.timeEnd, room: g.room,
        branch: g.branchId ? (l.branch.get(g.branchId)?.name ?? null) : null, teacher: g.teacherId ? (teacher.get(g.teacherId) ?? null) : null,
        capacity: g.capacity, students: occ.get(g.id) ?? 0, freeSeats: Math.max(0, g.capacity - (occ.get(g.id) ?? 0)),
      }));
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

// ---------- finance ----------
const rangeQuery = z.object({
  ...pageQuery,
  from: z.string().regex(dateRe).optional(),
  to: z.string().regex(dateRe).optional(),
  studentId: z.string().optional(),
});

v1Router.get('/payments', async (req, res, next) => {
  try {
    const q = rangeQuery.parse(req.query);
    const to = q.to ?? toLocalDate();
    const from = q.from ?? addDays(to, -29);
    const rows = (await paymentRepo.all())
      .filter((p) => { const d = toLocalDate(p.paidAt); return d >= from && d <= to && (!q.studentId || p.studentId === q.studentId); })
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
    const page = paginate(rows, q.page, q.limit);
    res.json({
      ...page, from, to, totalAmount: rows.reduce((n, p) => n + p.amount, 0),
      items: page.items.map((p) => ({ id: p.id, studentId: p.studentId, amount: p.amount, method: p.method, paidAt: p.paidAt, note: p.note })),
    });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/debtors', async (req, res, next) => {
  try {
    const q = z.object(pageQuery).parse(req.query);
    const [debts, students, l] = await Promise.all([debtMap(), studentRepo.list({}), lookups()]);
    const rows = students
      .filter((s) => (debts.get(s.id)?.debt ?? 0) > 0)
      .map((s) => ({ s, d: debts.get(s.id)! }))
      .sort((a, b) => b.d.overdueDays - a.d.overdueDays || b.d.debt - a.d.debt);
    const page = paginate(rows, q.page, q.limit);
    res.json({
      ...page, totalDebt: rows.reduce((n, r) => n + r.d.debt, 0),
      items: page.items.map(({ s, d }) => ({
        student: publicStudent(s, l, d.debt), debt: d.debt, dueDate: d.oldestDueDate, overdueDays: d.overdueDays, lastPaymentAt: d.lastPaymentAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ---------- staff and attendance (no salaries) ----------
v1Router.get('/staff', async (_req, res, next) => {
  try {
    const [users, l] = await Promise.all([userRepo.list(), lookups()]);
    res.json({
      items: users.map((u) => ({
        id: u.id, fullName: u.fullName, phone: u.phone, role: u.role, position: u.position, isTeacher: u.isTeacher, specialty: u.specialty,
        branch: u.branchId ? (l.branch.get(u.branchId)?.name ?? null) : null, isActive: u.isActive, hiredAt: u.hiredAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

v1Router.get('/attendance', async (req, res, next) => {
  try {
    const q = z.object({ from: z.string().regex(dateRe).optional(), to: z.string().regex(dateRe).optional(), userId: z.string().optional() }).parse(req.query);
    const to = q.to ?? toLocalDate();
    const from = q.from ?? to;
    if (from > to || from < addDays(to, -92)) throw new ApiError(400, 'VALIDATION_ERROR', { range: 'at most 93 days' });
    const [rows, users] = await Promise.all([attendanceRepo.list({ from, to, userId: q.userId }), userRepo.list()]);
    const name = new Map(users.map((u) => [u.id, u.fullName]));
    res.json({
      from, to,
      items: rows.map((a) => ({
        id: a.id, userId: a.userId, fullName: name.get(a.userId) ?? null, date: a.date, status: a.status, lateMinutes: a.lateMinutes,
        checkInAt: a.checkInAt, checkOutAt: a.checkOutAt, branchId: a.branchId,
      })),
    });
  } catch (e) {
    next(e);
  }
});
