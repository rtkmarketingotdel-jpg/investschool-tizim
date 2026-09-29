import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { clubRepo, subjectRepo } from '../repositories/academicsRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { userRepo } from '../repositories/userRepo.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth);
const manage = requireRole('DIRECTOR', 'ADMIN');

// ---------- subjects (fanlar) ----------
const subjectSchema = z.object({ name: z.string().trim().min(2).max(60) });

catalogRouter.get('/subjects', async (_req, res, next) => {
  try {
    const users = (await userRepo.list()).filter((u) => u.isActive);
    const items = (await subjectRepo.list()).map((s) => {
      const people = users
        .filter((u) => u.subject === s.name)
        .map((u) => ({ id: u.id, fullName: u.fullName, photoUrl: u.photoUrl, position: u.position, kind: u.isTutor && !u.isTeacher ? ('tutor' as const) : ('teacher' as const) }));
      return { ...s, teachers: subjectRepo.usage(s.name), people };
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

catalogRouter.post('/subjects', manage, validateBody(subjectSchema), async (req, res, next) => {
  try {
    const { name } = req.body as z.infer<typeof subjectSchema>;
    if (await subjectRepo.findByName(name)) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    const rec = await subjectRepo.create(name);
    await audit(req.user!.id, 'subject.create', 'subject', rec.id, { name });
    res.status(201).json(rec);
  } catch (e) {
    next(e);
  }
});

catalogRouter.patch('/subjects/:id', manage, validateBody(subjectSchema), async (req, res, next) => {
  try {
    const { name } = req.body as z.infer<typeof subjectSchema>;
    const clash = await subjectRepo.findByName(name);
    if (clash && clash.id !== req.params.id) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    const rec = await subjectRepo.rename(req.params.id!, name);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'subject.rename', 'subject', rec.id, { name });
    res.json(rec);
  } catch (e) {
    next(e);
  }
});

catalogRouter.delete('/subjects/:id', manage, async (req, res, next) => {
  try {
    const rec = await subjectRepo.findById(req.params.id!);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    const used = subjectRepo.usage(rec.name);
    if (used > 0) throw new ApiError(409, 'CATALOG_IN_USE', { count: used });
    await subjectRepo.remove(rec.id);
    await audit(req.user!.id, 'subject.delete', 'subject', rec.id, { name: rec.name });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------- clubs (to'garaklar) ----------
const clubSchema = z.object({
  name: z.string().trim().min(2).max(60),
  teacherId: z.string().nullable().default(null),
  monthlyFee: z.number().int().min(0).max(50_000_000).default(0),
});

async function presentClub(c: NonNullable<Awaited<ReturnType<typeof clubRepo.findById>>>) {
  const t = c.teacherId ? await userRepo.findById(c.teacherId) : null;
  return { ...c, teacherName: t?.fullName ?? null, teacherPhotoUrl: t?.photoUrl ?? null, members: clubRepo.members(c.name) };
}

catalogRouter.get('/clubs', async (_req, res, next) => {
  try {
    res.json({ items: await Promise.all((await clubRepo.list()).map(presentClub)) });
  } catch (e) {
    next(e);
  }
});

catalogRouter.post('/clubs', manage, validateBody(clubSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof clubSchema>;
    if (await clubRepo.findByName(body.name)) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    if (body.teacherId && !(await userRepo.findById(body.teacherId))) throw new ApiError(400, 'VALIDATION_ERROR');
    const rec = await clubRepo.create(body);
    await audit(req.user!.id, 'club.create', 'club', rec.id, { name: rec.name });
    res.status(201).json(await presentClub(rec));
  } catch (e) {
    next(e);
  }
});

catalogRouter.patch('/clubs/:id', manage, validateBody(clubSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof clubSchema>;
    const clash = await clubRepo.findByName(body.name);
    if (clash && clash.id !== req.params.id) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    if (body.teacherId && !(await userRepo.findById(body.teacherId))) throw new ApiError(400, 'VALIDATION_ERROR');
    const rec = await clubRepo.update(req.params.id!, body);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'club.update', 'club', rec.id);
    res.json(await presentClub(rec));
  } catch (e) {
    next(e);
  }
});

/** Deleting a club also removes it from the students who joined it. */
catalogRouter.delete('/clubs/:id', manage, async (req, res, next) => {
  try {
    const rec = await clubRepo.findById(req.params.id!);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    const members = clubRepo.members(rec.name);
    await clubRepo.remove(rec.id);
    await audit(req.user!.id, 'club.delete', 'club', rec.id, { name: rec.name, members });
    res.json({ ok: true, members });
  } catch (e) {
    next(e);
  }
});
