import { Router } from 'express';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { env } from '../env.js';
import { audit } from '../repositories/notificationRepo.js';
import { findTelegramChats, sendTelegram } from '../services/telegram.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole('DIRECTOR', 'ADMIN'));

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const patchSchema = z
  .object({
    maxGpsAccuracyM: z.number().int().min(10).max(1000),
    geoEnforced: z.boolean(),
    workStart: hhmm,
    workEnd: hhmm,
    graceMinutes: z.number().int().min(0).max(120),
    workDays: z.array(z.number().int().min(1).max(7)).min(1),
    lateFinePerMinute: z.number().int().min(0),
    lateFineMax: z.number().int().min(0),
    absentFine: z.number().int().min(0),
    paymentDueDay: z.number().int().min(1).max(28),
    contractPrefix: z.string().trim().regex(/^[A-Za-z0-9]{1,6}$/),
    telegramChatId: z.string().trim().max(64).nullable(),
    smsDebtAutoEnabled: z.boolean(),
    smsDebtEveryDays: z.number().int().min(1).max(60),
    smsDebtMinOverdueDays: z.number().int().min(0).max(120),
    smsDebtTemplateId: z.string().nullable(),
  })
  .partial();

/** ADMIN may only change where the school is (needed to set up the check-in radius). */
const ADMIN_FIELDS = new Set(['maxGpsAccuracyM', 'geoEnforced']);

settingsRouter.get('/', (_req, res) => {
  res.json({ settings });
});

settingsRouter.put('/', validateBody(patchSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof patchSchema>;
    if (req.user!.role !== 'DIRECTOR' && Object.keys(body).some((k) => !ADMIN_FIELDS.has(k))) throw new ApiError(403, 'FORBIDDEN');
    if (body.workStart && body.workEnd && body.workStart >= body.workEnd) throw new ApiError(400, 'VALIDATION_ERROR');
    Object.assign(settings, body);
    await audit(req.user!.id, 'settings.update', 'settings', 'main', { fields: Object.keys(body) });
    res.json({ settings });
  } catch (e) {
    next(e);
  }
});

settingsRouter.get('/telegram/chats', requireRole('DIRECTOR'), async (_req, res, next) => {
  try {
    if (!env.telegramToken) throw new ApiError(400, 'TELEGRAM_NOT_CONFIGURED');
    res.json({ items: await findTelegramChats() });
  } catch (e) {
    next(e);
  }
});

settingsRouter.post('/telegram/test', requireRole('DIRECTOR'), async (_req, res, next) => {
  try {
    const ok = await sendTelegram('✅ Test xabar / Тестовое сообщение');
    if (!ok) throw new ApiError(400, 'TELEGRAM_NOT_CONFIGURED');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
