import { clubs } from '../data/mockAcademics.js';
import { adjustments, notifications, payrolls } from '../data/mockFinance.js';
import { attendances, users } from '../data/mockStore.js';
import { classes } from '../data/mockStudents.js';
import type { PublicUser, User } from '../data/types.js';

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash, achievements, documents, ...rest } = user;
  void passwordHash;
  void achievements;
  void documents;
  return rest;
};

let nextId = 100;

export const userRepo = {
  async findById(id: string) {
    return users.find((u) => u.id === id) ?? null;
  },
  async findByPhone(phone: string) {
    return users.find((u) => u.phone === phone) ?? null;
  },
  async list() {
    return [...users];
  },
  async create(data: Omit<User, 'id' | 'createdAt'>) {
    const rec: User = { id: `u${nextId++}`, createdAt: new Date(), ...data };
    users.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>) {
    const user = users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    return user;
  },
  /** Deletes the account together with its attendance/payroll history and frees the classes and clubs it led. */
  async remove(id: string) {
    const i = users.findIndex((u) => u.id === id);
    if (i < 0) return false;
    users.splice(i, 1);
    const drop = <T extends { userId: string }>(arr: T[]) => { for (let k = arr.length - 1; k >= 0; k--) if (arr[k]!.userId === id) arr.splice(k, 1); };
    drop(attendances); drop(adjustments); drop(payrolls); drop(notifications);
    for (const c of classes) if (c.teacherId === id) c.teacherId = null;
    for (const c of clubs) if (c.teacherId === id) c.teacherId = null;
    return true;
  },
};
