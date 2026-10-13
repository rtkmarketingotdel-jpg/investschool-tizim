import { createHash, randomBytes } from 'node:crypto';
import { apiKeys, courseLinks } from '../data/integration.js';
import type { ApiKey, CourseLink } from '../data/types.js';
import { newId } from '../lib/id.js';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const normLabel = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export const apiKeyRepo = {
  async list() {
    return [...apiKeys].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
  /** Returns the record and the full key; the key itself is never stored. */
  async create(name: string, createdById: string | null) {
    const key = `rtk_${randomBytes(24).toString('base64url')}`;
    const rec: ApiKey = { id: newId('k'), name, prefix: key.slice(0, 10), hash: sha256(key), createdAt: new Date(), createdById, lastUsedAt: null };
    apiKeys.push(rec);
    return { rec, key };
  },
  async findByKey(key: string) {
    const hash = sha256(key);
    return apiKeys.find((k) => k.hash === hash) ?? null;
  },
  async touch(id: string) {
    const k = apiKeys.find((x) => x.id === id);
    if (k) k.lastUsedAt = new Date();
  },
  async remove(id: string) {
    const i = apiKeys.findIndex((k) => k.id === id);
    if (i < 0) return false;
    apiKeys.splice(i, 1);
    return true;
  },
};

export const courseLinkRepo = {
  async list() {
    return [...courseLinks].sort((a, b) => a.label.localeCompare(b.label));
  },
  async findByLabel(label: string) {
    const n = normLabel(label);
    return courseLinks.find((l) => normLabel(l.label) === n) ?? null;
  },
  /** Records a label the first time it is seen (unlinked), so the director can link it in Settings. */
  async ensure(label: string) {
    const found = await this.findByLabel(label);
    if (found) return found;
    const rec: CourseLink = { id: newId('cl'), label: label.trim().replace(/\s+/g, ' '), groupId: null };
    courseLinks.push(rec);
    return rec;
  },
  async setGroup(id: string, groupId: string | null) {
    const l = courseLinks.find((x) => x.id === id);
    return l ? Object.assign(l, { groupId }) : null;
  },
  async remove(id: string) {
    const i = courseLinks.findIndex((l) => l.id === id);
    if (i >= 0) courseLinks.splice(i, 1);
  },
};
