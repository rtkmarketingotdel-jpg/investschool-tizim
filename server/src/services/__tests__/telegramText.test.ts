import { describe, expect, it } from 'vitest';
import { salaryPaidMessage, uzMonth } from '../telegramText.js';

describe('salaryPaidMessage', () => {
  it('states the paid amount and month', () => {
    const m = salaryPaidMessage({ name: 'Dilnoza', period: '2026-10', total: 4_300_000, base: 4_000_000, bonus: 300_000, fine: 0 });
    expect(m).toContain('<b>2026-yil oktabr</b>');
    expect(m).toContain('<b>4 300 000 soʻm</b> oylik toʻlandi');
    expect(m).toContain('Bonus: 300 000');
    expect(m).not.toContain('Jarima');
  });
  it('skips the breakdown when there is no bonus or fine, and escapes the name', () => {
    const m = salaryPaidMessage({ name: '<Ali>', period: '2026-01', total: 1_000_000, base: 1_000_000, bonus: 0, fine: 0 });
    expect(m).not.toContain('Oklad');
    expect(m).toContain('&lt;Ali&gt;');
  });
  it('names the month', () => expect(uzMonth('2026-12')).toBe('2026-yil dekabr'));
});
