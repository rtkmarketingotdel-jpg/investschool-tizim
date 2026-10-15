import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import type { Group, GroupPlan, PlanTopic, User } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { newId } from '../lib/id.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { coursePlanRepo, groupPlanRepo } from '../repositories/planRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { lessonCapacity, scheduleTopics } from '../services/lessonPlan.js';
import { brand } from '../brand.config.js';

/** Lesson plans: a course's master plan and each group's own ordered copy with dates from the group schedule. */
export const plansRouter = Router();
plansRouter.use(requireAuth);

const isMgmt = (u: User) => u.role === 'DIRECTOR' || u.role === 'MANAGER';
/** The director/manager edit every plan; a teacher edits the plans of the groups they lead. */
const canEditGroup = (u: User, g: Group) => isMgmt(u) || g.teacherId === u.id;

const topicSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().transform((v) => v || null).default(null),
  kind: z.enum(['THEORY', 'PRACTICE']).default('THEORY'),
  lessons: z.number().int().min(1).max(20).default(1),
  materials: z.string().trim().max(500).nullable().transform((v) => v || null).default(null),
});
const topicsSchema = z.object({ topics: z.array(topicSchema).max(300) });
/** New topics get an id; kept ids keep their "taught" ticks. */
const withIds = (topics: z.infer<typeof topicSchema>[]): PlanTopic[] => topics.map((t) => ({ ...t, id: t.id ?? newId('tp') }));

async function loadGroup(id: string) {
  const g = await groupRepo.findById(id);
  if (!g) throw new ApiError(404, 'NOT_FOUND');
  return g;
}

async function presentGroupPlan(g: Group, p: GroupPlan | null) {
  const [course, teacher, branch] = await Promise.all([
    courseRepo.findById(g.courseId), g.teacherId ? userRepo.findById(g.teacherId) : null, g.branchId ? branchRepo.findById(g.branchId) : null,
  ]);
  const schedule = p ? new Map(scheduleTopics(g, p.topics).map((s) => [s.topicId, s])) : new Map();
  return {
    group: {
      id: g.id, name: g.name, status: groupStatus(g), startDate: g.startDate, endDate: g.endDate, days: g.days, timeStart: g.timeStart,
      timeEnd: g.timeEnd, room: g.room, courseId: g.courseId, courseName: course?.name ?? '—', teacherName: teacher?.fullName ?? null,
      branchName: branch?.name ?? null, lessonCapacity: lessonCapacity(g),
    },
    plan: p && {
      id: p.id, publicToken: p.publicToken, updatedAt: p.updatedAt, done: p.done,
      topics: p.topics.map((t) => ({ ...t, ...schedule.get(t.id), done: p.done.includes(t.id) })),
      lessons: p.topics.reduce((n, t) => n + t.lessons, 0),
    },
  };
}

