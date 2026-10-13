import bcrypt from 'bcryptjs';
import type { Attendance, Branch, Role, Setting, User } from './types.js';
import { addDays, atLocal, isoWeekday, toLocalDate } from '../lib/date.js';

// In-memory mock data. Replaced by a real database (hosted in Uzbekistan) later;
// only the repositories depend on this file.
const hash = bcrypt.hashSync('demo1234', 10);

export const branches: Branch[] = [
  { id: 'b1', name: 'Asosiy filial', address: 'Samarqand shahri', lat: 39.6542, lng: 66.9597, radiusM: 200 },
];

const seedUser = (n: number, fullName: string, role: Role, position: string, baseSalary: number): User => ({
  id: `u${n}`,
  fullName,
  phone: `+9989000000${String(n).padStart(2, '0')}`,
  passwordHash: hash,
  role,
  position,
  isTeacher: position.includes('oʻqituvchisi'),
  photoUrl: null,
  achievements: [],
  documents: [],
  profileCompletedAt: new Date('2026-09-01'),
  specialty: position.includes('oʻqituvchisi') ? position.replace(' oʻqituvchisi', '') : null,
  branchId: 'b1',
  telegramChatId: null,
  baseSalary,
  language: 'uz',
  isActive: true,
  hiredAt: new Date('2026-09-01'),
  createdAt: new Date('2026-09-01'),
});

// One example of each kind of record: the director (signs in) and one teacher.
export const users: User[] = [
  seedUser(1, 'Karimov Rustam Abdullayevich', 'DIRECTOR', 'Direktor', 8_000_000),
  seedUser(2, 'Yusupova Dilnoza Akmalovna', 'TEACHER', 'Tikuvchilik oʻqituvchisi', 4_000_000),
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
  paymentDueDays: 30,
  contractPrefix: 'RTK',
  // env default: the settings live in memory (until the real database), so a chat id set in the UI is lost on restart
  telegramChatId: process.env.TELEGRAM_CHAT_ID || null,
  smsDebtAutoEnabled: false,
  smsDebtEveryDays: 7,
  smsDebtMinOverdueDays: 3,
  smsDebtTemplateId: 'st1',
};

// One attendance record: the teacher came in on time on the last working day.
export const attendances: Attendance[] = [];
{
  let date = addDays(toLocalDate(), -1);
  while (!settings.workDays.includes(isoWeekday(date))) date = addDays(date, -1);
  attendances.push({
    id: 'a1', userId: 'u2', date, status: 'ON_TIME', lateMinutes: 0,
    checkInAt: atLocal(date, '07:55'), checkInPhotoUrl: null, checkInLat: null, checkInLng: null, checkInAccuracy: null, checkInDistanceM: null,
    checkOutAt: atLocal(date, '17:05'), checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null, checkOutDistanceM: null,
    deviceInfo: null, note: null, branchId: 'b1', selfieSent: true, selfieOutSent: true,
  });
}
