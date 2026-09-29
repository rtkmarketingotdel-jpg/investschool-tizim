import { auditLogs, notifications } from '../data/mockFinance.js';
import type { Role } from '../data/types.js';
import { userRepo } from './userRepo.js';

let counter = 1;

export const notificationRepo = {
  async forUser(userId: string) {
    return notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);
  },
  async markRead(userId: string, id: string) {
    const n = notifications.find((x) => x.id === id && x.userId === userId);
    if (n) n.isRead = true;
  },
  async markAllRead(userId: string) {
    notifications.forEach((n) => n.userId === userId && (n.isRead = true));
  },
};

/** Creates a notification for every active user with one of the given roles. */
export async function notifyRoles(
  roles: Role[],
  key: string,
  params: Record<string, string | number> | null,
  link: string | null,
) {
  for (const u of await userRepo.list()) {
    if (!u.isActive || !roles.includes(u.role)) continue;
    notifications.push({
      id: `nn${counter++}`, userId: u.id, title: `${key}.title`, body: `${key}.body`, params, link, isRead: false, createdAt: new Date(),
    });
  }
}

export async function audit(userId: string | null, action: string, entity: string, entityId: string | null, meta: Record<string, unknown> | null = null) {
  auditLogs.push({ id: `au${counter++}`, userId, action, entity, entityId, meta, createdAt: new Date() });
}
