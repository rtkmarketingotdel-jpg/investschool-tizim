import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationRepo } from '../repositories/notificationRepo.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const items = await notificationRepo.forUser(req.user!.id);
    res.json({ items, unread: items.filter((n) => !n.isRead).length });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/read-all', async (req, res, next) => {
  try {
    await notificationRepo.markAllRead(req.user!.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

notificationsRouter.post('/:id/read', async (req, res, next) => {
  try {
    await notificationRepo.markRead(req.user!.id, req.params.id!);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
