import { adjustments, charges, payments, payrolls } from '../data/mockFinance.js';
import type { Payment, Payroll, PayrollAdjustment, StudentCharge } from '../data/types.js';
import { newId } from '../lib/id.js';


export const chargeRepo = {
  async byStudent(studentId: string) {
    return charges.filter((c) => c.studentId === studentId);
  },
  async all() {
    return charges;
  },
  async create(data: Omit<StudentCharge, 'id' | 'createdAt'>) {
    const rec = { id: newId('ch'), createdAt: new Date(), ...data };
    charges.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<StudentCharge, 'id' | 'studentId'>>) {
    const rec = charges.find((c) => c.id === id);
    return rec ? Object.assign(rec, patch) : null;
  },
};

/** Removes every row of a deleted trainee from a list (in place, other modules hold the same array). */
const dropForStudent = <T extends { studentId: string }>(arr: T[], studentId: string) => {
  let n = 0;
  for (let k = arr.length - 1; k >= 0; k--) if (arr[k]!.studentId === studentId) { arr.splice(k, 1); n++; }
  return n;
};
export const removeStudentFinance = (studentId: string) => ({ charges: dropForStudent(charges, studentId), payments: dropForStudent(payments, studentId) });

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
    const rec = { id: newId('pay'), ...data };
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
    const rec = { id: newId('adj'), createdAt: new Date(), ...data };
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
    const rec: Payroll = { id: newId('pr'), userId, period, status: 'DRAFT', approvedAt: null, paidAt: null, ...data };
    payrolls.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Payroll>) {
    const rec = payrolls.find((p) => p.id === id);
    return rec ? Object.assign(rec, patch) : null;
  },
};
