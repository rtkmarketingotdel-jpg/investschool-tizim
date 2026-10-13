import { branches, users } from '../data/mockStore.js';
import { groups } from '../data/mockStudents.js';
import type { Branch } from '../data/types.js';
import { newId } from '../lib/id.js';

export const branchRepo = {
  async list() {
    return [...branches];
  },
  async findById(id: string) {
    return branches.find((b) => b.id === id) ?? null;
  },
  async create(data: Omit<Branch, 'id'>) {
    const rec: Branch = { id: newId('b'), ...data };
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
    return { users: users.filter((u) => u.branchId === id).length, groups: groups.filter((g) => g.branchId === id).length };
  },
  /** Moves all attached employees/groups to another branch (or detaches them when null). */
  moveData(fromId: string, toId: string | null) {
    users.forEach((u) => u.branchId === fromId && (u.branchId = toId));
    groups.forEach((g) => g.branchId === fromId && (g.branchId = toId));
  },
  /** Makes the attached set exactly the given employees/groups. */
  assign(id: string, userIds: string[], groupIds: string[]) {
    const uSet = new Set(userIds);
    const gSet = new Set(groupIds);
    users.forEach((u) => {
      if (uSet.has(u.id)) u.branchId = id;
      else if (u.branchId === id) u.branchId = null;
    });
    groups.forEach((g) => {
      if (gSet.has(g.id)) g.branchId = id;
      else if (g.branchId === id) g.branchId = null;
    });
  },
};
