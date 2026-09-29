import { describe, expect, it } from 'vitest';
import type { Attendance, PayrollAdjustment } from '../../data/types.js';
import { computePayroll, lateFine } from '../payrollCalc.js';

const adj = (type: 'BONUS' | 'FINE', amount: number) =>
  ({ type, amount, source: 'MANUAL' }) as unknown as PayrollAdjustment;
const att = (status: Attendance['status'], came: boolean) =>
  ({ status, checkInAt: came ? new Date() : null }) as unknown as Attendance;

describe('computePayroll', () => {
  it('adds bonuses and subtracts fines', () => {
    const r = computePayroll(5_000_000, [adj('BONUS', 300_000), adj('FINE', 50_000), adj('FINE', 20_000)], [
      att('ON_TIME', true), att('LATE', true), att('ABSENT', false),
    ]);
    expect(r).toMatchObject({ bonusTotal: 300_000, fineTotal: 70_000, total: 5_230_000, workedDays: 2, lateCount: 1, absentCount: 1 });
  });
  it('never goes below zero', () => {
    expect(computePayroll(100_000, [adj('FINE', 500_000)], []).total).toBe(0);
  });
});

describe('lateFine', () => {
  it('is capped per day', () => {
    expect(lateFine(10, 2000, 50_000)).toBe(20_000);
    expect(lateFine(60, 2000, 50_000)).toBe(50_000);
  });
});
