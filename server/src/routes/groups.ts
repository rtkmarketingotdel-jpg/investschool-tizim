import { Router } from 'express';
import { z } from 'zod';
import type { Group } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { groupPlanRepo } from '../repositories/planRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';

export const groupsRouter = Router();
groupsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const groupSchema = z
  .object({
    name: z.string().trim().min(1).max(30),
    courseId: z.string().min(1),
    capacity: z.number().int().min(1).max(100),
    teacherId: z.string().nullable(),
    branchId: z.string().nullable().default(null),
    startDate: z.string().regex(dateRe),
    endDate: z.string().regex(dateRe),
    days: z.array(z.number().int().min(1).max(7)).min(1).max(7).transform((d) => [...new Set(d)].sort()),
    timeStart: z.string().regex(timeRe),
    timeEnd: z.string().regex(timeRe),
    room: z.string().trim().max(40).nullable().transform((v) => v || null),
  })
  .refine((g) => g.endDate > g.startDate && g.timeEnd > g.timeStart, { message: 'range' });

export async function presentGroup(g: Group) {
  const occ = await studentRepo.occupancy();
  const [teacher, course] = await Promise.all([g.teacherId ? userRepo.findById(g.teacherId) : null, courseRepo.findById(g.courseId)]);
  const taken = occ.get(g.id) ?? 0;
  const roster = (await studentRepo.list({ groupId: g.id })).filter((s) => s.status !== 'LEFT');
  return {
    ...g, status: groupStatus(g), courseName: course?.name ?? '—', studentCount: taken, freeSeats: Math.max(0, g.capacity - taken),
    teacherName: teacher?.fullName ?? null, teacherPhone: teacher?.phone ?? null, teacherPhotoUrl: teacher?.photoUrl ?? null,
    men: roster.filter((s) => s.gender === 'MALE').length, women: roster.filter((s) => s.gender === 'FEMALE').length,
    graduated: roster.filter((s) => s.status === 'GRADUATED').length,
  };
}

groupsRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ items: await Promise.all((await groupRepo.list()).map(presentGroup)) });
  } catch (e) {
    next(e);
  }
});

async function assertRefs(body: z.infer<typeof groupSchema>) {
  if (!(await courseRepo.findById(body.courseId))) throw new ApiError(400, 'VALIDATION_ERROR');
  if (!body.teacherId) return;
  const t = await userRepo.findById(body.teacherId);
  if (!t || !t.isTeacher || !t.isActive) throw new ApiError(400, 'VALIDATION_ERROR'); // only an active teacher can lead a group
}

groupsRouter.post('/', requireRole('DIRECTOR', 'MANAGER'), validateBody(groupSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof groupSchema>;
    if (await groupRepo.findByName(body.name)) throw new ApiError(409, 'GROUP_NAME_EXISTS');
    await assertRefs(body);
    const rec = await groupRepo.create(body);
    await audit(req.user!.id, 'group.create', 'group', rec.id, { name: rec.name });
    res.status(201).json(await presentGroup(rec));
  } catch (e) {
    next(e);
  }
});

groupsRouter.patch('/:id', requireRole('DIRECTOR', 'MANAGER'), validateBody(groupSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof groupSchema>;
    const clash = await groupRepo.findByName(body.name);
    if (clash && clash.id !== req.params.id) throw new ApiError(409, 'GROUP_NAME_EXISTS');
    await assertRefs(body);
    const taken = (await studentRepo.occupancy()).get(req.params.id!) ?? 0;
    if (body.capacity < taken) throw new ApiError(409, 'GROUP_CAPACITY_BELOW_OCCUPANCY');
    const current = await groupRepo.findById(req.params.id!);
    if (!current) throw new ApiError(404, 'NOT_FOUND');
    // switching the course would silently change what the enrolled trainees bought
    if (current.courseId !== body.courseId && (await studentRepo.list({ groupId: current.id })).length) throw new ApiError(409, 'GROUP_COURSE_LOCKED');
    const rec = (await groupRepo.update(current.id, body))!;
    await audit(req.user!.id, 'group.update', 'group', rec.id);
    res.json(await presentGroup(rec));
  } catch (e) {
    next(e);
  }
});

/** Only an empty group can be deleted (trainees, bills and contracts point at it). */
groupsRouter.delete('/:id', requireRole('DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const g = await groupRepo.findById(req.params.id!);
    if (!g) throw new ApiError(404, 'NOT_FOUND');
    const members = (await studentRepo.list({ groupId: g.id })).length;
    if (members) throw new ApiError(409, 'GROUP_NOT_EMPTY', { count: members });
    await groupRepo.remove(g.id);
    await groupPlanRepo.removeForGroup(g.id);
    await audit(req.user!.id, 'group.delete', 'group', g.id, { name: g.name });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
