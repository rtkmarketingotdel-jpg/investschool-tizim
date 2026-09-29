import { randomBytes } from 'node:crypto';
import { brand } from '../brand.config.js';
import { settings } from '../data/mockStore.js';
import { students } from '../data/mockStudents.js';
import { lastDebtSms, smsCampaigns, smsTemplates } from '../data/mockSms.js';
import type { Lang, SmsCampaign, SmsCategory, SmsMessage, Student } from '../data/types.js';
import { toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { isValidPhone, normalizeSms, renderVars, smsInfo, templateVars, toPhone } from '../lib/smsText.js';
import { classRepo } from '../repositories/classRepo.js';
import { audit, notifyRoles } from '../repositories/notificationRepo.js';
import { fullName } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { debtMap } from './finance.js';
import { deliverSms } from './sms.js';

export type Audience =
  | { kind: 'ALL_PARENTS' }
  | { kind: 'CLASSES'; classIds: string[] }
  | { kind: 'BRANCH'; branchId: string }
  | { kind: 'DEBTORS'; minOverdueDays: number }
  | { kind: 'STUDENTS'; studentIds: string[] }
  | { kind: 'STAFF'; scope: 'ALL' | 'TEACHERS' | 'TUTORS'; branchId: string | null }
  | { kind: 'NUMBERS'; numbers: string[] };

export interface Recipient {
  phone: string;
  name: string;
  studentId: string | null;
  vars: Record<string, string>;
}

const MAX_MESSAGES = 5000;
const PARENT_VARS = ['parentName', 'studentName', 'className', 'debt', 'overdueDays', 'month', 'school'];
const STAFF_VARS = ['name', 'position', 'school'];
const DEBT_VARS = ['debt', 'overdueDays', 'month'];
const PER_STUDENT_VARS = ['studentName', 'className', ...DEBT_VARS];

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const MONTHS: Record<Lang, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
};
const monthName = (period: string | null, lang: Lang) => (period ? (MONTHS[lang][Number(period.slice(5, 7)) - 1] ?? '') : '');

export const usesFinance = (text: string, audience: Audience) =>
  audience.kind === 'DEBTORS' || templateVars(text).some((v) => DEBT_VARS.includes(v));

/** Resolves an audience to concrete recipients. Parent audiences are one row per (parent phone, student). */
export async function resolveAudience(audience: Audience, opts: { bothPhones: boolean; lang: Lang }): Promise<Recipient[]> {
  const school = brand.name;
  if (audience.kind === 'NUMBERS') {
    // unparsable numbers are kept as typed so prepare() can count them as skipped
    return audience.numbers.map((n) => {
      const phone = toPhone(n) ?? n.trim();
      return { phone, name: phone, studentId: null, vars: { school } };
    });
  }
  if (audience.kind === 'STAFF') {
    const users = (await userRepo.list()).filter(
      (u) => u.isActive && (audience.scope === 'ALL' || (audience.scope === 'TEACHERS' ? u.isTeacher : u.isTutor)) && (!audience.branchId || u.branchId === audience.branchId),
    );
    return users.map((u) => ({ phone: u.phone, name: u.fullName, studentId: null, vars: { name: u.fullName.split(' ')[1] ?? u.fullName, position: u.position, school } }));
  }

  const [debts, classes] = await Promise.all([debtMap(), classRepo.list()]);
  const className = new Map(classes.map((c) => [c.id, c.name]));
  let list: Student[] = students.filter((s) => s.status !== 'LEFT');
  if (audience.kind === 'CLASSES') list = list.filter((s) => s.classId && audience.classIds.includes(s.classId));
  if (audience.kind === 'BRANCH') {
    const ids = new Set(classes.filter((c) => c.branchId === audience.branchId).map((c) => c.id));
    list = list.filter((s) => s.classId && ids.has(s.classId));
  }
  if (audience.kind === 'STUDENTS') list = list.filter((s) => audience.studentIds.includes(s.id));
  if (audience.kind === 'DEBTORS') {
    list = list.filter((s) => {
      const d = debts.get(s.id);
      return !!d && d.debt > 0 && d.overdueDays >= audience.minOverdueDays;
    });
  }
  return list.flatMap((s) => {
    const d = debts.get(s.id);
    const vars = {
      parentName: s.parentName, studentName: fullName(s), className: (s.classId && className.get(s.classId)) || '',
      debt: fmt(Math.max(0, d?.debt ?? 0)), overdueDays: String(d?.overdueDays ?? 0), month: monthName(d?.oldestPeriod ?? null, opts.lang), school,
    };
    const phones = [s.parentPhone, ...(opts.bothPhones && s.parentPhone2 ? [s.parentPhone2] : [])];
    return phones.map((phone) => ({ phone, name: s.parentName, studentId: s.id, vars }));
  });
}

