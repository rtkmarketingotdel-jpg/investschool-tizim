import { daysBetween } from '../lib/period.js';

export interface ChargeLike {
  period: string;
  amount: number;
  dueDate: string;
}
export interface PaymentLike {
  amount: number;
  paidAt: Date;
}

export interface DebtInfo {
  debt: number;
  overdueDays: number;
  oldestPeriod: string | null;
  lastPaymentAt: Date | null;
}

/**
 * The single debt formula: debt = SUM(charges) - SUM(payments).
 * Overdue days come from the oldest charge still unpaid after applying payments oldest-first.
 */
export function computeDebt(charges: ChargeLike[], payments: PaymentLike[], today: string): DebtInfo {
  const totalCharged = charges.reduce((s, c) => s + c.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const debt = totalCharged - totalPaid;
  const lastPaymentAt = payments.length ? new Date(Math.max(...payments.map((p) => p.paidAt.getTime()))) : null;
  if (debt <= 0) return { debt, overdueDays: 0, oldestPeriod: null, lastPaymentAt };

  let credit = totalPaid;
  const sorted = [...charges].sort((a, b) => a.period.localeCompare(b.period));
  for (const c of sorted) {
    if (credit >= c.amount) {
      credit -= c.amount;
      continue;
    }
    return { debt, overdueDays: Math.max(0, daysBetween(c.dueDate, today)), oldestPeriod: c.period, lastPaymentAt };
  }
  return { debt, overdueDays: 0, oldestPeriod: null, lastPaymentAt };
}

export const chargeAmount = (monthlyFee: number, discountPercent: number) =>
  Math.round((monthlyFee * (100 - discountPercent)) / 100);
