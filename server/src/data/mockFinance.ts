import { randomBytes } from 'node:crypto';
import { attendances, settings } from './mockStore.js';
import { groups, students } from './mockStudents.js';
import type {
  AuditLog, Contract, ContractTemplate, Notification, Payment, Payroll, PayrollAdjustment, StudentCharge,
} from './types.js';
import { TEMPLATE_UZ } from './contractTemplates.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { chargeAmount, courseDueDate } from '../services/debt.js';
import { computePayroll } from '../services/payrollCalc.js';

// One example of each finance record, built from the single demo trainee and teacher.
const today = toLocalDate();
export const currentPeriod = today.slice(0, 7);
const student = students[0]!;
const group = groups[0]!;
const price = chargeAmount(student.coursePrice, student.discountPercent);

/** The course bill, half of it paid so far: the trainee shows up as a debtor once the due date passes. */
export const charges: StudentCharge[] = [
  {
    id: 'ch1', studentId: student.id, groupId: group.id, amount: price,
    dueDate: courseDueDate(group.startDate, student.enrolledAt, settings.paymentDueDays),
    createdAt: new Date(`${student.enrolledAt}T10:00:00+05:00`),
  },
];
export const payments: Payment[] = [
  {
    id: 'pay1', studentId: student.id, amount: price / 2, method: 'CASH',
    // a few days ago, so it shows in the default 30-day payments view and this month's revenue
    paidAt: new Date(`${addDays(today, -3)}T11:00:00+05:00`), receivedById: 'u1', note: null,
  },
];

export const adjustments: PayrollAdjustment[] = [
  {
    id: 'adj1', userId: 'u2', period: currentPeriod, type: 'BONUS', source: 'MANUAL', amount: 300_000,
    reason: 'Namunali ish uchun', attendanceId: null, createdAt: new Date(),
  },
];

const teacherSalary = 4_000_000;
export const payrolls: Payroll[] = [
  {
    id: 'pr1', userId: 'u2', period: currentPeriod, baseSalary: teacherSalary,
    ...computePayroll(teacherSalary, adjustments, attendances.filter((a) => a.date.startsWith(currentPeriod))),
    status: 'DRAFT', approvedAt: null, paidAt: null,
  },
];

export const contractTemplates: ContractTemplate[] = [
  { id: 't1', name: 'Kasbga oʻqitish shartnomasi (uz)', language: 'uz', body: TEMPLATE_UZ, isDefault: true },
];

let seq = 1;
export const contracts: Contract[] = [
  {
    id: 'ct1', number: `${settings.contractPrefix}-${today.slice(0, 4)}-${String(seq++).padStart(4, '0')}`, studentId: student.id,
    templateId: 't1', language: 'uz', price, startDate: group.startDate, endDate: group.endDate, status: 'SIGNED',
    publicToken: randomBytes(16).toString('hex'), otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpDemoCode: null,
    signedAt: new Date(`${student.enrolledAt}T12:00:00+05:00`), signedIp: '84.54.72.10', signedUserAgent: 'Mozilla/5.0 (Linux; Android 13)',
    signerPhone: student.phone, snapshot: null, createdAt: new Date(`${student.enrolledAt}T10:00:00+05:00`),
  },
];
export const nextContractSeq = () => seq++;

export const notifications: Notification[] = [
  {
    id: 'n1', userId: 'u1', title: 'notif.payrollPending.title', body: 'notif.payrollPending.body',
    params: { period: currentPeriod }, link: '/finance/payroll', isRead: false, createdAt: new Date(),
  },
];
export const auditLogs: AuditLog[] = [];