/** Courses with their master plan size and each group's plan state (a teacher sees the courses of their groups). */
plansRouter.get('/courses', async (req, res, next) => {
  try {
    const me = req.user!;
    const [courses, groups, cps, gps] = await Promise.all([courseRepo.list(), groupRepo.list(), coursePlanRepo.all(), groupPlanRepo.all()]);
    const mine = isMgmt(me) || me.role === 'ACCOUNTANT' ? groups : groups.filter((g) => g.teacherId === me.id);
    const items = courses
      .map((c) => {
        const cg = mine.filter((g) => g.courseId === c.id);
        const tpl = cps.find((p) => p.courseId === c.id);
        return {
          id: c.id, name: c.name, durationMonths: c.durationMonths,
          templateTopics: tpl?.topics.length ?? 0, templateLessons: tpl?.topics.reduce((n, t) => n + t.lessons, 0) ?? 0,
          groups: cg.map((g) => {
            const gp = gps.find((p) => p.groupId === g.id);
            return { id: g.id, name: g.name, status: groupStatus(g), hasPlan: !!gp, topics: gp?.topics.length ?? 0, done: gp?.done.length ?? 0 };
          }),
        };
      })
      .filter((c) => isMgmt(me) || me.role === 'ACCOUNTANT' || c.groups.length > 0);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

plansRouter.get('/course/:courseId', async (req, res, next) => {
  try {
    const c = await courseRepo.findById(req.params.courseId!);
    if (!c) throw new ApiError(404, 'NOT_FOUND');
    const tpl = await coursePlanRepo.byCourse(c.id);
    res.json({ course: { id: c.id, name: c.name, durationMonths: c.durationMonths }, topics: tpl?.topics ?? [], updatedAt: tpl?.updatedAt ?? null, canEdit: isMgmt(req.user!) });
  } catch (e) {
    next(e);
  }
});

plansRouter.put('/course/:courseId', validateBody(topicsSchema), async (req, res, next) => {
  try {
    if (!isMgmt(req.user!)) throw new ApiError(403, 'FORBIDDEN');
    const c = await courseRepo.findById(req.params.courseId!);
    if (!c) throw new ApiError(404, 'NOT_FOUND');
    const rec = await coursePlanRepo.save(c.id, withIds((req.body as z.infer<typeof topicsSchema>).topics), req.user!.id);
    await audit(req.user!.id, 'plan.course.save', 'course', c.id, { topics: rec.topics.length });
    res.json({ topics: rec.topics, updatedAt: rec.updatedAt });
  } catch (e) {
    next(e);
  }
});

plansRouter.get('/group/:groupId', async (req, res, next) => {
  try {
    const g = await loadGroup(req.params.groupId!);
    const [p, tpl] = await Promise.all([groupPlanRepo.byGroup(g.id), coursePlanRepo.byCourse(g.courseId)]);
    res.json({ ...(await presentGroupPlan(g, p)), templateTopics: tpl?.topics.length ?? 0, canEdit: canEditGroup(req.user!, g) });
  } catch (e) {
    next(e);
  }
});

/** Starts the group's plan as a copy of the course plan (or empty). Topic ids are new, so the copy is independent. */
plansRouter.post('/group/:groupId', validateBody(z.object({ fromTemplate: z.boolean() })), async (req, res, next) => {
  try {
    const g = await loadGroup(req.params.groupId!);
    if (!canEditGroup(req.user!, g)) throw new ApiError(403, 'FORBIDDEN');
    if (await groupPlanRepo.byGroup(g.id)) throw new ApiError(409, 'PLAN_EXISTS');
    const tpl = (req.body as { fromTemplate: boolean }).fromTemplate ? await coursePlanRepo.byCourse(g.courseId) : null;
    const p = await groupPlanRepo.create(g.id, (tpl?.topics ?? []).map((t) => ({ ...t, id: newId('tp') })), req.user!.id);
    await audit(req.user!.id, 'plan.group.create', 'group', g.id, { topics: p.topics.length });
    res.status(201).json(await presentGroupPlan(g, p));
  } catch (e) {
    next(e);
  }
});

plansRouter.put('/group/:groupId', validateBody(topicsSchema), async (req, res, next) => {
  try {
    const g = await loadGroup(req.params.groupId!);
    if (!canEditGroup(req.user!, g)) throw new ApiError(403, 'FORBIDDEN');
    const p = await groupPlanRepo.saveTopics(g.id, withIds((req.body as z.infer<typeof topicsSchema>).topics), req.user!.id);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'plan.group.save', 'group', g.id, { topics: p.topics.length });
    res.json(await presentGroupPlan(g, p));
  } catch (e) {
    next(e);
  }
});

plansRouter.put('/group/:groupId/done', validateBody(z.object({ topicId: z.string(), done: z.boolean() })), async (req, res, next) => {
  try {
    const g = await loadGroup(req.params.groupId!);
    if (!canEditGroup(req.user!, g)) throw new ApiError(403, 'FORBIDDEN');
    const b = req.body as { topicId: string; done: boolean };
    const cur = await groupPlanRepo.byGroup(g.id);
    if (!cur || !cur.topics.some((t) => t.id === b.topicId)) throw new ApiError(404, 'NOT_FOUND');
    res.json(await presentGroupPlan(g, await groupPlanRepo.setDone(g.id, b.topicId, b.done)));
  } catch (e) {
    next(e);
  }
});

/** A new public link; the old one stops working. */
plansRouter.post('/group/:groupId/token', async (req, res, next) => {
  try {
    const g = await loadGroup(req.params.groupId!);
    if (!canEditGroup(req.user!, g)) throw new ApiError(403, 'FORBIDDEN');
    const p = await groupPlanRepo.renewToken(g.id);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'plan.group.token', 'group', g.id);
    res.json(await presentGroupPlan(g, p));
  } catch (e) {
    next(e);
  }
});

/** Public page data for /p/:token: the plan only (no trainee data), anyone with the link can open it. */
export const publicPlansRouter = Router();
publicPlansRouter.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'TOO_MANY_REQUESTS' } }));
publicPlansRouter.get('/:token', async (req, res, next) => {
  try {
    const p = await groupPlanRepo.byToken(req.params.token!);
    const g = p ? await groupRepo.findById(p.groupId) : null;
    if (!p || !g) throw new ApiError(404, 'NOT_FOUND');
    const { group, plan } = await presentGroupPlan(g, p);
    const { publicToken: _t, ...publicPlan } = plan!;
    void _t;
    res.json({ school: brand.name, group, plan: publicPlan });
  } catch (e) {
    next(e);
  }
});
