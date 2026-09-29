import { Router } from 'express';
import { z } from 'zod';
import { users } from '../data/mockStore.js';
import { classes } from '../data/mockStudents.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { audit } from '../repositories/notificationRepo.js';

export const branchesRouter = Router();
branchesRouter.use(requireAuth);

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).nullable().default(null),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().int().min(10).max(5000),
});

const present = (b: Awaited<ReturnType<typeof branchRepo.findById>> & object) => ({ ...b, usage: branchRepo.usage(b.id) });

// Any signed-in user may read branches (the check-in screen needs them); only DIRECTOR/ADMIN change them.
branchesRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ items: (await branchRepo.list()).map(present) });
  } catch (e) {
    next(e);
  }
});

branchesRouter.get('/:id/members', requireRole('DIRECTOR', 'ADMIN'), async (req, res, next) => {
  try {
    const b = await branchRepo.findById(req.params.id!);
    if (!b) throw new ApiError(404, 'NOT_FOUND');
    res.json({
      users: users.filter((u) => u.isActive).map((u) => ({ id: u.id, fullName: u.fullName, position: u.position, branchId: u.branchId })),
      classes: classes.map((c) => ({ id: c.id, name: c.name, branchId: c.branchId })),
    });
  } catch (e) {
    next(e);
  }
});

branchesRouter.post('/', requireRole('DIRECTOR', 'ADMIN'), validateBody(schema), async (req, res, next) => {
  try {
    const rec = await branchRepo.create(req.body);
    await audit(req.user!.id, 'branch.create', 'branch', rec.id, { name: rec.name });
    res.status(201).json(present(rec));
  } catch (e) {
    next(e);
  }
});

branchesRouter.patch('/:id', requireRole('DIRECTOR', 'ADMIN'), validateBody(schema), async (req, res, next) => {
  try {
    const rec = await branchRepo.update(req.params.id!, req.body);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'branch.update', 'branch', rec.id);
    res.json(present(rec));
  } catch (e) {
    next(e);
  }
});

const assignSchema = z.object({ userIds: z.array(z.string()), classIds: z.array(z.string()) });
branchesRouter.put('/:id/assign', requireRole('DIRECTOR', 'ADMIN'), validateBody(assignSchema), async (req, res, next) => {
  try {
    const b = await branchRepo.findById(req.params.id!);
    if (!b) throw new ApiError(404, 'NOT_FOUND');
    const body = req.body as z.infer<typeof assignSchema>;
    branchRepo.assign(b.id, body.userIds, body.classIds);
    await audit(req.user!.id, 'branch.assign', 'branch', b.id, { users: body.userIds.length, classes: body.classIds.length });
    res.json(present(b));
  } catch (e) {
    next(e);
  }
});

/** Deleting a branch that still has data requires ?moveTo=<other branch id> (or moveTo=none to detach). */
branchesRouter.delete('/:id', requireRole('DIRECTOR', 'ADMIN'), async (req, res, next) => {
  try {
    const b = await branchRepo.findById(req.params.id!);
    if (!b) throw new ApiError(404, 'NOT_FOUND');
    const all = await branchRepo.list();
    if (all.length <= 1) throw new ApiError(409, 'BRANCH_LAST');
    const usage = branchRepo.usage(b.id);
    if (usage.users + usage.classes > 0) {
      const moveTo = String(req.query.moveTo ?? '');
      if (!moveTo) throw new ApiError(409, 'BRANCH_HAS_DATA', usage);
      if (moveTo !== 'none') {
        if (moveTo === b.id || !(await branchRepo.findById(moveTo))) throw new ApiError(400, 'VALIDATION_ERROR');
        branchRepo.moveData(b.id, moveTo);
      } else branchRepo.moveData(b.id, null);
    }
    await branchRepo.remove(b.id);
    await audit(req.user!.id, 'branch.delete', 'branch', b.id, { name: b.name, usage });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
