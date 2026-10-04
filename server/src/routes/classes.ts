import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { classRepo } from '../repositories/classRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';

export const classesRouter = Router();
classesRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const classSchema = z.object({
  name: z.string().trim().min(1).max(20),
  grade: z.number().int().min(1).max(11),
  capacity: z.number().int().min(1).max(100),
  teacherId: z.string().nullable(),
  branchId: z.string().nullable().default(null),
});

async function withStats(c: Awaited<ReturnType<typeof classRepo.list>>[number]) {
  const occ = await studentRepo.occupancy();
  const teacher = c.teacherId ? await userRepo.findById(c.teacherId) : null;
  const taken = occ.get(c.id) ?? 0;
  const roster = (await studentRepo.list({ classId: c.id })).filter((s) => s.status !== 'LEFT');
  return {
    ...c, studentCount: taken, freeSeats: Math.max(0, c.capacity - taken),
    teacherName: teacher?.fullName ?? null, teacherPhone: teacher?.phone ?? null, teacherPhotoUrl: teacher?.photoUrl ?? null,
    boys: roster.filter((s) => s.gender === 'MALE').length, girls: roster.filter((s) => s.gender === 'FEMALE').length,
  };
}

classesRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ items: await Promise.all((await classRepo.list()).map(withStats)) });
  } catch (e) {
    next(e);
  }
});

async function assertTeacher(teacherId: string | null) {
  if (!teacherId) return;
  const t = await userRepo.findById(teacherId);
  if (!t || !t.isTeacher || !t.isActive) throw new ApiError(400, 'VALIDATION_ERROR'); // only an active teacher can lead a class
}

classesRouter.post('/', requireRole('DIRECTOR', 'MANAGER'), validateBody(classSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof classSchema>;
    if (await classRepo.findByName(body.name)) throw new ApiError(409, 'CLASS_NAME_EXISTS');
    await assertTeacher(body.teacherId);
    res.status(201).json(await withStats(await classRepo.create(body)));
  } catch (e) {
    next(e);
  }
});

classesRouter.patch('/:id', requireRole('DIRECTOR', 'MANAGER'), validateBody(classSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof classSchema>;
    const clash = await classRepo.findByName(body.name);
    if (clash && clash.id !== req.params.id) throw new ApiError(409, 'CLASS_NAME_EXISTS');
    await assertTeacher(body.teacherId);
    const taken = (await studentRepo.occupancy()).get(req.params.id!) ?? 0;
    if (body.capacity < taken) throw new ApiError(409, 'CLASS_CAPACITY_BELOW_OCCUPANCY');
    const rec = await classRepo.update(req.params.id!, body);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    res.json(await withStats(rec));
  } catch (e) {
    next(e);
  }
});
