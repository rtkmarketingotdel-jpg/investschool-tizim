import { Router } from 'express';
import { z } from 'zod';
import { smsCampaigns, smsTemplates } from '../data/mockSms.js';
import type { SmsCampaign, SmsCategory } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { pageQuery } from '../lib/pagination.js';
import { normalizeSms, smsInfo, toPhone } from '../lib/smsText.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { audit } from '../repositories/notificationRepo.js';
import { deliverSms, smsBalance, smsStatus } from '../services/sms.js';
import { createCampaign, prepare, retryFailed, runDebtAuto, usesFinance, type Audience } from '../services/smsCampaigns.js';

export const smsRouter = Router();
smsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER'));

const CATEGORIES = ['DEBT', 'GREETING', 'WARNING', 'OTHER'] as const;
const phone = z.string().min(1).max(30); // bad numbers are counted as "skipped" by the preview, not rejected

const audienceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('ALL_PARENTS') }),
  z.object({ kind: z.literal('CLASSES'), classIds: z.array(z.string()).min(1).max(50) }),
  z.object({ kind: z.literal('BRANCH'), branchId: z.string() }),
  z.object({ kind: z.literal('DEBTORS'), minOverdueDays: z.number().int().min(0).max(365).default(0) }),
  z.object({ kind: z.literal('STUDENTS'), studentIds: z.array(z.string()).min(1).max(500) }),
  z.object({ kind: z.literal('STAFF'), scope: z.enum(['ALL', 'TEACHERS', 'TUTORS']), branchId: z.string().nullable().default(null) }),
  z.object({ kind: z.literal('NUMBERS'), numbers: z.array(phone).min(1).max(200) }),
]);

const composeSchema = z.object({
  audience: audienceSchema,
  text: z.string().min(1).max(700),
  bothPhones: z.boolean().default(false),
  lang: z.enum(['uz', 'ru']).default('uz'),
});

function audienceLabel(a: Audience): string {
  switch (a.kind) {
    case 'CLASSES': return `CLASSES:${a.classIds.length}`;
    case 'DEBTORS': return `DEBTORS:${a.minOverdueDays}`;
    case 'STUDENTS': return `STUDENTS:${a.studentIds.length}`;
    case 'STAFF': return `STAFF:${a.scope}`;
    case 'NUMBERS': return `NUMBERS:${a.numbers.length}`;
    default: return a.kind;
  }
}

/** ADMIN must not learn debts: block the debtor audience and debt variables for that role. */
function guardFinance(role: string, text: string, audience: Audience) {
  if (role === 'ADMIN' && usesFinance(text, audience)) throw new ApiError(403, 'FORBIDDEN');
}

const summary = (c: SmsCampaign) => {
  const n = (s: string) => c.messages.filter((m) => m.status === s).length;
  return {
    id: c.id, category: c.category, title: c.title, audienceLabel: c.audienceLabel, text: c.text, status: c.status, auto: c.auto,
    scheduledAt: c.scheduledAt, createdAt: c.createdAt,
    total: c.messages.length, sent: n('SENT'), simulated: n('SIMULATED'), failed: n('FAILED'), queued: n('QUEUED'),
    segments: c.messages.reduce((s, m) => s + m.segments, 0),
  };
};

smsRouter.get('/status', async (_req, res, next) => {
  try {
    res.json({ ...smsStatus(), balance: await smsBalance() });
  } catch (e) {
    next(e);
  }
});

// ---------- templates ----------
const templateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(CATEGORIES),
  language: z.enum(['uz', 'ru']),
  body: z.string().min(5).max(700),
});
let tplCounter = 1;

