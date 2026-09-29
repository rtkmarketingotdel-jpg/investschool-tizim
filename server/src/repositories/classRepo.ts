import { classes } from '../data/mockStudents.js';
import type { SchoolClass } from '../data/types.js';

let counter = classes.length + 1;

export const classRepo = {
  async list() {
    return [...classes].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
  },
  async findById(id: string) {
    return classes.find((c) => c.id === id) ?? null;
  },
  async findByName(name: string) {
    return classes.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  },
  async create(data: Omit<SchoolClass, 'id'>) {
    const rec: SchoolClass = { id: `c${counter++}`, ...data };
    classes.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<SchoolClass, 'id'>>) {
    const rec = classes.find((c) => c.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  },
};
