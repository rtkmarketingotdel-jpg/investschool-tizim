import type { Attendance, PayrollAdjustment } from '../data/types.js';

export interface PayrollFigures {
  bonusTotal: number;
  fineTotal: number;
  total: number;
  workedDays: number;
  lateCount: number;
  absentCount: number;
}

/** Pure calculation: base + bonuses - fines (never below zero). */
export function computePayroll(baseSalary: number, adjustments: PayrollAdjustment[], attendance: Attendance[]): PayrollFigures {
  const bonusTotal = adjustments.filter((a) => a.type === 'BONUS').reduce((s, a) => s + a.amount, 0);
  const fineTotal = adjustments.filter((a) => a.type === 'FINE').reduce((s, a) => s + a.amount, 0);
  return {
    bonusTotal,
    fineTotal,
    total: Math.max(0, baseSalary + bonusTotal - fineTotal),
    workedDays: attendance.filter((a) => a.checkInAt).length,
    lateCount: attendance.filter((a) => a.status === 'LATE').length,
    absentCount: attendance.filter((a) => a.status === 'ABSENT').length,
  };
}

export const lateFine = (lateMinutes: number, perMinute: number, max: number) => Math.min(lateMinutes * perMinute, max);
