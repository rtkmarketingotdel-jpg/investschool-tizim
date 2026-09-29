import bcrypt from 'bcryptjs';
import type { Attendance, AttendanceStatus, Branch, Role, Setting, User } from './types.js';
import { addDays, atLocal, isoWeekday, localMinutes, toLocalDate } from '../lib/date.js';
import { haversineM } from '../lib/geo.js';

// In-memory mock data. Replaced by a real database (hosted in Uzbekistan) later;
// only the repositories depend on this file.
const hash = bcrypt.hashSync('demo1234', 10);

export const branches: Branch[] = [
  { id: 'b1', name: 'Asosiy filial', address: 'Samarqand shahri', lat: 39.6542, lng: 66.9597, radiusM: 150 },
  { id: 'b2', name: 'Bulungʻur filiali', address: 'Bulungʻur tumani', lat: 39.7644, lng: 67.4813, radiusM: 150 },
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
  seedUser(2, 'Yusupova Dilfuza Baxtiyorovna', 'ACCOUNTANT', 'Bosh buxgalter', 6_000_000),
  seedUser(3, 'Toshmatov Sherzod Olimovich', 'ADMIN', 'Administrator', 5_000_000),
  seedUser(10, 'Rahimova Malika Anvarovna', 'STAFF', 'Matematika oʻqituvchisi', 5_500_000),
  seedUser(11, 'Qodirov Jasur Bahodirovich', 'STAFF', 'Ingliz tili oʻqituvchisi', 5_000_000),
  seedUser(12, 'Ergasheva Sevinch Ilhomovna', 'STAFF', 'Boshlangʻich sinf oʻqituvchisi', 4_800_000),
  seedUser(13, 'Nazarov Azizbek Ravshanovich', 'STAFF', 'Tarbiyachi', 3_500_000),
  seedUser(14, 'Sobirova Mohinur Qahramonovna', 'STAFF', 'Oshpaz', 3_200_000),
  seedUser(15, 'Hamidov Ulugʻbek Sodiqovich', 'STAFF', 'Qorovul', 3_000_000),
  seedUser(16, 'Raxmatova Zulfiya Baxodirovna', 'STAFF', 'Fizika oʻqituvchisi', 5_200_000),
  seedUser(17, 'Aliyev Bekzod Nurmatovich', 'STAFF', 'Matematika repetitori', 3_000_000),
];

// Sample profile content so the director's detail page has something to show.
const sample = (id: string, patch: Partial<User>) => Object.assign(users.find((u) => u.id === id)!, patch);
sample('u17', { isTutor: true, subject: 'Matematika' });
sample('u11', { achievements: [
  { id: 'ac1', title: 'IELTS 8.0 sertifikati sohibi', year: 2023, description: 'Xalqaro ingliz tili imtihonidan yuqori natija.' },
  { id: 'ac2', title: 'Viloyat “Yil oʻqituvchisi” tanlovi finalisti', year: 2024, description: '' },
] });
sample('u12', { achievements: [
  { id: 'ac3', title: 'Respublika metodik konkursida 2-oʻrin', year: 2024, description: 'Boshlangʻich sinflar uchun interaktiv dars ishlanmasi.' },
] });
sample('u16', { achievements: [
  { id: 'ac4', title: 'Fizika olimpiadasi gʻoliblarini tayyorlagan', year: 2025, description: '3 nafar oʻquvchi viloyat bosqichida gʻolib boʻldi.' },
] });
sample('u17', { achievements: [
  { id: 'ac5', title: 'Abituriyentlarni DTM ga tayyorlash', year: 2022, description: '90+ ball olgan 12 nafar shogird.' },
] });

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
  telegramChatId: null,
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
        deviceInfo: null, note: null, branchId: u.branchId,
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
  // Today: a few employees already checked in (no check-out yet) so the live map has dots.
  if (settings.workDays.includes(isoWeekday(today)) && localMinutes(new Date()) >= 8 * 60 + 30) {
    const arrivals: Array<[string, string]> = [['u11', '07:52'], ['u12', '08:04'], ['u13', '08:21'], ['u14', '07:48'], ['u16', '08:09']];
    for (const [uid, hhmm] of arrivals) {
      const u = users.find((x) => x.id === uid)!;
      const b = branches.find((x) => x.id === u.branchId)!;
      // keep dots 40-90 m from the branch icon so the two never overlap on the map
      const spread = () => { const v = (rnd() - 0.5) * 0.002; return Math.abs(v) < 0.0004 ? (v < 0 ? -0.0004 : 0.0004) : v; };
      const lat = b.lat + spread();
      const lng = b.lng + spread();
      const [h, m] = hhmm.split(':').map(Number) as [number, number];
      const late = h * 60 + m > 8 * 60 + settings.graceMinutes;
      attendances.push({
        id: `a${id++}`, userId: u.id, date: today, status: late ? 'LATE' : 'ON_TIME', lateMinutes: late ? h * 60 + m - 8 * 60 : 0,
        checkInAt: atLocal(today, hhmm), checkInPhotoUrl: null, checkInLat: lat, checkInLng: lng, checkInAccuracy: 15,
        checkInDistanceM: haversineM(lat, lng, b.lat, b.lng), checkOutAt: null, checkOutPhotoUrl: null, checkOutLat: null,
        checkOutLng: null, checkOutDistanceM: null, deviceInfo: null, note: null, branchId: b.id,
        geoOffset: [lat - b.lat, lng - b.lng],
      });
    }
  }
}
