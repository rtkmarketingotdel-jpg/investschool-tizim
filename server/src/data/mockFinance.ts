import { randomBytes } from 'node:crypto';
import { attendances, settings, users } from './mockStore.js';
import { groups, students } from './mockStudents.js';
import type {
  AuditLog, Contract, ContractTemplate, Notification, Payment, PaymentMethod, Payroll, PayrollAdjustment, StudentCharge,
} from './types.js';
import { TEMPLATE_RU, TEMPLATE_UZ } from './contractTemplates.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { addMonths, daysBetween } from '../lib/period.js';
import { chargeAmount, courseDueDate } from '../services/debt.js';
import { computePayroll, lateFine } from '../services/payrollCalc.js';

let seed = 99;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;
let uid = 1;
const id = (p: string) => `${p}${uid++}`;

const today = toLocalDate();
export const currentPeriod = today.slice(0, 7);
const periods = [-5, -4, -3, -2, -1, 0].map((n) => addMonths(currentPeriod, n));

export const charges: StudentCharge[] = [];
export const payments: Payment[] = [];
export const adjustments: PayrollAdjustment[] = [];
export const payrolls: Payroll[] = [];
export const contractTemplates: ContractTemplate[] = [
  { id: 't1', name: 'Kasbga oʻqitish shartnomasi (uz)', language: 'uz', body: TEMPLATE_UZ, isDefault: true },
  { id: 't2', name: 'Договор о профессиональном обучении (ru)', language: 'ru', body: TEMPLATE_RU, isDefault: true },
];
export const contracts: Contract[] = [];
export const notifications: Notification[] = [];
export const auditLogs: AuditLog[] = [];

// ---- course bills and instalments (deterministic) ----
const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CLICK', 'PAYME', 'TRANSFER'];
const accountant = users.find((u) => u.role === 'ACCOUNTANT') ?? users[0]!;
const at = (day: string) => new Date(`${day}T${String(9 + Math.floor(rnd() * 8)).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00+05:00`);

for (const s of students) {
  const g = groups.find((x) => x.id === s.groupId);
  if (!g) continue;
  const r = rnd();
  // share of the price paid so far: most pay in full (often in 2-3 parts), some still owe
  const share = s.status === 'LEFT' ? pick([0, 0.3, 0.5]) : s.status === 'GRADUATED' ? (r < 0.92 ? 1 : 0.7) : r < 0.1 ? 0 : r < 0.35 ? 0.5 : 1;
  if (s.status === 'LEFT') {
    // a drop-out's price is cut to what they used, as the manager would do when they leave
    s.coursePrice = Math.round((chargeAmount(s.coursePrice, s.discountPercent) * share) / 1000) * 1000;
    s.discountPercent = 0;
    if (!s.coursePrice) continue;
  }
  const amount = chargeAmount(s.coursePrice, s.discountPercent);
  const dueDate = courseDueDate(g.startDate, s.enrolledAt, settings.paymentDueDays);
  charges.push({ id: id('ch'), studentId: s.id, groupId: g.id, amount, dueDate, createdAt: new Date(`${s.enrolledAt}T10:00:00+05:00`) });
  const last = s.leftAt ?? (g.endDate < today ? g.endDate : today);
  const span = Math.max(0, daysBetween(s.enrolledAt, last));
  let rest = s.status === 'LEFT' ? amount : Math.round((amount * share) / 1000) * 1000;
  const parts = rest >= 2_000_000 && rnd() < 0.6 ? 3 : rest > 0 && rnd() < 0.6 ? 2 : 1;
  for (let k = 0; k < parts && rest > 0; k++) {
    const sum = k === parts - 1 ? rest : Math.round(rest / (parts - k) / 100_000) * 100_000;
    payments.push({
      id: id('pay'), studentId: s.id, amount: sum, method: pick(METHODS), paidAt: at(addDays(s.enrolledAt, Math.floor((span * k) / parts))),
      receivedById: accountant.id, note: null,
    });
    rest -= sum;
  }
}

