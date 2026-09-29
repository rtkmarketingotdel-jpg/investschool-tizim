import bcrypt from 'bcryptjs';
import type { User, Role } from './types.js';

// In-memory mock data. Replaced by a real database (hosted in Uzbekistan) later;
// only the repositories depend on this file.
const hash = bcrypt.hashSync('demo1234', 10);

const seedUser = (n: number, fullName: string, role: Role, position: string, baseSalary: number): User => ({
  id: `u${n}`,
  fullName,
  phone: `+9989000000${String(n).padStart(2, '0')}`,
  passwordHash: hash,
  role,
  position,
  baseSalary,
  language: 'uz',
  isActive: true,
  hiredAt: new Date('2024-09-01'),
  createdAt: new Date('2024-09-01'),
});

export const users: User[] = [
  seedUser(1, 'Karimov Rustam Abdullayevich', 'DIRECTOR', 'Direktor', 8_000_000),
  seedUser(2, 'Yusupova Dilfuza Baxtiyorovna', 'ACCOUNTANT', 'Bosh buxgalter', 6_000_000),
  seedUser(3, 'Toshmatov Sherzod Olimovich', 'ADMIN', 'Administrator', 5_000_000),
  seedUser(10, 'Rahimova Malika Anvarovna', 'STAFF', 'Matematika oʻqituvchisi', 5_500_000),
];
