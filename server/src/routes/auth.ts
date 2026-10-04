import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { toPublicUser, userRepo } from '../repositories/userRepo.js';

export const authRouter = Router();

// only failed attempts count (a shared school network must not lock out correct logins); a second limiter keys on the phone number
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AUTH_TOO_MANY_ATTEMPTS' },
});

const phoneLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  skipSuccessfulRequests: true,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req) => String((req.body as { phone?: string } | undefined)?.phone ?? 'none'),
  message: { error: 'AUTH_TOO_MANY_ATTEMPTS' },
});

const loginSchema = z.object({
  phone: z.string().regex(/^\+998\d{9}$/),
  password: z.string().min(1),
});

authRouter.post('/login', loginLimiter, phoneLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { phone, password } = req.body as z.infer<typeof loginSchema>;
    const user = await userRepo.findByPhone(phone);
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok || !user.isActive) throw new ApiError(401, 'AUTH_INVALID_CREDENTIALS');
    res.json({ token: signToken({ sub: user.id, role: user.role }), user: toPublicUser(user) });
  } catch (e) {
    next(e);
  }
});
