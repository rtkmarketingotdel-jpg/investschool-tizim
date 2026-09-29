/**
 * SMS text helpers.
 * Operators bill per segment: 160 chars for GSM-7 (plain Latin), only 70 for Unicode (Cyrillic, "ʻ", curly quotes).
 * Uzbek Latin text is therefore normalised to plain ASCII apostrophes so it stays GSM-7 (cheaper, fewer parts).
 */

export function normalizeSms(text: string): string {
  return text
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim();
}

const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(''),
);
const GSM_EXT = new Set('^{}\\[~]|€'.split(''));

export interface SmsInfo {
  encoding: 'GSM7' | 'UCS2';
  length: number;
  segments: number;
}

export function smsInfo(raw: string): SmsInfo {
  const text = normalizeSms(raw);
  const gsm = [...text].every((c) => GSM_BASIC.has(c) || GSM_EXT.has(c));
  if (gsm) {
    const length = [...text].reduce((n, c) => n + (GSM_EXT.has(c) ? 2 : 1), 0);
    return { encoding: 'GSM7', length, segments: length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153) };
  }
  const length = text.length; // UTF-16 code units, which is what UCS-2 counts
  return { encoding: 'UCS2', length, segments: length === 0 ? 0 : length <= 70 ? 1 : Math.ceil(length / 67) };
}

/** Replaces {{name}} with values; reports variables that are not allowed. */
export function renderVars(template: string, values: Record<string, string>): { text: string; unknown: string[] } {
  const unknown = new Set<string>();
  const text = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => {
    if (k in values) return values[k]!;
    unknown.add(k);
    return '';
  });
  return { text, unknown: [...unknown] };
}

export const templateVars = (template: string) => [...new Set([...template.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!))];

const PHONE_RE = /^\+998\d{9}$/;
export const isValidPhone = (p: string) => PHONE_RE.test(p);
export function toPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  const full = digits.length === 9 ? `998${digits}` : digits;
  const phone = `+${full}`;
  return PHONE_RE.test(phone) ? phone : null;
}
