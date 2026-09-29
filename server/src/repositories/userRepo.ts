import { users } from '../data/mockStore.js';
import type { PublicUser, User } from '../data/types.js';

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash, ...rest } = user;
  void passwordHash;
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
};
