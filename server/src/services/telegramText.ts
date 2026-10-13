import { brand } from '../brand.config.js';

/** Telegram HTML messages: every dynamic value goes through esc(). */
export const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

/** "3-oktabr, shanba" from a YYYY-MM-DD date. */
export function uzDay(date: string) {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d}-${MONTHS[m - 1]}, ${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
}

const LINE = '━━━━━━━━━━━━━━';
const footer = () => `<i>${esc(brand.name)}</i>`;

export function punchCaption(p: { kind: 'in' | 'out'; name: string; position: string; time: string; date: string; place: string; late: number | null }) {
  return [
    p.kind === 'in' ? '✅ <b>Ishga keldi</b>' : '🚪 <b>Ishdan ketdi</b>',
    LINE,
    `👤 <b>${esc(p.name)}</b>`,
    p.position ? `💼 ${esc(p.position)}` : '',
    `🕒 <b>${esc(p.time)}</b> · ${esc(uzDay(p.date))}`,
    p.place ? `📍 ${esc(p.place)}` : '',
    p.kind === 'in' ? (p.late ? `⏰ Kechikdi: <b>${p.late} daqiqa</b>` : '👍 Vaqtida keldi') : '',
  ].filter(Boolean).join('\n');
}

export interface AbsentPerson {
  name: string;
  position: string;
  branch: string | null;
}

/** Absentees grouped by branch (when there is more than one), each with their position under the name. */
export function absentMessage(date: string, people: AbsentPerson[], fine = 0) {
  const groups = new Map<string, AbsentPerson[]>();
  for (const p of people) groups.set(p.branch ?? '', [...(groups.get(p.branch ?? '') ?? []), p]);
  const grouped = groups.size > 1 || (groups.size === 1 && !groups.has(''));
  let n = 0;
  const blocks = [...groups.entries()].map(([branch, list]) => {
    const rows = list.map((p) => `<b>${++n}.</b> ${esc(p.name)}${p.position ? `\n      <i>${esc(p.position)}</i>` : ''}`).join('\n');
    return grouped ? `📍 <b>${esc(branch || 'Filialsiz')}</b> · ${list.length}\n${rows}` : rows;
  });
  return [
    `❌ <b>Kelmaganlar</b> · ${esc(uzDay(date))}`,
    LINE,
    `👥 Jami: <b>${people.length}</b> xodim`,
    fine > 0 ? `💸 Har biriga jarima: <b>${esc(fine.toLocaleString('ru-RU'))} soʻm</b>` : '',
    '',
    blocks.join('\n\n'),
    '',
    footer(),
  ].filter((x, i, arr) => x !== '' || arr[i - 1] !== '').join('\n');
}

export function dailyMessage(date: string, s: { came: number; late: number; absent: number }) {
  return [
    `📊 <b>Bugungi davomat</b> · ${esc(uzDay(date))}`,
    LINE,
    `✅ Keldi: <b>${s.came}</b>`,
    `⏰ Kechikdi: <b>${s.late}</b>`,
    `❌ Kelmadi: <b>${s.absent}</b>`,
    '',
    footer(),
  ].join('\n');
}

export const contractSignedMessage = (number: string) => [`📝 <b>Shartnoma imzolandi</b>`, LINE, `Raqami: <b>${esc(number)}</b>`, '', footer()].join('\n');
export const otpMessage = (number: string, code: string) => [`🔐 <b>Tasdiqlash kodi</b>`, LINE, `Shartnoma: ${esc(number)}`, `Kod: <code>${esc(code)}</code>`, '', footer()].join('\n');
export const testMessage = () => [`✅ <b>Telegram ulandi</b>`, LINE, 'Davomat xabarlari shu chatga keladi.', '', footer()].join('\n');

const fmtSum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/** "2026-yil oktabr" from a YYYY-MM period. */
export const uzMonth = (period: string) => `${period.slice(0, 4)}-yil ${MONTHS[Number(period.slice(5, 7)) - 1]}`;

/** Sent to the employee personally when the accountant marks their salary as paid. */
export function salaryPaidMessage(p: { name: string; period: string; total: number; base: number; bonus: number; fine: number }) {
  const lines = [
    '💰 <b>Oylik toʻlandi</b>',
    LINE,
    `Hurmatli ${esc(p.name)}, sizga <b>${esc(uzMonth(p.period))}</b> oyi uchun <b>${esc(fmtSum(p.total))} soʻm</b> oylik toʻlandi.`,
  ];
  if (p.bonus || p.fine) {
    lines.push('', `Oklad: ${esc(fmtSum(p.base))} soʻm`);
    if (p.bonus) lines.push(`➕ Bonus: ${esc(fmtSum(p.bonus))} soʻm`);
    if (p.fine) lines.push(`➖ Jarima: ${esc(fmtSum(p.fine))} soʻm`);
  }
  lines.push('', footer());
  return lines.join('\n');
}

/** Reply in the employee's chat right after linking. */
export function linkedMessage(name: string) {
  return [`✅ <b>Telegram ulandi</b>`, LINE, `${esc(name)}, oylik toʻlanganda shu yerga xabar keladi.`, '', footer()].join('\n');
}
