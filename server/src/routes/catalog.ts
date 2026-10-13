import { Router } from 'express';
import { z } from 'zod';
import type { Course } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth);
const manage = requireRole('DIRECTOR', 'MANAGER');

// ---------- courses (kasb kurslari) ----------
const courseSchema = z.object({
  name: z.string().trim().min(2).max(60),
  durationMonths: z.number().int().min(1).max(36),
  price: z.number().int().min(0).max(1_000_000_000),
  description: z.string().trim().max(500).nullable().transform((v) => v || null),
});

async function presentCourse(c: Course) {
  const [users, groups] = await Promise.all([userRepo.list(), groupRepo.list()]);
  const mine = groups.filter((g) => g.courseId === c.id);
  const students = await studentRepo.list({ courseId: c.id });
  return {
    ...c,
    teachers: users
      .filter((u) => u.isActive && u.specialty === c.name)
      .map((u) => ({ id: u.id, fullName: u.fullName, photoUrl: u.photoUrl, position: u.position })),
    groups: mine.map((g) => ({ id: g.id, name: g.name, status: groupStatus(g), startDate: g.startDate, endDate: g.endDate })),
    activeStudents: students.filter((s) => s.status === 'ACTIVE').length,
    graduates: students.filter((s) => s.status === 'GRADUATED').length,
  };
}

catalogRouter.get('/courses', async (_req, res, next) => {
  try {
    res.json({ items: await Promise.all((await courseRepo.list()).map(presentCourse)) });
  } catch (e) {
    next(e);
  }
});

catalogRouter.post('/courses', manage, validateBody(courseSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof courseSchema>;
    if (await courseRepo.findByName(body.name)) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    const rec = await courseRepo.create(body);
    await audit(req.user!.id, 'course.create', 'course', rec.id, { name: rec.name });
    res.status(201).json(await presentCourse(rec));
  } catch (e) {
    next(e);
  }
});

/** A new price applies to new enrolments only: each trainee keeps the price agreed when they joined. */
catalogRouter.patch('/courses/:id', manage, validateBody(courseSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof courseSchema>;
    const clash = await courseRepo.findByName(body.name);
    if (clash && clash.id !== req.params.id) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    const rec = await courseRepo.update(req.params.id!, body);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'course.update', 'course', rec.id, { name: rec.name, price: rec.price });
    res.json(await presentCourse(rec));
  } catch (e) {
    next(e);
  }
});

catalogRouter.delete('/courses/:id', manage, async (req, res, next) => {
  try {
    const rec = await courseRepo.findById(req.params.id!);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    const used = courseRepo.usage(rec);
    if (used.groups + used.teachers > 0) throw new ApiError(409, 'CATALOG_IN_USE', used);
    await courseRepo.remove(rec.id);
    await audit(req.user!.id, 'course.delete', 'course', rec.id, { name: rec.name });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
