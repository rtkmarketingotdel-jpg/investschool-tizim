import bcrypt from 'bcryptjs';
import type { Attendance, AttendanceStatus, Role, Setting, User } from './types.js';
import { addDays, atLocal, isoWeekday, toLocalDate } from '../lib/date.js';

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
  seedUser(11, 'Qodirov Jasur Bahodirovich', 'STAFF', 'Ingliz tili oʻqituvchisi', 5_000_000),
  seedUser(12, 'Ergasheva Sevinch Ilhomovna', 'STAFF', 'Boshlangʻich sinf oʻqituvchisi', 4_800_000),
  seedUser(13, 'Nazarov Azizbek Ravshanovich', 'STAFF', 'Tarbiyachi', 3_500_000),
  seedUser(14, 'Sobirova Mohinur Qahramonovna', 'STAFF', 'Oshpaz', 3_200_000),
  seedUser(15, 'Hamidov Ulugʻbek Sodiqovich', 'STAFF', 'Qorovul', 3_000_000),
  seedUser(16, 'Raxmatova Zulfiya Baxodirovna', 'STAFF', 'Fizika oʻqituvchisi', 5_200_000),
];

export const settings: Setting = {
  schoolLat: 39.6542,
  schoolLng: 66.9597,
  radiusM: 150,
  maxGpsAccuracyM: 100,
  geoEnforced: false,
  workStart: '08:00',
  workEnd: '17:00',
  graceMinutes: 10,
  workDays: [1, 2, 3, 4, 5, 6],
  lateFinePerMinute: 2000,
  lateFineMax: 50000,
  absentFine: 100000,
  paymentDueDay: 10,
  contractPrefix: 'GS',
  telegramChatId: null,
};

// Deterministic mock history for the last 14 days (no photos: UI falls back to initials).
export const attendances: Attendance[] = [];
{
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const today = toLocalDate();
  let id = 1;
  for (let back = 14; back >= 1; back--) {
    const date = addDays(today, -back);
    if (!settings.workDays.includes(isoWeekday(date))) continue;
    for (const u of users) {
      const r = rnd();
      const base = {
        id: `a${id++}`, userId: u.id, date, lateMinutes: 0,
        checkInPhotoUrl: null, checkInLat: null, checkInLng: null, checkInAccuracy: null, checkInDistanceM: null,
        checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null, checkOutDistanceM: null,
        deviceInfo: null, note: null,
      };
      if (r < 0.05) {
        attendances.push({ ...base, status: 'ABSENT', checkInAt: null, checkOutAt: null });
        continue;
      }
      const late = r > 0.85;
      const inMin = late ? 11 + Math.floor(rnd() * 35) : Math.floor(rnd() * 12) - 6 + 5;
      const outMin = 17 * 60 + Math.floor(rnd() * 40) - 5;
      const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const status: AttendanceStatus = late ? 'LATE' : 'ON_TIME';
      attendances.push({
        ...base, status, lateMinutes: late ? inMin : 0,
        checkInAt: atLocal(date, hhmm(8 * 60 + Math.max(inMin, 0) - (late ? 0 : 10))),
        checkOutAt: atLocal(date, hhmm(outMin)),
      });
    }
  }
}
