import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { audit } from '../repositories/notificationRepo.js';
import { toPublicUser, userRepo } from '../repositories/userRepo.js';
import { DOC_MIMES, IMAGE_MIMES, removeUpload, saveDataUrl } from '../services/files.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

const view = (u: NonNullable<Awaited<ReturnType<typeof userRepo.findById>>>) => ({
  user: toPublicUser(u),
  achievements: u.achievements,
  documents: u.documents,
});

profileRouter.get('/', (req, res) => {
  res.json(view(req.user!));
});

const achievementsSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(160),
        year: z.number().int().min(1950).max(2100).nullable(),
        description: z.string().trim().max(600).default(''),
      }),
    )
    .max(30),
});

profileRouter.put('/achievements', validateBody(achievementsSchema), async (req, res, next) => {
  try {
    const { items } = req.body as z.infer<typeof achievementsSchema>;
    const updated = await userRepo.update(req.user!.id, { achievements: items.map((i) => ({ id: randomBytes(6).toString('hex'), ...i })) });
    res.json(view(updated!));
  } catch (e) {
    next(e);
  }
});

const photoSchema = z.object({ image: z.string().min(20) });
profileRouter.post('/photo', validateBody(photoSchema), async (req, res, next) => {
  try {
    const { url } = await saveDataUrl((req.body as z.infer<typeof photoSchema>).image, IMAGE_MIMES, 2 * 1024 * 1024, `profiles/${req.user!.id}`);
    const old = req.user!.photoUrl;
    const updated = await userRepo.update(req.user!.id, { photoUrl: url });
    await removeUpload(old);
    res.json(view(updated!));
  } catch (e) {
    next(e);
  }
});

const documentSchema = z.object({
  kind: z.enum(['CERTIFICATE', 'DIPLOMA', 'OTHER']),
  title: z.string().trim().min(2).max(160),
  issuer: z.string().trim().max(160).nullable().default(null),
  year: z.number().int().min(1950).max(2100).nullable().default(null),
  file: z.string().min(20),
});

profileRouter.post('/documents', validateBody(documentSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof documentSchema>;
    if (req.user!.documents.length >= 30) throw new ApiError(400, 'FILE_LIMIT_REACHED');
    const { url, mime } = await saveDataUrl(body.file, DOC_MIMES, 5 * 1024 * 1024, `profiles/${req.user!.id}`);
    const doc = { id: randomBytes(6).toString('hex'), kind: body.kind, title: body.title, issuer: body.issuer, year: body.year, fileUrl: url, mime };
    const updated = await userRepo.update(req.user!.id, { documents: [...req.user!.documents, doc] });
    res.status(201).json(view(updated!));
  } catch (e) {
    next(e);
  }
});

profileRouter.delete('/documents/:id', async (req, res, next) => {
  try {
    const doc = req.user!.documents.find((d) => d.id === req.params.id);
    if (!doc) throw new ApiError(404, 'NOT_FOUND');
    const updated = await userRepo.update(req.user!.id, { documents: req.user!.documents.filter((d) => d.id !== doc.id) });
    await removeUpload(doc.fileUrl);
    res.json(view(updated!));
  } catch (e) {
    next(e);
  }
});

/** Finishing the first-login profile requires a photo; achievements and documents are optional. */
profileRouter.post('/complete', async (req, res, next) => {
  try {
    if (!req.user!.photoUrl) throw new ApiError(400, 'PROFILE_PHOTO_REQUIRED');
    const updated = await userRepo.update(req.user!.id, { profileCompletedAt: req.user!.profileCompletedAt ?? new Date() });
    await audit(req.user!.id, 'profile.complete', 'user', req.user!.id);
    res.json(view(updated!));
  } catch (e) {
    next(e);
  }
});
