import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
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
