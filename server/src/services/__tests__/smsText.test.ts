import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizeSms, renderVars, smsInfo, templateVars, toPhone } from '../../lib/smsText.js';

describe('normalizeSms', () => {
  it('turns Uzbek modifier apostrophes and curly quotes into plain ASCII', () => {
    expect(normalizeSms('Oʻquvchi toʻlovi — “muddati” oʻtdi')).toBe('O\'quvchi to\'lovi - "muddati" o\'tdi');
  });
});

describe('smsInfo', () => {
  it('counts Latin Uzbek text as GSM-7 (160 chars per part)', () => {
    const i = smsInfo("Hurmatli ota-ona, to'lov muddati o'tdi.");
    expect(i.encoding).toBe('GSM7');
    expect(i.segments).toBe(1);
  });
  it('keeps text with ʻ in GSM-7 because it is normalised first', () => {
    expect(smsInfo('Toʻlov oʻtdi').encoding).toBe('GSM7');
  });
  it('switches to UCS-2 (70 chars per part) for Cyrillic', () => {
    const i = smsInfo('Уважаемый родитель, срок оплаты истёк');
    expect(i.encoding).toBe('UCS2');
    expect(i.segments).toBe(1);
    expect(smsInfo('я'.repeat(71)).segments).toBe(2);
  });
  it('splits long GSM-7 text into 153-char parts', () => {
    expect(smsInfo('a'.repeat(160)).segments).toBe(1);
    expect(smsInfo('a'.repeat(161)).segments).toBe(2);
    expect(smsInfo('a'.repeat(307)).segments).toBe(3);
  });
  it('counts extension characters twice and empty text as zero', () => {
    expect(smsInfo('[' + 'a'.repeat(158)).segments).toBe(1); // "[" costs 2 -> exactly 160
    expect(smsInfo('[' + 'a'.repeat(159)).segments).toBe(2); // 161 -> two parts
    expect(smsInfo('').segments).toBe(0);
  });
});

describe('renderVars / templateVars', () => {
  it('fills known variables and reports unknown ones', () => {
    const r = renderVars('Salom {{name}}, {{oops}}', { name: 'Ali' });
    expect(r.text).toBe('Salom Ali, ');
    expect(r.unknown).toEqual(['oops']);
  });
  it('lists variables used by a template', () => {
    expect(templateVars('{{a}} x {{ b }} {{a}}')).toEqual(['a', 'b']);
  });
});

describe('phones', () => {
  it('validates and normalises Uzbek numbers', () => {
    expect(isValidPhone('+998901234567')).toBe(true);
    expect(isValidPhone('+99890123456')).toBe(false);
    expect(toPhone('90 123 45 67')).toBe('+998901234567');
    expect(toPhone('998901234567')).toBe('+998901234567');
    expect(toPhone('12345')).toBeNull();
  });
});