smsRouter.get('/templates', (_req, res) => {
  res.json({ items: smsTemplates });
});
smsRouter.post('/templates', validateBody(templateSchema), async (req, res, next) => {
  try {
    const rec = { id: `stn${tplCounter++}`, ...(req.body as z.infer<typeof templateSchema>) };
    smsTemplates.push(rec);
    await audit(req.user!.id, 'sms.template.create', 'sms', rec.id);
    res.status(201).json(rec);
  } catch (e) {
    next(e);
  }
});
smsRouter.put('/templates/:id', validateBody(templateSchema), async (req, res, next) => {
  try {
    const rec = smsTemplates.find((t) => t.id === req.params.id);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    Object.assign(rec, req.body);
    await audit(req.user!.id, 'sms.template.update', 'sms', rec.id);
    res.json(rec);
  } catch (e) {
    next(e);
  }
});
smsRouter.delete('/templates/:id', async (req, res, next) => {
  try {
    const i = smsTemplates.findIndex((t) => t.id === req.params.id);
    if (i < 0) throw new ApiError(404, 'NOT_FOUND');
    smsTemplates.splice(i, 1);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------- compose ----------
smsRouter.post('/preview', validateBody(composeSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof composeSchema>;
    guardFinance(req.user!.role, b.text, b.audience);
    const p = await prepare(b.text, b.audience as Audience, { bothPhones: b.bothPhones, lang: b.lang });
    res.json({
      count: p.messages.length, segments: p.segments, invalidPhones: p.invalidPhones, duplicates: p.duplicates,
      sample: p.messages.slice(0, 3).map((m) => ({ name: m.name, phone: m.phone, text: m.text, segments: m.segments })),
      // the longest rendered message decides encoding/length (a name or amount can push it into a 2nd part)
      info: smsInfo(p.messages.reduce((longest, m) => (m.text.length > longest.length ? m.text : longest), b.text)),
    });
  } catch (e) {
    next(e);
  }
});

const sendSchema = composeSchema.extend({
  category: z.enum(CATEGORIES),
  title: z.string().trim().max(120).default(''),
  scheduleAt: z.string().datetime().nullable().default(null),
});

smsRouter.post('/send', validateBody(sendSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof sendSchema>;
    guardFinance(req.user!.role, b.text, b.audience);
    const c = await createCampaign({
      category: b.category as SmsCategory, title: b.title || normalizeSms(b.text.replace(/\{\{\s*\w+\s*\}\}/g, '…')).slice(0, 60), audienceLabel: audienceLabel(b.audience as Audience),
      text: b.text, audience: b.audience as Audience, bothPhones: b.bothPhones, lang: b.lang,
      scheduledAt: b.scheduleAt ? new Date(b.scheduleAt) : null, createdById: req.user!.id,
    });
    res.status(201).json(summary(c));
  } catch (e) {
    next(e);
  }
});

// ---------- history ----------
const listQuery = z.object({ ...pageQuery, category: z.enum(CATEGORIES).optional() });
smsRouter.get('/campaigns', (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const rows = smsCampaigns.filter((c) => !q.category || c.category === q.category);
    res.json({ items: rows.slice((q.page - 1) * q.limit, q.page * q.limit).map(summary), total: rows.length, page: q.page, limit: q.limit });
  } catch (e) {
    next(e);
  }
});

const detailQuery = z.object({ ...pageQuery, status: z.enum(['QUEUED', 'SENT', 'FAILED', 'SIMULATED']).optional() });
smsRouter.get('/campaigns/:id', (req, res, next) => {
  try {
    const c = smsCampaigns.find((x) => x.id === req.params.id);
    if (!c) throw new ApiError(404, 'NOT_FOUND');
    const q = detailQuery.parse(req.query);
    const rows = c.messages.filter((m) => !q.status || m.status === q.status);
    res.json({ ...summary(c), messages: rows.slice((q.page - 1) * q.limit, q.page * q.limit), messagesTotal: rows.length, page: q.page, limit: q.limit });
  } catch (e) {
    next(e);
  }
});

smsRouter.post('/campaigns/:id/retry', async (req, res, next) => {
  try {
    res.json({ retried: await retryFailed(req.params.id!) });
  } catch (e) {
    next(e);
  }
});

smsRouter.post('/campaigns/:id/cancel', async (req, res, next) => {
  try {
    const c = smsCampaigns.find((x) => x.id === req.params.id);
    if (!c) throw new ApiError(404, 'NOT_FOUND');
    if (c.status !== 'SCHEDULED') throw new ApiError(409, 'SMS_BAD_STATE');
    c.status = 'CANCELLED';
    await audit(req.user!.id, 'sms.cancel', 'sms', c.id);
    res.json(summary(c));
  } catch (e) {
    next(e);
  }
});

smsRouter.post('/test', validateBody(z.object({ phone, text: z.string().min(1).max(300) })), async (req, res, next) => {
  try {
    const b = req.body as { phone: string; text: string };
    const to = toPhone(b.phone);
    if (!to) throw new ApiError(400, 'SMS_BAD_PHONE');
    const text = normalizeSms(b.text);
    const r = await deliverSms(to, text);
    await audit(req.user!.id, 'sms.test', 'sms', null, { ok: r.ok, simulated: r.simulated });
    if (!r.ok) throw new ApiError(502, 'SMS_PROVIDER_ERROR', { reason: r.error });
    res.json({ ok: true, simulated: r.simulated, ...smsInfo(text) });
  } catch (e) {
    next(e);
  }
});

smsRouter.post('/auto/run', requireRole('DIRECTOR'), async (_req, res, next) => {
  try {
    res.json(await runDebtAuto());
  } catch (e) {
    next(e);
  }
});
