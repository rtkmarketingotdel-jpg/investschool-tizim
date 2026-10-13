import { describe, expect, it } from 'vitest';
import { chargeAmount, computeDebt } from '../debt.js';

const charges = [
  { amount: 1000, dueDate: '2026-07-10' },
  { amount: 1000, dueDate: '2026-08-10' },
  { amount: 1000, dueDate: '2026-09-10' },
];

describe('computeDebt', () => {
  it('is zero when fully paid', () => {
    const r = computeDebt(charges, [{ amount: 3000, paidAt: new Date('2026-09-01') }], '2026-09-29');
    expect(r.debt).toBe(0);
    expect(r.overdueDays).toBe(0);
    expect(r.oldestDueDate).toBeNull();
  });
  it('applies payments oldest-first to find overdue days', () => {
    const r = computeDebt(charges, [{ amount: 1500, paidAt: new Date('2026-08-05') }], '2026-09-29');
    expect(r.debt).toBe(1500);
    expect(r.oldestDueDate).toBe('2026-08-10'); // first bill paid, second half paid
    expect(r.overdueDays).toBe(50);
  });
  it('reports negative debt as an overpayment (not a debtor)', () => {
    expect(computeDebt(charges, [{ amount: 3500, paidAt: new Date() }], '2026-09-29').debt).toBe(-500);
  });
  it('treats a single course bill paid in instalments', () => {
    const bill = [{ amount: 3_000_000, dueDate: '2026-09-15' }];
    const paid = [{ amount: 1_000_000, paidAt: new Date('2026-08-20') }, { amount: 500_000, paidAt: new Date('2026-09-10') }];
    const r = computeDebt(bill, paid, '2026-09-25');
    expect(r.debt).toBe(1_500_000);
    expect(r.overdueDays).toBe(10);
    expect(r.lastPaymentAt?.toISOString().slice(0, 10)).toBe('2026-09-10');
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
