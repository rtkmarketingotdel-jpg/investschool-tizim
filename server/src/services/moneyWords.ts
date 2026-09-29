import type { Lang } from '../data/types.js';

const UZ_ONES = ['', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz'];
const UZ_TENS = ['', 'oʻn', 'yigirma', 'oʻttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'toʻqson'];
const UZ_SCALES = ['', 'ming', 'million', 'milliard'];

function uzTriplet(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  if (h) parts.push(h === 1 ? 'yuz' : `${UZ_ONES[h]} yuz`);
  const t = Math.floor((n % 100) / 10);
  if (t) parts.push(UZ_TENS[t]!);
  const o = n % 10;
  if (o) parts.push(UZ_ONES[o]!);
  return parts.join(' ');
}

const RU_ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const RU_ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const RU_TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const RU_TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const RU_HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
const RU_SCALES: Array<[string, string, string] | null> = [
  null,
  ['тысяча', 'тысячи', 'тысяч'],
  ['миллион', 'миллиона', 'миллионов'],
  ['миллиард', 'миллиарда', 'миллиардов'],
];

function ruPlural(n: number, forms: [string, string, string]) {
  const m100 = n % 100;
  const m10 = n % 10;
  if (m100 >= 11 && m100 <= 19) return forms[2];
  if (m10 === 1) return forms[0];
  if (m10 >= 2 && m10 <= 4) return forms[1];
  return forms[2];
}

function ruTriplet(n: number, feminine: boolean): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  if (h) parts.push(RU_HUNDREDS[h]!);
  const rest = n % 100;
  if (rest >= 10 && rest <= 19) {
    parts.push(RU_TEENS[rest - 10]!);
  } else {
    const t = Math.floor(rest / 10);
    if (t) parts.push(RU_TENS[t]!);
    const o = rest % 10;
    if (o) parts.push((feminine ? RU_ONES_F : RU_ONES_M)[o]!);
  }
  return parts.join(' ');
}

/** Spells an integer amount in words (uz or ru), without the currency. */
export function numberToWords(amount: number, lang: Lang): string {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError('amount must be a non-negative integer');
  if (amount === 0) return lang === 'uz' ? 'nol' : 'ноль';
  const triplets: number[] = [];
  for (let n = amount; n > 0; n = Math.floor(n / 1000)) triplets.push(n % 1000);
  const out: string[] = [];
  for (let i = triplets.length - 1; i >= 0; i--) {
    const t = triplets[i]!;
    if (!t) continue;
    if (lang === 'uz') {
      out.push(uzTriplet(t));
      if (UZ_SCALES[i]) out.push(UZ_SCALES[i]!);
    } else {
      out.push(ruTriplet(t, i === 1));
      const scale = RU_SCALES[i];
      if (scale) out.push(ruPlural(t, scale));
    }
  }
  return out.filter(Boolean).join(' ');
}

export const moneyToWords = (amount: number, lang: Lang) =>
  `${numberToWords(amount, lang)} ${lang === 'uz' ? 'soʻm' : 'сум'}`;
