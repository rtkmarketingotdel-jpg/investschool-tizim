import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type { Role } from '../data/types.js';
import { toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { adjustmentRepo, payrollRepo } from '../repositories/financeRepo.js';
import { classRepo } from '../repositories/classRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { toPublicUser, userRepo } from '../repositories/userRepo.js';

export const staffRouter = Router();
staffRouter.use(requireAuth, requireRole('DIRECTOR', 'ADMIN'));

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePassword = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const staffSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().regex(/^\+998\d{9}$/),
  role: z.enum(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF']),
  position: z.string().trim().min(1).max(120),
  isTeacher: z.boolean().default(false),
  subject: z.string().trim().max(60).nullable().default(null),
  /** Optional login password on creation; generated when omitted. */
  password: z.string().min(8).max(64).optional(),
  homeroomClassId: z.string().nullable().default(null),
  baseSalary: z.number().int().min(0).max(100_000_000),
  isActive: z.boolean().default(true),
});
type StaffInput = z.infer<typeof staffSchema>;

const listQuery = z.object({
  ...pageQuery,
  q: z.string().optional(),
  role: z.enum(['DIRECTOR', 'ACCOUNTANT', 'ADMIN', 'STAFF']).optional(),
  active: z.enum(['true', 'false']).optional(),
  teacher: z.enum(['true']).optional(),
});

/** Only the director may hand out roles above STAFF/ADMIN, or touch such accounts. */
function assertCanManage(actorRole: Role, targetRole: Role, newRole?: Role) {
  if (actorRole === 'DIRECTOR') return;
  const privileged: Role[] = ['DIRECTOR', 'ACCOUNTANT'];
  if (privileged.includes(targetRole) || (newRole && privileged.includes(newRole))) throw new ApiError(403, 'FORBIDDEN');
}

staffRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const term = q.q?.trim().toLowerCase();
    const digits = term?.replace(/\D/g, '');
    const rows = (await userRepo.list())
      .filter((u) => (!q.role || u.role === q.role) && (!q.teacher || u.isTeacher) && (q.active === undefined || u.isActive === (q.active === 'true')))
      .filter((u) => !term || u.fullName.toLowerCase().includes(term) || (!!digits && u.phone.includes(digits)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    const page = paginate(rows, q.page, q.limit);
    const month = toLocalDate().slice(0, 7);
    const monthRecords = await attendanceRepo.list({ from: `${month}-01`, to: `${month}-31` });
    const items = page.items.map((u) => {
      const mine = monthRecords.filter((r) => r.userId === u.id);
      return {
        ...toPublicUser(u),
        lateCount: mine.filter((r) => r.status === 'LATE').length,
        absentCount: mine.filter((r) => r.status === 'ABSENT').length,
      };
    });
    res.json({ ...page, items });
  } catch (e) {
    next(e);
  }
});

staffRouter.get('/:id/overview', async (req, res, next) => {
  try {
    const u = await userRepo.findById(req.params.id!);
    if (!u) throw new ApiError(404, 'NOT_FOUND');
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month)) ? String(req.query.month) : toLocalDate().slice(0, 7);
    const seesPay = req.user!.role === 'DIRECTOR';
    const [attendance, payrolls, adjustments] = await Promise.all([
      attendanceRepo.list({ from: `${month}-01`, to: `${month}-31`, userId: u.id }),
      seesPay ? payrollRepo.byUser(u.id) : [],
      seesPay ? adjustmentRepo.forUserPeriod(u.id, month) : [],
    ]);
    res.json({ user: toPublicUser(u), month, attendance, payrolls, adjustments, seesPay });
  } catch (e) {
    next(e);
  }
});

staffRouter.post('/', validateBody(staffSchema), async (req, res, next) => {
  try {
    const body = req.body as StaffInput;
    assertCanManage(req.user!.role, body.role, body.role);
    if (await userRepo.findByPhone(body.phone)) throw new ApiError(409, 'STAFF_PHONE_EXISTS');
    const { password, homeroomClassId, ...data } = body;
    if (homeroomClassId && !(await classRepo.findById(homeroomClassId))) throw new ApiError(400, 'VALIDATION_ERROR');
    const finalPassword = password ?? generatePassword();
    const user = await userRepo.create({
      ...data,
      isTeacher: data.isTeacher,
      subject: data.isTeacher ? data.subject : null,
      passwordHash: await bcrypt.hash(finalPassword, 10),
      language: 'uz',
      hiredAt: new Date(),
    });
    if (homeroomClassId) await classRepo.update(homeroomClassId, { teacherId: user.id });
    await audit(req.user!.id, 'staff.create', 'user', user.id, { role: user.role, isTeacher: user.isTeacher });
    res.status(201).json({ user: toPublicUser(user), tempPassword: finalPassword, generated: !password });
  } catch (e) {
    next(e);
  }
});

staffRouter.patch('/:id', validateBody(staffSchema), async (req, res, next) => {
  try {
    const body = req.body as StaffInput;
    const target = await userRepo.findById(req.params.id!);
    if (!target) throw new ApiError(404, 'NOT_FOUND');
    assertCanManage(req.user!.role, target.role, body.role);
    if (target.id === req.user!.id && (!body.isActive || body.role !== target.role)) {
      throw new ApiError(400, 'STAFF_CANNOT_MODIFY_SELF');
    }
    const clash = await userRepo.findByPhone(body.phone);
    if (clash && clash.id !== target.id) throw new ApiError(409, 'STAFF_PHONE_EXISTS');
    const { password: _ignored, homeroomClassId, ...data } = body;
    void _ignored;
    if (homeroomClassId) {
      if (!(await classRepo.findById(homeroomClassId))) throw new ApiError(400, 'VALIDATION_ERROR');
      await classRepo.update(homeroomClassId, { teacherId: target.id });
    }
    const updated = await userRepo.update(target.id, { ...data, subject: data.isTeacher ? data.subject : null });
    await audit(req.user!.id, 'staff.update', 'user', target.id);
    res.json({ user: toPublicUser(updated!) });
  } catch (e) {
    next(e);
  }
});

staffRouter.post('/:id/reset-password', async (req, res, next) => {
  try {
    const target = await userRepo.findById(req.params.id!);
    if (!target) throw new ApiError(404, 'NOT_FOUND');
    assertCanManage(req.user!.role, target.role);
    const tempPassword = generatePassword();
    await userRepo.update(target.id, { passwordHash: await bcrypt.hash(tempPassword, 10) });
    await audit(req.user!.id, 'staff.resetPassword', 'user', target.id);
    res.json({ tempPassword });
  } catch (e) {
    next(e);
  }
});
