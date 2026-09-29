import { clubs, subjects } from '../data/mockAcademics.js';
import { users } from '../data/mockStore.js';
import { students } from '../data/mockStudents.js';
import type { Club, Subject } from '../data/types.js';

let counter = 1;

export const subjectRepo = {
  async list() {
    return [...subjects].sort((a, b) => a.name.localeCompare(b.name));
  },
  async findById(id: string) {
    return subjects.find((s) => s.id === id) ?? null;
  },
  async findByName(name: string) {
    return subjects.find((s) => s.name.toLowerCase() === name.toLowerCase()) ?? null;
  },
  async create(name: string) {
    const rec: Subject = { id: `sbn${counter++}`, name };
    subjects.push(rec);
    return rec;
  },
  /** Renames the subject everywhere it is used (teachers/tutors keep "<subject> oʻqituvchisi" positions in sync). */
  async rename(id: string, name: string) {
    const rec = subjects.find((s) => s.id === id);
    if (!rec) return null;
    const old = rec.name;
    for (const u of users) {
      if (u.subject !== old) continue;
      u.subject = name;
      if (u.position === `${old} oʻqituvchisi`) u.position = `${name} oʻqituvchisi`;
      if (u.position === `${old} repetitori`) u.position = `${name} repetitori`;
    }
    rec.name = name;
    return rec;
  },
  usage(name: string) {
    return users.filter((u) => u.subject === name).length;
  },
  async remove(id: string) {
    const i = subjects.findIndex((s) => s.id === id);
    if (i >= 0) subjects.splice(i, 1);
  },
};

export const clubRepo = {
  async list() {
    return [...clubs].sort((a, b) => a.name.localeCompare(b.name));
  },
  async findById(id: string) {
    return clubs.find((c) => c.id === id) ?? null;
  },
  async findByName(name: string) {
    return clubs.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;
  },
  async create(data: Omit<Club, 'id'>) {
    const rec: Club = { id: `cln${counter++}`, ...data };
    clubs.push(rec);
    return rec;
  },
  /** Renames the club in the catalog and in every student's club list. */
  async update(id: string, patch: Omit<Club, 'id'>) {
    const rec = clubs.find((c) => c.id === id);
    if (!rec) return null;
    if (rec.name !== patch.name) students.forEach((s) => (s.clubs = s.clubs.map((n) => (n === rec.name ? patch.name : n))));
    return Object.assign(rec, patch);
  },
  members(name: string) {
    return students.filter((s) => s.status !== 'LEFT' && s.clubs.includes(name)).length;
  },
  async remove(id: string) {
    const rec = clubs.find((c) => c.id === id);
    if (!rec) return;
    students.forEach((s) => (s.clubs = s.clubs.filter((n) => n !== rec.name)));
    clubs.splice(clubs.indexOf(rec), 1);
  },
};
