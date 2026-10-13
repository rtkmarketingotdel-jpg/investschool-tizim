import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces.js';
import { brand } from '../brand.config.js';
import type { Contract, ContractTemplate, Lang, Payment, Student } from '../data/types.js';
import { moneyToWords, numberToWords } from './moneyWords.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PdfPrinter: any = require('pdfmake');

const fontDir = fileURLToPath(new URL('../../assets/fonts/', import.meta.url));
const printer = new PdfPrinter({
  Roboto: {
    normal: `${fontDir}Roboto-Regular.ttf`,
    bold: `${fontDir}Roboto-Medium.ttf`,
    italics: `${fontDir}Roboto-Italic.ttf`,
    bolditalics: `${fontDir}Roboto-MediumItalic.ttf`,
  },
});

/** Roboto has no U+02BB (ʻ); use the typographic single quote in PDFs. */
export const pdfText = (s: string) => s.replace(/ʻ/g, '‘').replace(/ʼ/g, '’');

function render(def: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument({ ...def, defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.25 } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export const fmtMoney = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const fmtDateDMY = (d: string | Date) => {
  const iso = typeof d === 'string' ? d : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);
  const [y, m, day] = iso.slice(0, 10).split('-');
  return `${day}.${m}.${y}`;
};
const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' }).format(d);

export interface ContractValues {
  [key: string]: string;
}

export interface ContractContext {
  courseName: string | null;
  courseDuration: number | null;
  groupName: string | null;
  paymentDueDate: string | null;
}

export function contractValues(c: Pick<Contract, 'number' | 'language' | 'price' | 'startDate' | 'endDate'>, student: Student, ctx: ContractContext, on: Date = new Date()): ContractValues {
  return {
    contractNumber: c.number,
    date: fmtDateDMY(on),
    schoolLegalName: brand.legalName,
    schoolInn: brand.inn,
    schoolAddress: brand.address,
    director: brand.director,
    studentFullName: `${student.lastName} ${student.firstName}${student.middleName ? ` ${student.middleName}` : ''}`,
    studentBirthDate: student.birthDate ? fmtDateDMY(student.birthDate) : '—',
    studentPhone: student.phone,
    studentPassport: student.passport ?? '—',
    studentPinfl: student.pinfl ?? '—',
    courseName: ctx.courseName ?? '—',
    courseDuration: ctx.courseDuration ? String(ctx.courseDuration) : '—',
    groupName: ctx.groupName ?? '—',
    price: fmtMoney(c.price),
    priceWords: numberToWords(c.price, c.language),
    paymentDueDate: fmtDateDMY(ctx.paymentDueDate ?? c.endDate),
    startDate: fmtDateDMY(c.startDate),
    endDate: fmtDateDMY(c.endDate),
  };
}

export const renderTemplate = (body: string, values: ContractValues) =>
  body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => values[k] ?? '');

export interface ContractBlock {
  heading: string | null;
  paragraphs: string[];
}

/** Splits rendered text into sections: lines starting with "## " are headings. */
export function parseBlocks(text: string): ContractBlock[] {
  const blocks: ContractBlock[] = [];
  let cur: ContractBlock = { heading: null, paragraphs: [] };
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (cur.heading || cur.paragraphs.length) blocks.push(cur);
      cur = { heading: line.slice(3).trim(), paragraphs: [] };
    } else if (line.trim()) cur.paragraphs.push(line.trim());
  }
  if (cur.heading || cur.paragraphs.length) blocks.push(cur);
  return blocks;
}

const L = {
  uz: { title: 'KASBGA OʻQITISH SHARTNOMASI', no: '№', signed: 'Elektron tasdiqlangan', phone: 'telefon', unsigned: 'Imzolanmagan qoralama' },
  ru: { title: 'ДОГОВОР О ПРОФЕССИОНАЛЬНОМ ОБУЧЕНИИ', no: '№', signed: 'Электронно подтверждено', phone: 'телефон', unsigned: 'Неподписанный черновик' },
} satisfies Record<Lang, Record<string, string>>;

