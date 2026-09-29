import { Router } from 'express';
import { z } from 'zod';
import { addDays, toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { classRepo } from '../repositories/classRepo.js';
import { paymentRepo } from '../repositories/financeRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { studentDebt } from '../services/finance.js';
import { receiptPdf } from '../services/pdf.js';

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth, requireRole('DIRECTOR', 'ACCOUNTANT'));

const METHODS = ['CASH', 'CARD', 'CLICK', 'PAYME', 'TRANSFER'] as const;

const createSchema = z.object({
  studentId: z.string().min(1),
  amount: z.number().int().min(1000).max(1_000_000_000),
  method: z.enum(METHODS),
  period: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  note: z.string().trim().max(300).nullable(),
});

const listQuery = z.object({
  ...pageQuery,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(METHODS).optional(),
  classId: z.string().optional(),
});

const localDay = (d: Date) => toLocalDate(d);

async function present(p: Awaited<ReturnType<typeof paymentRepo.findById>> & object) {
  const s = await studentRepo.findById(p.studentId);
  const cls = s?.classId ? await classRepo.findById(s.classId) : null;
  const by = p.receivedById ? await userRepo.findById(p.receivedById) : null;
  return { ...p, studentName: s ? fullName(s) : '—', className: cls?.name ?? null, receivedByName: by?.fullName ?? null };
}

paymentsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const today = toLocalDate();
    const from = q.from ?? addDays(today, -29);
    const to = q.to ?? today;
    const all = await paymentRepo.all();
    const rows: typeof all = [];
    for (const p of all) {
      const day = localDay(p.paidAt);
      if (day < from || day > to || (q.method && p.method !== q.method)) continue;
      if (q.classId && (await studentRepo.findById(p.studentId))?.classId !== q.classId) continue;
      rows.push(p);
    }
    rows.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());
    const byMethod: Record<string, number> = {};
    for (const p of rows) byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    const page = paginate(rows, q.page, q.limit);
    res.json({
      ...page, items: await Promise.all(page.items.map(present)),
      summary: { total: rows.reduce((s, p) => s + p.amount, 0), count: rows.length, byMethod },
    });
  } catch (e) {
    next(e);
  }
});

paymentsRouter.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const student = await studentRepo.findById(body.studentId);
    if (!student) throw new ApiError(404, 'NOT_FOUND');
    const rec = await paymentRepo.create({ ...body, paidAt: new Date(), receivedById: req.user!.id });
    await audit(req.user!.id, 'payment.create', 'payment', rec.id, { studentId: student.id, amount: rec.amount, method: rec.method });
    res.status(201).json({ payment: await present(rec), debt: (await studentDebt(student.id)).debt });
  } catch (e) {
    next(e);
  }
});

paymentsRouter.get('/:id/receipt', async (req, res, next) => {
  try {
    const p = await paymentRepo.findById(req.params.id!);
    if (!p) throw new ApiError(404, 'NOT_FOUND');
    const info = await present(p);
    const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
    const pdf = await receiptPdf(p, info.studentName, info.className, info.receivedByName, lang);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${p.id}.pdf"`);
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});
