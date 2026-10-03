import bcrypt from 'bcryptjs';
import type { Attendance, AttendanceStatus, Branch, Role, Setting, User } from './types.js';
import { addDays, atLocal, isoWeekday, localMinutes, toLocalDate } from '../lib/date.js';
import { haversineM } from '../lib/geo.js';

// In-memory mock data. Replaced by a real database (hosted in Uzbekistan) later;
// only the repositories depend on this file.
const hash = bcrypt.hashSync('demo1234', 10);

export const branches: Branch[] = [
  { id: 'b1', name: 'Asosiy filial', address: 'Samarqand shahri', lat: 39.6542, lng: 66.9597, radiusM: 200 },
  { id: 'b2', name: 'Bulungʻur filiali', address: 'Bulungʻur tumani', lat: 39.7644, lng: 67.4813, radiusM: 200 },
];
const SECOND_BRANCH_USERS = new Set([13, 14, 15]);

const seedUser = (n: number, fullName: string, role: Role, position: string, baseSalary: number): User => ({
  id: `u${n}`,
  fullName,
  phone: `+9989000000${String(n).padStart(2, '0')}`,
  passwordHash: hash,
  role,
  position,
  isTeacher: position.includes('oʻqituvchisi'),
  isTutor: false,
  photoUrl: null,
  achievements: [],
  documents: [],
  profileCompletedAt: n >= 11 ? new Date('2025-09-05') : null,
  subject: position.includes('oʻqituvchisi') ? position.replace(' oʻqituvchisi', '') : null,
  branchId: SECOND_BRANCH_USERS.has(n) ? 'b2' : 'b1',
  baseSalary,
  language: 'uz',
  isActive: true,
  hiredAt: new Date('2024-09-01'),
  createdAt: new Date('2024-09-01'),
});

export const users: User[] = [
  seedUser(1, 'Karimov Rustam Abdullayevich', 'DIRECTOR', 'Direktor', 8_000_000),
];

export const settings: Setting = {
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
  // env default: the settings live in memory (until the real database), so a chat id set in the UI is lost on restart
  telegramChatId: process.env.TELEGRAM_CHAT_ID || null,
  smsDebtAutoEnabled: false,
  smsDebtEveryDays: 7,
  smsDebtMinOverdueDays: 3,
  smsDebtTemplateId: 'st1',
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
      if (u.role === 'DIRECTOR') continue; // the director is not tracked
      const r = rnd();
      const base = {
        id: `a${id++}`, userId: u.id, date, lateMinutes: 0,
        checkInPhotoUrl: null, checkInLat: null, checkInLng: null, checkInAccuracy: null, checkInDistanceM: null,
        checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null, checkOutDistanceM: null,
        deviceInfo: null, note: null, branchId: u.branchId, selfieSent: true, selfieOutSent: true,
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
