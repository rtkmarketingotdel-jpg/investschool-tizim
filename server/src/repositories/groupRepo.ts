import { groups } from '../data/mockStudents.js';
import type { Group, GroupStatus } from '../data/types.js';
import { toLocalDate } from '../lib/date.js';
import { newId } from '../lib/id.js';

export const groupStatus = (g: Pick<Group, 'startDate' | 'endDate'>, today = toLocalDate()): GroupStatus =>
  today < g.startDate ? 'PLANNED' : today > g.endDate ? 'FINISHED' : 'ACTIVE';

export const groupRepo = {
  /** Newest first: running and upcoming groups before finished ones. */
  async list() {
    return [...groups].sort((a, b) => b.startDate.localeCompare(a.startDate) || a.name.localeCompare(b.name));
  },
  async findById(id: string) {
    return groups.find((g) => g.id === id) ?? null;
  },
  async findByName(name: string) {
    return groups.find((g) => g.name.toLowerCase() === name.toLowerCase()) ?? null;
  },
  async create(data: Omit<Group, 'id'>) {
    const rec: Group = { id: newId('g'), ...data };
    groups.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<Group, 'id'>>) {
    const rec = groups.find((g) => g.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  },
  async remove(id: string) {
    const i = groups.findIndex((g) => g.id === id);
    if (i >= 0) groups.splice(i, 1);
  },
};