// ---- attendance fines for the mock history ----
for (const a of attendances) {
  if (a.status === 'LATE') {
    adjustments.push({
      id: id('adj'), userId: a.userId, period: a.date.slice(0, 7), type: 'FINE', source: 'ATTENDANCE',
      amount: lateFine(a.lateMinutes, settings.lateFinePerMinute, settings.lateFineMax),
      reason: `LATE:${a.lateMinutes}`, attendanceId: a.id, createdAt: new Date(`${a.date}T09:00:00+05:00`),
    });
  } else if (a.status === 'ABSENT') {
    adjustments.push({
      id: id('adj'), userId: a.userId, period: a.date.slice(0, 7), type: 'FINE', source: 'ATTENDANCE',
      amount: settings.absentFine, reason: 'ABSENT', attendanceId: a.id, createdAt: new Date(`${a.date}T12:00:00+05:00`),
    });
  }
}

// ---- payroll: past months PAID, current month DRAFT ----
for (const p of periods) {
  const isCurrent = p === currentPeriod;
  for (const u of users) {
    if (!isCurrent) {
      if (rnd() < 0.12) adjustments.push({ id: id('adj'), userId: u.id, period: p, type: 'BONUS', source: 'MANUAL', amount: pick([200_000, 300_000, 500_000]), reason: 'Namunali ish uchun', attendanceId: null, createdAt: new Date(`${p}-25T10:00:00+05:00`) });
      if (rnd() < 0.08) adjustments.push({ id: id('adj'), userId: u.id, period: p, type: 'FINE', source: 'MANUAL', amount: pick([50_000, 100_000]), reason: 'Intizom buzilishi', attendanceId: null, createdAt: new Date(`${p}-20T10:00:00+05:00`) });
    }
    const mineAdj = adjustments.filter((a) => a.userId === u.id && a.period === p);
    const mineAtt = attendances.filter((a) => a.userId === u.id && a.date.startsWith(p));
    const fig = isCurrent
      ? computePayroll(u.baseSalary, mineAdj, mineAtt)
      : { ...computePayroll(u.baseSalary, mineAdj, []), workedDays: 24 + Math.floor(rnd() * 3), lateCount: Math.floor(rnd() * 3), absentCount: Math.floor(rnd() * 2) };
    payrolls.push({
      id: id('pr'), userId: u.id, period: p, baseSalary: u.baseSalary, ...fig,
      status: isCurrent ? 'DRAFT' : 'PAID',
      approvedAt: isCurrent ? null : new Date(`${p}-27T10:00:00+05:00`),
      paidAt: isCurrent ? null : new Date(`${p}-28T10:00:00+05:00`),
    });
  }
}

// ---- contracts ----
let seq = 1;
const prefix = settings.contractPrefix;
const year = today.slice(0, 4);
for (const s of students.filter((x) => x.status !== 'LEFT')) {
  const g = groups.find((x) => x.id === s.groupId);
  if (!g) continue;
  const r = rnd();
  const finished = s.status === 'GRADUATED';
  if (r > (finished ? 0.95 : 0.85)) continue;
  const status = finished || r < 0.7 ? 'SIGNED' : r < 0.78 ? 'SENT' : 'DRAFT';
  const language = rnd() < 0.85 ? 'uz' : 'ru';
  const createdAt = new Date(`${s.enrolledAt}T10:00:00+05:00`);
  const signedAt = new Date(createdAt.getTime() + (1 + Math.floor(rnd() * 3)) * 86_400_000);
  contracts.push({
    id: id('ct'), number: `${prefix}-${year}-${String(seq++).padStart(4, '0')}`, studentId: s.id,
    templateId: language === 'uz' ? 't1' : 't2', language, price: chargeAmount(s.coursePrice, s.discountPercent),
    startDate: g.startDate, endDate: g.endDate, status, publicToken: randomBytes(16).toString('hex'),
    otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpDemoCode: null,
    signedAt: status === 'SIGNED' ? signedAt : null, signedIp: status === 'SIGNED' ? '84.54.72.10' : null,
    signedUserAgent: status === 'SIGNED' ? 'Mozilla/5.0 (Linux; Android 13)' : null,
    signerPhone: status === 'SIGNED' ? s.phone : null, snapshot: null, createdAt,
  });
}
export const nextContractSeq = () => seq++;

// ---- notifications for management ----
for (const u of users.filter((x) => x.role !== 'TEACHER')) {
  notifications.push({
    id: id('n'), userId: u.id, title: 'notif.payrollPending.title', body: 'notif.payrollPending.body',
    params: { period: currentPeriod }, link: '/finance/payroll', isRead: false, createdAt: new Date(),
  });
}
