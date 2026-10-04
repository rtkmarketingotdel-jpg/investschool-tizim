import { randomBytes } from 'node:crypto';
import { attendances, settings, users } from './mockStore.js';
import { students } from './mockStudents.js';
import type {
  AuditLog, Contract, ContractTemplate, Notification, Payment, PaymentMethod, Payroll, PayrollAdjustment, StudentCharge,
} from './types.js';
import { TEMPLATE_RU, TEMPLATE_UZ } from './contractTemplates.js';
import { toLocalDate } from '../lib/date.js';
import { addMonths, dueDateFor } from '../lib/period.js';
import { chargeAmount } from '../services/debt.js';
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
  { id: 't1', name: 'Taʼlim xizmatlari shartnomasi (uz)', language: 'uz', body: TEMPLATE_UZ, isDefault: true },
  { id: 't2', name: 'Договор об образовательных услугах (ru)', language: 'ru', body: TEMPLATE_RU, isDefault: true },
];
export const contracts: Contract[] = [];
export const notifications: Notification[] = [];
export const auditLogs: AuditLog[] = [];

// ---- charges and payments (deterministic; enrolment spread gives a growth trend) ----
const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CLICK', 'PAYME', 'TRANSFER'];
const startWeights = [0.55, 0.67, 0.77, 0.85, 0.93, 1];
const accountant = users.find((u) => u.role === 'MANAGER') ?? users[0]!;

for (const s of students.filter((x) => x.status === 'ACTIVE')) {
  const r0 = rnd();
  const start = startWeights.findIndex((w) => r0 <= w);
  const mine = periods.slice(start);
  const amount = chargeAmount(s.monthlyFee, s.discountPercent);
  for (const p of mine) {
    charges.push({ id: id('ch'), studentId: s.id, period: p, amount, dueDate: dueDateFor(p, settings.paymentDueDay) });
  }
  const r = rnd();
  const unpaidMonths = r < 0.08 ? 1 + Math.floor(rnd() * 3) : 0;
  const partial = r >= 0.08 && r < 0.2;
  mine.forEach((p, i) => {
    const fromEnd = mine.length - 1 - i;
    if (fromEnd < unpaidMonths) return;
    const isLast = fromEnd === 0;
    const day = Math.min(1 + Math.floor(rnd() * 10), Number(today.slice(8)));
    payments.push({
      id: id('pay'), studentId: s.id, amount: partial && isLast ? Math.round(amount / 2 / 1000) * 1000 : amount,
      method: pick(METHODS), period: p, paidAt: new Date(`${p}-${String(day).padStart(2, '0')}T10:00:00+05:00`),
      receivedById: accountant.id, note: null,
    });
  });
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
for (const s of students.filter((x) => x.status === 'ACTIVE')) {
  const r = rnd();
  if (r > 0.82) continue;
  const status = r < 0.7 ? 'SIGNED' : r < 0.78 ? 'SENT' : 'DRAFT';
  const language = rnd() < 0.85 ? 'uz' : 'ru';
  const signedAt = new Date(`2026-0${8 + Math.floor(rnd() * 2)}-${String(1 + Math.floor(rnd() * 27)).padStart(2, '0')}T11:00:00+05:00`);
  contracts.push({
    id: id('ct'), number: `${prefix}-${year}-${String(seq++).padStart(4, '0')}`, studentId: s.id,
    templateId: language === 'uz' ? 't1' : 't2', language, monthlyFee: chargeAmount(s.monthlyFee, s.discountPercent),
    startDate: '2026-09-01', endDate: '2027-05-31', status, publicToken: randomBytes(16).toString('hex'),
    otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpDemoCode: null,
    signedAt: status === 'SIGNED' ? signedAt : null, signedIp: status === 'SIGNED' ? '84.54.72.10' : null,
    signedUserAgent: status === 'SIGNED' ? 'Mozilla/5.0 (Linux; Android 13)' : null,
    signerPhone: status === 'SIGNED' ? s.parentPhone : null, snapshot: null, createdAt: new Date('2026-08-20T10:00:00+05:00'),
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
