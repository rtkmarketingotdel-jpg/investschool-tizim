import { toLocalDate } from '../lib/date.js';
import { settings } from '../data/mockStore.js';
import type { Student } from '../data/types.js';
import { chargeRepo, paymentRepo } from '../repositories/financeRepo.js';
import { groupRepo } from '../repositories/groupRepo.js';
import { chargeAmount, computeDebt, courseDueDate, type DebtInfo } from './debt.js';

/**
 * Keeps the single course bill in line with the student: it is created once the student is ACTIVE in a group,
 * and afterwards its amount follows the agreed price and discount (also after leaving, so a refund or
 * a reduced price for a drop-out is entered by editing the price). Idempotent.
 */
export async function syncCourseCharge(s: Student) {
  const [existing] = await chargeRepo.byStudent(s.id);
  const amount = chargeAmount(s.coursePrice, s.discountPercent);
  const group = s.groupId ? await groupRepo.findById(s.groupId) : null;
  if (existing) {
    await chargeRepo.update(existing.id, {
      amount,
      groupId: group?.id ?? existing.groupId,
      dueDate: group ? courseDueDate(group.startDate, s.enrolledAt, settings.paymentDueDays) : existing.dueDate,
    });
    return;
  }
  if (s.status !== 'ACTIVE' || !group || amount <= 0) return;
  await chargeRepo.create({ studentId: s.id, groupId: group.id, amount, dueDate: courseDueDate(group.startDate, s.enrolledAt, settings.paymentDueDays) });
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