export function contractPdf(contract: Pick<Contract, 'number' | 'language' | 'signedAt' | 'signerPhone'>, template: Pick<ContractTemplate, 'body'>, values: ContractValues): Promise<Buffer> {
  const l = L[contract.language];
  const content: Content[] = [
    { text: pdfText(brand.name), style: 'brand' },
    { text: pdfText(`${l.title} ${l.no} ${contract.number}`), style: 'title' },
  ];
  for (const b of parseBlocks(renderTemplate(template.body, values))) {
    if (b.heading) content.push({ text: pdfText(b.heading), style: 'h', margin: [0, 10, 0, 4] });
    for (const p of b.paragraphs) content.push({ text: pdfText(p), margin: [0, 0, 0, 4], alignment: 'justify' });
  }
  content.push({
    margin: [0, 24, 0, 0],
    table: {
      widths: ['*'],
      body: [[{
        text: pdfText(contract.signedAt
          ? `${l.signed}: ${fmtDateTime(contract.signedAt)}, ${l.phone}: ${contract.signerPhone ?? '—'}`
          : l.unsigned),
        bold: true, color: contract.signedAt ? '#15803D' : '#B45309', margin: [8, 8, 8, 8],
      }]],
    },
    layout: { hLineColor: () => (contract.signedAt ? '#15803D' : '#B45309'), vLineColor: () => (contract.signedAt ? '#15803D' : '#B45309') },
  });
  return render({
    pageSize: 'A4', pageMargins: [50, 50, 50, 50], content,
    styles: {
      brand: { fontSize: 11, color: '#285EB5', bold: true, alignment: 'center' },
      title: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 6, 0, 12] },
      h: { fontSize: 11.5, bold: true },
    },
  });
}

const RCPT = {
  uz: { title: 'TOʻLOV CHEKI', student: 'Tinglovchi', group: 'Guruh', course: 'Kurs', amount: 'Summa', words: 'Soʻz bilan', method: 'Usul', left: 'Qoldiq qarz', by: 'Qabul qildi', thanks: 'Rahmat!', currency: 'soʻm', methods: { CASH: 'Naqd', CARD: 'Karta', CLICK: 'Click', PAYME: 'Payme', TRANSFER: 'Bank oʻtkazmasi' } },
  ru: { title: 'КВИТАНЦИЯ ОБ ОПЛАТЕ', student: 'Слушатель', group: 'Группа', course: 'Курс', amount: 'Сумма', words: 'Прописью', method: 'Способ', left: 'Остаток долга', by: 'Принял', thanks: 'Спасибо!', currency: 'сум', methods: { CASH: 'Наличные', CARD: 'Карта', CLICK: 'Click', PAYME: 'Payme', TRANSFER: 'Банковский перевод' } },
} as const;

export interface ReceiptInfo {
  studentName: string;
  courseName: string | null;
  groupName: string | null;
  receivedByName: string | null;
  /** Debt left after this payment; omitted for older receipts where it would be misleading. */
  debtAfter: number | null;
}

export function receiptPdf(payment: Payment, info: ReceiptInfo, lang: Lang): Promise<Buffer> {
  const l = RCPT[lang];
  const row = (k: string, v: string): Content => ({ columns: [{ text: pdfText(k), width: 70, color: '#64748B' }, { text: pdfText(v), bold: true }], margin: [0, 2, 0, 2] });
  return render({
    pageSize: 'A6', pageMargins: [20, 20, 20, 20],
    content: [
      { text: pdfText(brand.name), fontSize: 12, bold: true, color: '#285EB5', alignment: 'center' },
      { text: pdfText(`${brand.address} · ${brand.phone}`), fontSize: 8, color: '#64748B', alignment: 'center', margin: [0, 2, 0, 8] },
      { text: pdfText(`${l.title} № ${payment.id.replace(/\D/g, '').padStart(6, '0')}`), bold: true, alignment: 'center', margin: [0, 0, 0, 2] },
      { text: fmtDateTime(payment.paidAt), alignment: 'center', fontSize: 9, color: '#64748B', margin: [0, 0, 0, 10] },
      row(l.student, info.studentName),
      row(l.course, info.courseName ?? '—'),
      row(l.group, info.groupName ?? '—'),
      row(l.method, l.methods[payment.method]),
      row(l.amount, `${fmtMoney(payment.amount)} ${l.currency}`),
      { text: pdfText(`${l.words}: ${moneyToWords(payment.amount, lang)}`), fontSize: 9, italics: true, margin: [0, 6, 0, 8] },
      ...(info.debtAfter !== null ? [row(l.left, `${fmtMoney(Math.max(0, info.debtAfter))} ${l.currency}`)] : []),
      row(l.by, info.receivedByName ?? '—'),
      { text: pdfText(l.thanks), alignment: 'center', margin: [0, 12, 0, 0], color: '#64748B' },
    ],
  });
}