export interface Prepared {
  messages: Array<Pick<SmsMessage, 'phone' | 'name' | 'text' | 'segments' | 'studentId'>>;
  segments: number;
  invalidPhones: number;
  duplicates: number;
}

/** Renders the text for every recipient, drops invalid/duplicate numbers and counts the SMS parts. */
export async function prepare(text: string, audience: Audience, opts: { bothPhones: boolean; lang: Lang }): Promise<Prepared> {
  const used = templateVars(text);
  const allowed = audience.kind === 'STAFF' ? STAFF_VARS : audience.kind === 'NUMBERS' ? ['school'] : PARENT_VARS;
  const bad = used.filter((v) => !allowed.includes(v));
  if (bad.length) throw new ApiError(400, 'SMS_BAD_VARIABLE', { variables: bad });
  if (!normalizeSms(text)) throw new ApiError(400, 'SMS_EMPTY_TEXT');

  const perStudent = used.some((v) => PER_STUDENT_VARS.includes(v));
  const recipients = await resolveAudience(audience, opts);
  const seen = new Set<string>();
  const out: Prepared['messages'] = [];
  let invalidPhones = 0;
  let duplicates = 0;
  for (const r of recipients) {
    if (!isValidPhone(r.phone)) {
      invalidPhones++;
      continue;
    }
    const key = perStudent ? `${r.phone}|${r.studentId}` : r.phone; // a generic text goes once per phone
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    const rendered = normalizeSms(renderVars(text, r.vars).text).replace(/ {2,}/g, ' ');
    out.push({ phone: r.phone, name: r.name, text: rendered, segments: smsInfo(rendered).segments, studentId: r.studentId });
  }
  if (out.length > MAX_MESSAGES) throw new ApiError(400, 'SMS_TOO_MANY', { max: MAX_MESSAGES });
  return { messages: out, segments: out.reduce((n, m) => n + m.segments, 0), invalidPhones, duplicates };
}

const id = () => randomBytes(6).toString('hex');

export async function createCampaign(input: {
  category: SmsCategory; title: string; audienceLabel: string; text: string; audience: Audience; bothPhones: boolean; lang: Lang;
  scheduledAt: Date | null; createdById: string | null; auto?: boolean;
}): Promise<SmsCampaign> {
  const p = await prepare(input.text, input.audience, { bothPhones: input.bothPhones, lang: input.lang });
  if (p.messages.length === 0) throw new ApiError(400, 'SMS_NO_RECIPIENTS');
  if (input.scheduledAt && input.scheduledAt.getTime() < Date.now() - 60_000) throw new ApiError(400, 'SMS_SCHEDULE_IN_PAST');
  const campaign: SmsCampaign = {
    id: id(), category: input.category, title: input.title, audienceLabel: input.audienceLabel, text: input.text,
    status: input.scheduledAt ? 'SCHEDULED' : 'SENDING', scheduledAt: input.scheduledAt, createdAt: new Date(), createdById: input.createdById,
    auto: !!input.auto,
    messages: p.messages.map((m) => ({ id: id(), ...m, status: 'QUEUED', error: null, providerId: null, sentAt: null })),
  };
  smsCampaigns.unshift(campaign);
  await audit(input.createdById, input.scheduledAt ? 'sms.schedule' : 'sms.send', 'sms', campaign.id, { count: campaign.messages.length, category: input.category, auto: !!input.auto });
  if (!input.scheduledAt) void processCampaign(campaign.id);
  return campaign;
}

