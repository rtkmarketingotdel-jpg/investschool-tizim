import { describe, expect, it } from 'vitest';
import { moneyToWords, numberToWords } from '../moneyWords.js';

describe('numberToWords uz', () => {
  it('spells common tuition amounts', () => {
    expect(numberToWords(2_000_000, 'uz')).toBe('ikki million');
    expect(numberToWords(3_500_000, 'uz')).toBe('uch million besh yuz ming');
    expect(numberToWords(1_250_000, 'uz')).toBe('bir million ikki yuz ellik ming');
    expect(numberToWords(1000, 'uz')).toBe('bir ming');
    expect(numberToWords(115, 'uz')).toBe('yuz oʻn besh');
  });
  it('handles zero and currency suffix', () => {
    expect(numberToWords(0, 'uz')).toBe('nol');
    expect(moneyToWords(4_000_000, 'uz')).toBe('toʻrt million soʻm');
  });
});

describe('numberToWords ru', () => {
  it('spells with correct gender and plural forms', () => {
    expect(numberToWords(2_000_000, 'ru')).toBe('два миллиона');
    expect(numberToWords(3_500_000, 'ru')).toBe('три миллиона пятьсот тысяч');
    expect(numberToWords(1_000, 'ru')).toBe('одна тысяча');
    expect(numberToWords(2_000, 'ru')).toBe('две тысячи');
    expect(numberToWords(5_000_000, 'ru')).toBe('пять миллионов');
    expect(numberToWords(1_021_000, 'ru')).toBe('один миллион двадцать одна тысяча');
    expect(numberToWords(11_000, 'ru')).toBe('одиннадцать тысяч');
  });
  it('rejects invalid input', () => {
    expect(() => numberToWords(-1, 'ru')).toThrow();
    expect(() => numberToWords(1.5, 'uz')).toThrow();
  });
});
