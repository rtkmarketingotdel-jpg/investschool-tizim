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

export function absentMessage(date: string, people: Array<{ name: string; position: string }>) {
  const list = people.map((p, i) => `${i + 1}. ${esc(p.name)}${p.position ? ` — ${esc(p.position)}` : ''}`).join('\n');
  return [
    `❌ <b>Kelmaganlar</b> · ${esc(uzDay(date))}`,
    LINE,
    `Jami: <b>${people.length}</b> xodim`,
    '',
    `<blockquote expandable>${list}</blockquote>`,
    '',
    footer(),
  ].join('\n');
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
