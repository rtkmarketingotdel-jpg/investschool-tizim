import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { groupRepo } from '../repositories/groupRepo.js';
import { apiKeyRepo, courseLinkRepo, normLabel } from '../repositories/integrationRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { placeWaiting } from '../services/integration.js';

/** "" from a cleared select means "not linked". */
const groupIdField = z.string().nullable().transform((v) => v || null);

/** Settings → API: the director manages integration keys and links external course labels to groups. */
export const integrationRouter = Router();
integrationRouter.use(requireAuth, requireRole('DIRECTOR'));

integrationRouter.get('/keys', async (_req, res, next) => {
  try {
    res.json({ items: (await apiKeyRepo.list()).map(({ hash, ...k }) => (void hash, k)) });
  } catch (e) {
    next(e);
  }
});

integrationRouter.post('/keys', validateBody(z.object({ name: z.string().trim().min(2).max(60) })), async (req, res, next) => {
  try {
    const { rec, key } = await apiKeyRepo.create((req.body as { name: string }).name, req.user!.id);
    await audit(req.user!.id, 'apikey.create', 'apikey', rec.id, { name: rec.name });
    const { hash, ...pub } = rec;
    void hash;
    res.status(201).json({ ...pub, key }); // the only time the full key is returned
  } catch (e) {
    next(e);
  }
});

integrationRouter.delete('/keys/:id', async (req, res, next) => {
  try {
    if (!(await apiKeyRepo.remove(req.params.id!))) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'apikey.delete', 'apikey', req.params.id!);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Course labels with their group and how many trainees still wait for that label to be linked. */
integrationRouter.get('/links', async (_req, res, next) => {
  try {
    const [links, students] = await Promise.all([courseLinkRepo.list(), studentRepo.list({})]);
    res.json({
      items: links.map((l) => ({
        ...l,
        waiting: students.filter((s) => !s.groupId && s.status === 'ACTIVE' && !!s.externalCourse && normLabel(s.externalCourse) === normLabel(l.label)).length,
      })),
    });
  } catch (e) {
    next(e);
  }
});

integrationRouter.post('/links', validateBody(z.object({ label: z.string().trim().min(2).max(120), groupId: groupIdField })), async (req, res, next) => {
  try {
    const b = req.body as { label: string; groupId: string | null };
    if (b.groupId && !(await groupRepo.findById(b.groupId))) throw new ApiError(400, 'VALIDATION_ERROR');
    if (await courseLinkRepo.findByLabel(b.label)) throw new ApiError(409, 'CATALOG_NAME_EXISTS');
    const link = await courseLinkRepo.setGroup((await courseLinkRepo.ensure(b.label)).id, b.groupId);
    res.status(201).json({ link, ...(b.groupId ? await placeWaiting(b.label) : { waiting: 0, placed: 0 }) });
  } catch (e) {
    next(e);
  }
});

/** Linking a label also places the trainees who already arrived with it. */
integrationRouter.put('/links/:id', validateBody(z.object({ groupId: groupIdField })), async (req, res, next) => {
  try {
    const { groupId } = req.body as { groupId: string | null };
    if (groupId && !(await groupRepo.findById(groupId))) throw new ApiError(400, 'VALIDATION_ERROR');
    const link = await courseLinkRepo.setGroup(req.params.id!, groupId);
    if (!link) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'courselink.set', 'courselink', link.id, { label: link.label, groupId });
    res.json({ link, ...(groupId ? await placeWaiting(link.label) : { waiting: 0, placed: 0 }) });
  } catch (e) {
    next(e);
  }
});

integrationRouter.delete('/links/:id', async (req, res, next) => {
  try {
    await courseLinkRepo.remove(req.params.id!);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
