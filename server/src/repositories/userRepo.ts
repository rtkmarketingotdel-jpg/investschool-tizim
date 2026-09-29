import { users } from '../data/mockStore.js';
import type { PublicUser, User } from '../data/types.js';

export const toPublicUser = (user: User): PublicUser => {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
};

export const userRepo = {
  async findById(id: string) {
    return users.find((u) => u.id === id) ?? null;
  },
  async findByPhone(phone: string) {
    return users.find((u) => u.phone === phone) ?? null;
  },
  async update(id: string, patch: Partial<Pick<User, 'passwordHash' | 'language'>>) {
    const user = users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, patch);
    return user;
  },
};
