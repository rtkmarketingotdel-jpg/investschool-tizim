import { groups, students } from '../data/mockStudents.js';
import type { Student, StudentStatus } from '../data/types.js';
import { newId } from '../lib/id.js';

export interface StudentFilter {
  q?: string;
  status?: StudentStatus;
  groupId?: string;
  /** any group of this course */
  courseId?: string;
  sort?: 'name' | 'date';
}

export const fullName = (s: Student) => `${s.lastName} ${s.firstName}${s.middleName ? ` ${s.middleName}` : ''}`;

export const studentRepo = {
  async list(f: StudentFilter) {
    const q = f.q?.trim().toLowerCase();
    const digits = q?.replace(/\D/g, '');
    const ofCourse = f.courseId ? new Set(groups.filter((g) => g.courseId === f.courseId).map((g) => g.id)) : null;
    const rows = students.filter((s) => {
      if (f.status && s.status !== f.status) return false;
      if (f.groupId && s.groupId !== f.groupId) return false;
      if (ofCourse && !(s.groupId && ofCourse.has(s.groupId))) return false;
      if (q) {
        const byName = fullName(s).toLowerCase().includes(q);
        const byPhone = !!digits && (s.phone.includes(digits) || (s.phone2 ?? '').includes(digits));
        const byDoc = !!s.passport && s.passport.toLowerCase().includes(q.replace(/\s/g, ''));
        if (!byName && !byPhone && !byDoc) return false;
      }
      return true;
    });
    rows.sort(
      f.sort === 'date'
        ? (a, b) => b.enrolledAt.localeCompare(a.enrolledAt)
        : (a, b) => fullName(a).localeCompare(fullName(b)),
    );
    return rows;
  },
  async findById(id: string) {
    return students.find((s) => s.id === id) ?? null;
  },
  /** Seats taken per group (everyone who did not leave, graduates included). */
  async occupancy() {
    const map = new Map<string, number>();
    for (const s of students) {
      if (s.groupId && s.status !== 'LEFT') map.set(s.groupId, (map.get(s.groupId) ?? 0) + 1);
    }
    return map;
  },
  async create(data: Omit<Student, 'id'>) {
    const rec: Student = { id: newId('s'), ...data };
    students.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<Student, 'id'>>) {
    const rec = students.find((s) => s.id === id);
    if (!rec) return null;
    Object.assign(rec, patch);
    return rec;
  },
};
