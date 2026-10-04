import { toLocalDate } from '../lib/date.js';
import { dueDateFor } from '../lib/period.js';
import { settings } from '../data/mockStore.js';
import type { Student } from '../data/types.js';
import { students } from '../data/mockStudents.js';
import { chargeRepo, paymentRepo } from '../repositories/financeRepo.js';
import { chargeAmount, computeDebt, type DebtInfo } from './debt.js';

/** Creates the monthly charge for every ACTIVE student; the (student, period) uniqueness makes it idempotent. */
export async function generateMonthlyCharges(period: string): Promise<number> {
  let created = 0;
  for (const s of students) {
    if (s.status !== 'ACTIVE' || (await chargeRepo.exists(s.id, period))) continue;
    await chargeRepo.create({
      studentId: s.id, period, amount: chargeAmount(s.monthlyFee, s.discountPercent), dueDate: dueDateFor(period, settings.paymentDueDay),
    });
    created++;
  }
  return created;
}

/** Bills one student for the current month (a student enrolled mid-month would otherwise wait for the 1st). Idempotent. */
export async function generateChargeFor(s: Student, period = toLocalDate().slice(0, 7)) {
  if (s.status !== 'ACTIVE' || s.monthlyFee <= 0 || (await chargeRepo.exists(s.id, period))) return;
  await chargeRepo.create({ studentId: s.id, period, amount: chargeAmount(s.monthlyFee, s.discountPercent), dueDate: dueDateFor(period, settings.paymentDueDay) });
}

/** Debt for every student in one pass (avoids N+1 over the arrays). */
export async function debtMap(): Promise<Map<string, DebtInfo>> {
  const [charges, payments] = await Promise.all([chargeRepo.all(), paymentRepo.all()]);
  const cBy = new Map<string, typeof charges>();
  const pBy = new Map<string, typeof payments>();
  for (const c of charges) (cBy.get(c.studentId) ?? cBy.set(c.studentId, []).get(c.studentId)!).push(c);
  for (const p of payments) (pBy.get(p.studentId) ?? pBy.set(p.studentId, []).get(p.studentId)!).push(p);
  const today = toLocalDate();
  const ids = new Set([...cBy.keys(), ...pBy.keys()]);
  return new Map([...ids].map((id) => [id, computeDebt(cBy.get(id) ?? [], pBy.get(id) ?? [], today)]));
}

export async function studentDebt(studentId: string): Promise<DebtInfo> {
  const [charges, payments] = await Promise.all([chargeRepo.byStudent(studentId), paymentRepo.byStudent(studentId)]);
  return computeDebt(charges, payments, toLocalDate());
}
