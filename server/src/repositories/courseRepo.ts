import { users } from '../data/mockStore.js';
import { courses, groups } from '../data/mockStudents.js';
import type { Course } from '../data/types.js';
import { newId } from '../lib/id.js';

export const courseRepo = {
  async list() {
    return [...courses].sort((a, b) => a.name.localeCompare(b.name));
  },
  async findById(id: string) {
    return courses.find((c) => c.id === id) ?? null;
  },
  async findByName(name: string) {
    return courses.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  },
  async create(data: Omit<Course, 'id'>) {
    const rec: Course = { id: newId('cr'), ...data };
    courses.push(rec);
    return rec;
  },
  /** A rename follows the teachers too (their "<course> oʻqituvchisi" positions stay in sync). */
  async update(id: string, patch: Omit<Course, 'id'>) {
    const rec = courses.find((c) => c.id === id);
    if (!rec) return null;
    const old = rec.name;
    if (old !== patch.name) {
      for (const u of users) {
        if (u.specialty !== old) continue;
        u.specialty = patch.name;
        if (u.position === `${old} oʻqituvchisi`) u.position = `${patch.name} oʻqituvchisi`;
      }
    }
    return Object.assign(rec, patch);
  },
  /** Teachers with this specialty and groups of this course (a course in use cannot be deleted). */
  usage(c: Course) {
    return {
      teachers: users.filter((u) => u.specialty === c.name).length,
      groups: groups.filter((g) => g.courseId === c.id).length,
    };
  },
  async remove(id: string) {
    const i = courses.findIndex((c) => c.id === id);
    if (i >= 0) courses.splice(i, 1);
  },
};
