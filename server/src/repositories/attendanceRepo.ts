import { attendances } from '../data/mockStore.js';
import type { Attendance } from '../data/types.js';

let counter = attendances.length + 1;

export const attendanceRepo = {
  async findByUserDate(userId: string, date: string) {
    return attendances.find((a) => a.userId === userId && a.date === date) ?? null;
  },
  async create(data: Omit<Attendance, 'id'>) {
    const rec: Attendance = { id: `a${counter++}`, ...data };
    attendances.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Attendance>) {
    const rec = attendances.find((a) => a.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  },
  async list(filter: { from: string; to: string; userId?: string }) {
    return attendances
      .filter(
        (a) =>
          a.date >= filter.from && a.date <= filter.to && (!filter.userId || a.userId === filter.userId),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || (b.checkInAt?.getTime() ?? 0) - (a.checkInAt?.getTime() ?? 0));
  },
};
