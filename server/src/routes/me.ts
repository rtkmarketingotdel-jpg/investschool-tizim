import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { clubRepo } from '../repositories/academicsRepo.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { classRepo } from '../repositories/classRepo.js';
import { contractRepo } from '../repositories/contractRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { toPublicUser, userRepo } from '../repositories/userRepo.js';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/', (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

const languageSchema = z.object({ language: z.enum(['uz', 'ru']) });
meRouter.patch('/language', validateBody(languageSchema), async (req, res, next) => {
  try {
    const user = await userRepo.update(req.user!.id, { language: req.body.language });
    res.json({ user: toPublicUser(user!) });
  } catch (e) {
    next(e);
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
meRouter.post('/password', validateBody(passwordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
    if (!(await bcrypt.compare(currentPassword, req.user!.passwordHash))) {
      throw new ApiError(400, 'AUTH_WRONG_PASSWORD');
    }
    await userRepo.update(req.user!.id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * Everything a teacher needs about their own work: the class(es) they lead with the full roster and parent contacts,
 * the clubs they lead and who joined. No money fields (fees/debts) are exposed here.
 */
meRouter.get('/teaching', async (req, res, next) => {
  try {
    const me = req.user!;
    const contracts = new Map<string, { status: string; number: string }>();
    for (const c of await contractRepo.all()) {
      if (c.status === 'CANCELLED') continue;
      const cur = contracts.get(c.studentId);
      if (!cur || c.number > cur.number) contracts.set(c.studentId, { status: c.status, number: c.number });
    }
    const occ = await studentRepo.occupancy();
    const classes = [];
    for (const c of (await classRepo.list()).filter((x) => x.teacherId === me.id)) {
      const branch = c.branchId ? await branchRepo.findById(c.branchId) : null;
      const roster = (await studentRepo.list({ classId: c.id, sort: 'name' })).filter((s) => s.status !== 'LEFT');
      const taken = occ.get(c.id) ?? roster.length;
      classes.push({
        id: c.id, name: c.name, grade: c.grade, capacity: c.capacity, studentCount: taken, freeSeats: Math.max(0, c.capacity - taken),
        branchName: branch?.name ?? null, boys: roster.filter((s) => s.gender === 'MALE').length, girls: roster.filter((s) => s.gender === 'FEMALE').length,
        students: roster.map((s) => ({
          id: s.id, fullName: fullName(s), firstName: s.firstName, lastName: s.lastName, gender: s.gender, birthDate: s.birthDate, status: s.status,
          parentName: s.parentName, parentPhone: s.parentPhone, parentPhone2: s.parentPhone2, district: s.district, address: s.address,
          isBoarding: s.isBoarding, clubs: s.clubs, enrolledAt: s.enrolledAt, contract: contracts.get(s.id)?.status ?? 'NONE',
        })),
      });
    }
    const classNames = new Map((await classRepo.list()).map((c) => [c.id, c.name]));
    const clubs = [];
    for (const c of (await clubRepo.list()).filter((x) => x.teacherId === me.id)) {
      const members = (await studentRepo.list({ club: c.name, sort: 'name' })).filter((s) => s.status !== 'LEFT');
      clubs.push({
        id: c.id, name: c.name, monthlyFee: c.monthlyFee,
        members: members.map((s) => ({ id: s.id, fullName: fullName(s), className: s.classId ? (classNames.get(s.classId) ?? null) : null, parentName: s.parentName, parentPhone: s.parentPhone })),
      });
    }
    res.json({ subject: me.subject, isTeacher: me.isTeacher, isTutor: me.isTutor, position: me.position, classes, clubs });
  } catch (e) {
    next(e);
  }
});

const phoneRe = /^\+998\d{9}$/;
const optionalStr = z.string().trim().max(500).nullable().transform((v) => v || null);
const classStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: optionalStr,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  parentName: z.string().trim().min(1).max(120),
  parentPhone: z.string().regex(phoneRe),
  parentPhone2: z.string().regex(phoneRe).nullable(),
  address: optionalStr,
  district: optionalStr,
  isBoarding: z.boolean(),
});

/** A homeroom teacher enrols students into their own class. Fees stay 0 until management sets them. */
meRouter.post('/class/:classId/students', validateBody(classStudentSchema), async (req, res, next) => {
  try {
    const cls = await classRepo.findById(req.params.classId!);
    if (!cls) throw new ApiError(404, 'NOT_FOUND');
    if (cls.teacherId !== req.user!.id) throw new ApiError(403, 'FORBIDDEN');
    const taken = (await studentRepo.occupancy()).get(cls.id) ?? 0;
    if (taken >= cls.capacity) throw new ApiError(409, 'CLASS_FULL');
    const body = req.body as z.infer<typeof classStudentSchema>;
    const rec = await studentRepo.create({
      ...body, classId: cls.id, clubs: [], monthlyFee: 0, discountPercent: 0, status: 'ACTIVE',
      enrolledAt: new Date().toISOString().slice(0, 10), leftAt: null, notes: null,
    });
    res.status(201).json({ id: rec.id, fullName: fullName(rec) });
  } catch (e) {
    next(e);
  }
});
