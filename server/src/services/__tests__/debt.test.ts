import { describe, expect, it } from 'vitest';
import { chargeAmount, computeDebt } from '../debt.js';

const charges = [
  { period: '2026-07', amount: 1000, dueDate: '2026-07-10' },
  { period: '2026-08', amount: 1000, dueDate: '2026-08-10' },
  { period: '2026-09', amount: 1000, dueDate: '2026-09-10' },
];

describe('computeDebt', () => {
  it('is zero when fully paid', () => {
    const r = computeDebt(charges, [{ amount: 3000, paidAt: new Date('2026-09-01') }], '2026-09-29');
    expect(r.debt).toBe(0);
    expect(r.overdueDays).toBe(0);
    expect(r.oldestPeriod).toBeNull();
  });
  it('applies payments oldest-first to find overdue days', () => {
    const r = computeDebt(charges, [{ amount: 1500, paidAt: new Date('2026-08-05') }], '2026-09-29');
    expect(r.debt).toBe(1500);
    expect(r.oldestPeriod).toBe('2026-08'); // July paid, August half paid
    expect(r.overdueDays).toBe(50);
  });
  it('reports negative debt as an overpayment (not a debtor)', () => {
    expect(computeDebt(charges, [{ amount: 3500, paidAt: new Date() }], '2026-09-29').debt).toBe(-500);
  });
  it('is not overdue before the due date', () => {
    const r = computeDebt([charges[2]!], [], '2026-09-05');
    expect(r.debt).toBe(1000);
    expect(r.overdueDays).toBe(0);
  });
});

describe('chargeAmount', () => {
  it('applies the discount', () => {
    expect(chargeAmount(3_000_000, 10)).toBe(2_700_000);
    expect(chargeAmount(2_500_000, 0)).toBe(2_500_000);
  });
});
