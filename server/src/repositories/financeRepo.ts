import { adjustments, charges, payments, payrolls } from '../data/mockFinance.js';
import type { Payment, Payroll, PayrollAdjustment, StudentCharge } from '../data/types.js';

let counter = 100_000;
const nid = (p: string) => `${p}${counter++}`;

export const chargeRepo = {
  async byStudent(studentId: string) {
    return charges.filter((c) => c.studentId === studentId);
  },
  async all() {
    return charges;
  },
  async exists(studentId: string, period: string) {
    return charges.some((c) => c.studentId === studentId && c.period === period);
  },
  async create(data: Omit<StudentCharge, 'id'>) {
    const rec = { id: nid('ch'), ...data };
    charges.push(rec);
    return rec;
  },
};

export const paymentRepo = {
  async all() {
    return payments;
  },
  async byStudent(studentId: string) {
    return payments.filter((p) => p.studentId === studentId);
  },
  async findById(id: string) {
    return payments.find((p) => p.id === id) ?? null;
  },
  async create(data: Omit<Payment, 'id'>) {
    const rec = { id: nid('pay'), ...data };
    payments.push(rec);
    return rec;
  },
};

export const adjustmentRepo = {
  async forUserPeriod(userId: string, period: string) {
    return adjustments.filter((a) => a.userId === userId && a.period === period);
  },
  async forUser(userId: string) {
    return adjustments.filter((a) => a.userId === userId);
  },
  async create(data: Omit<PayrollAdjustment, 'id' | 'createdAt'>) {
    const rec = { id: nid('adj'), createdAt: new Date(), ...data };
    adjustments.push(rec);
    return rec;
  },
  async removeByAttendance(attendanceId: string) {
    const removed: PayrollAdjustment[] = [];
    for (let i = adjustments.length - 1; i >= 0; i--) {
      if (adjustments[i]!.attendanceId === attendanceId) removed.push(...adjustments.splice(i, 1));
    }
    return removed;
  },
  async findByAttendance(attendanceId: string) {
    return adjustments.filter((a) => a.attendanceId === attendanceId);
  },
};

export const payrollRepo = {
  async byPeriod(period: string) {
    return payrolls.filter((p) => p.period === period);
  },
  async byUser(userId: string) {
    return payrolls.filter((p) => p.userId === userId).sort((a, b) => b.period.localeCompare(a.period));
  },
  async findById(id: string) {
    return payrolls.find((p) => p.id === id) ?? null;
  },
  async find(userId: string, period: string) {
    return payrolls.find((p) => p.userId === userId && p.period === period) ?? null;
  },
  async upsert(userId: string, period: string, data: Omit<Payroll, 'id' | 'userId' | 'period' | 'status' | 'approvedAt' | 'paidAt'>) {
    const existing = payrolls.find((p) => p.userId === userId && p.period === period);
    if (existing) return Object.assign(existing, data);
    const rec: Payroll = { id: nid('pr'), userId, period, status: 'DRAFT', approvedAt: null, paidAt: null, ...data };
    payrolls.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Payroll>) {
    const rec = payrolls.find((p) => p.id === id);
    return rec ? Object.assign(rec, patch) : null;
  },
};
