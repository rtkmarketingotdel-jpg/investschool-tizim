import { addDays } from '../lib/date.js';
import { daysBetween } from '../lib/period.js';

export interface ChargeLike {
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
  /** Due date of the oldest bill not yet covered by payments. */
  oldestDueDate: string | null;
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
  if (debt <= 0) return { debt, overdueDays: 0, oldestDueDate: null, lastPaymentAt };

  let credit = totalPaid;
  const sorted = [...charges].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  for (const c of sorted) {
    if (credit >= c.amount) {
      credit -= c.amount;
      continue;
    }
    return { debt, overdueDays: Math.max(0, daysBetween(c.dueDate, today)), oldestDueDate: c.dueDate, lastPaymentAt };
  }
  return { debt, overdueDays: 0, oldestDueDate: null, lastPaymentAt };
}

export const chargeAmount = (price: number, discountPercent: number) =>
  Math.round((price * (100 - discountPercent)) / 100);

/** The course price is due `dueDays` after the group starts (or after a later enrolment). */
export const courseDueDate = (groupStart: string, enrolledAt: string, dueDays: number) =>
  addDays(enrolledAt > groupStart ? enrolledAt : groupStart, dueDays);
