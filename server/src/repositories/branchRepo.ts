import { branches, users } from '../data/mockStore.js';
import { classes } from '../data/mockStudents.js';
import type { Branch } from '../data/types.js';

let counter = 1;

export const branchRepo = {
  async list() {
    return [...branches];
  },
  async findById(id: string) {
    return branches.find((b) => b.id === id) ?? null;
  },
  async create(data: Omit<Branch, 'id'>) {
    const rec: Branch = { id: `bn${counter++}`, ...data };
    branches.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<Branch, 'id'>>) {
    const rec = branches.find((b) => b.id === id);
    return rec ? Object.assign(rec, patch) : null;
  },
  async remove(id: string) {
    const i = branches.findIndex((b) => b.id === id);
    if (i >= 0) branches.splice(i, 1);
  },
  usage(id: string) {
    return { users: users.filter((u) => u.branchId === id).length, classes: classes.filter((c) => c.branchId === id).length };
  },
  /** Moves all attached employees/classes to another branch (or detaches them when null). */
  moveData(fromId: string, toId: string | null) {
    users.forEach((u) => u.branchId === fromId && (u.branchId = toId));
    classes.forEach((c) => c.branchId === fromId && (c.branchId = toId));
  },
  /** Makes the attached set exactly the given employees/classes. */
  assign(id: string, userIds: string[], classIds: string[]) {
    const uSet = new Set(userIds);
    const cSet = new Set(classIds);
    users.forEach((u) => {
      if (uSet.has(u.id)) u.branchId = id;
      else if (u.branchId === id) u.branchId = null;
    });
    classes.forEach((c) => {
      if (cSet.has(c.id)) c.branchId = id;
      else if (c.branchId === id) c.branchId = null;
    });
  },
};