const running = new Set<string>();

/** Sends every QUEUED message of a campaign (5 at a time). Safe to call twice: a campaign runs once at a time. */
export async function processCampaign(campaignId: string): Promise<void> {
  const c = smsCampaigns.find((x) => x.id === campaignId);
  if (!c || running.has(c.id) || c.status === 'CANCELLED') return;
  running.add(c.id);
  c.status = 'SENDING';
  try {
    const queue = c.messages.filter((m) => m.status === 'QUEUED');
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const m = queue[next++]!;
        const r = await deliverSms(m.phone, m.text);
        m.status = !r.ok ? 'FAILED' : r.simulated ? 'SIMULATED' : 'SENT';
        m.error = r.error;
        m.providerId = r.providerId;
        m.sentAt = new Date();
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    c.status = 'DONE';
    const failed = c.messages.filter((m) => m.status === 'FAILED').length;
    await notifyRoles(['DIRECTOR'], 'notif.smsDone', { title: c.title, sent: c.messages.length - failed, failed }, '/sms');
  } finally {
    running.delete(c.id);
  }
}

export async function retryFailed(campaignId: string): Promise<number> {
  const c = smsCampaigns.find((x) => x.id === campaignId);
  if (!c) throw new ApiError(404, 'NOT_FOUND');
  if (c.status === 'SENDING' || c.status === 'SCHEDULED') throw new ApiError(409, 'SMS_BAD_STATE');
  const failed = c.messages.filter((m) => m.status === 'FAILED');
  failed.forEach((m) => { m.status = 'QUEUED'; m.error = null; });
  if (failed.length) void processCampaign(c.id);
  return failed.length;
}

/** Cron: sends scheduled campaigns whose time has come. */
export async function runDueCampaigns(now = new Date()) {
  for (const c of smsCampaigns) {
    if (c.status === 'SCHEDULED' && c.scheduledAt && c.scheduledAt <= now) void processCampaign(c.id);
  }
}

/** Daily job: remind debtors, at most once every `smsDebtEveryDays` days per student. */
export async function runDebtAuto(now = new Date()): Promise<{ sent: number }> {
  if (!settings.smsDebtAutoEnabled) return { sent: 0 };
  const tpl = smsTemplates.find((t) => t.id === settings.smsDebtTemplateId);
  if (!tpl) return { sent: 0 };
  const debts = await debtMap();
  const due = students.filter((s) => {
    const d = debts.get(s.id);
    if (s.status === 'LEFT' || !d || d.debt <= 0 || d.overdueDays < settings.smsDebtMinOverdueDays) return false;
    const last = lastDebtSms.get(s.id);
    return !last || (now.getTime() - last.getTime()) / 86_400_000 >= settings.smsDebtEveryDays;
  });
  if (!due.length) return { sent: 0 };
  const c = await createCampaign({
    category: 'DEBT', title: `${tpl.name} · ${toLocalDate(now)}`, audienceLabel: 'DEBTORS_AUTO', text: tpl.body,
    audience: { kind: 'STUDENTS', studentIds: due.map((s) => s.id) }, bothPhones: false, lang: tpl.language, scheduledAt: null, createdById: null, auto: true,
  });
  due.forEach((s) => lastDebtSms.set(s.id, now));
  return { sent: c.messages.length };
}

export { smsTemplates, smsCampaigns };
