import { settings } from '../data/mockStore.js';
import type { Payroll } from '../data/types.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { adjustmentRepo, payrollRepo } from '../repositories/financeRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { computePayroll } from './payrollCalc.js';

const monthRange = (period: string) => ({ from: `${period}-01`, to: `${period}-31` });

async function figures(userId: string, period: string, baseSalary: number) {
  const [adj, att] = await Promise.all([adjustmentRepo.forUserPeriod(userId, period), attendanceRepo.list({ ...monthRange(period), userId })]);
  return computePayroll(baseSalary, adj, att);
}

/** Recomputes a DRAFT payroll row after an adjustment changed (locked rows stay untouched). */
export async function refreshDraft(userId: string, period: string) {
  const row = await payrollRepo.find(userId, period);
  if (!row || row.status !== 'DRAFT') return row;
  return payrollRepo.update(row.id, await figures(userId, period, row.baseSalary));
}

/** Calculates payroll for all active users; APPROVED/PAID rows are skipped. */
export async function calculatePeriod(period: string): Promise<{ calculated: number; skipped: number }> {
  let calculated = 0;
  let skipped = 0;
  for (const u of await userRepo.list()) {
    if (!u.isActive) continue;
    const existing = await payrollRepo.find(u.id, period);
    if (existing && existing.status !== 'DRAFT') {
      skipped++;
      continue;
    }
    await payrollRepo.upsert(u.id, period, { baseSalary: u.baseSalary, ...(await figures(u.id, period, u.baseSalary)) });
    calculated++;
  }
  return { calculated, skipped };
}

export const isLocked = (p: Pick<Payroll, 'status'>) => p.status !== 'DRAFT';

export { settings };
