import { students } from '../data/mockStudents.js';
import type { Student, StudentStatus } from '../data/types.js';

let counter = students.length + 1;

export interface StudentFilter {
  q?: string;
  status?: StudentStatus;
  classId?: string;
  boarding?: boolean;
  /** exact club name from the catalog */
  club?: string;
  sort?: 'name' | 'date';
}

export const fullName = (s: Student) => `${s.lastName} ${s.firstName}${s.middleName ? ` ${s.middleName}` : ''}`;

export const studentRepo = {
  async list(f: StudentFilter) {
    const q = f.q?.trim().toLowerCase();
    const digits = q?.replace(/\D/g, '');
    const rows = students.filter((s) => {
      if (f.status && s.status !== f.status) return false;
      if (f.classId && s.classId !== f.classId) return false;
      if (f.boarding !== undefined && s.isBoarding !== f.boarding) return false;
      if (f.club && !s.clubs.includes(f.club)) return false;
      if (q) {
        const byName = fullName(s).toLowerCase().includes(q);
        const byPhone = !!digits && (s.parentPhone.includes(digits) || (s.parentPhone2 ?? '').includes(digits));
        if (!byName && !byPhone) return false;
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
  /** Seats taken per class (ACTIVE + TRIAL). */
  async occupancy() {
    const map = new Map<string, number>();
    for (const s of students) {
      if (s.classId && s.status !== 'LEFT') map.set(s.classId, (map.get(s.classId) ?? 0) + 1);
    }
    return map;
  },
  async create(data: Omit<Student, 'id'>) {
    const rec: Student = { id: `s${counter++}`, ...data };
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
