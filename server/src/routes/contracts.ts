import { Router } from 'express';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import { studentRepo, fullName } from '../repositories/studentRepo.js';
import { classRepo } from '../repositories/classRepo.js';
import { ApiError } from '../lib/errors.js';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { contractRepo, templateRepo } from '../repositories/contractRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { contractPdfFor } from '../services/contracts.js';
import { chargeAmount } from '../services/debt.js';
import { contractPdf, contractValues } from '../services/pdf.js';
import { env } from '../env.js';
import type { Contract } from '../data/types.js';

export const contractsRouter = Router();
contractsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

async function present(c: Contract) {
  const s = await studentRepo.findById(c.studentId);
  const otpActive = !!c.otpDemoCode && !!c.otpExpiresAt && c.otpExpiresAt.getTime() > Date.now();
  return {
    id: c.id, number: c.number, studentId: c.studentId, studentName: s ? fullName(s) : '—', parentName: s?.parentName ?? '—',
    language: c.language, monthlyFee: c.monthlyFee, startDate: c.startDate, endDate: c.endDate, status: c.status,
    publicToken: c.publicToken, createdAt: c.createdAt, signedAt: c.signedAt,
    demoCode: env.demoMode && otpActive ? c.otpDemoCode : null,
  };
}

const listQuery = z.object({
  ...pageQuery, q: z.string().optional(), studentId: z.string().optional(), status: z.enum(['DRAFT', 'SENT', 'SIGNED', 'CANCELLED']).optional(),
});

contractsRouter.get('/', async (req, res, next) => {
  try {
    const q = listQuery.parse(req.query);
    const term = q.q?.trim().toLowerCase();
    const all = [...(await contractRepo.all())].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const presented = await Promise.all(all.filter((c) => (!q.status || c.status === q.status) && (!q.studentId || c.studentId === q.studentId)).map(present));
    const rows = presented.filter((c) => !term || [c.number, c.studentName, c.parentName].some((v) => v.toLowerCase().includes(term)));
    res.json(((page) => ({ ...page }))(paginate(rows, q.page, q.limit)));
  } catch (e) {
    next(e);
  }
});

// ---- classes (contracts grouped by class) ----
const latestByStudent = async () => {
  const map = new Map<string, Contract>();
  for (const c of await contractRepo.all()) {
    if (c.status === 'CANCELLED') continue;
    const cur = map.get(c.studentId);
    if (!cur || c.createdAt > cur.createdAt) map.set(c.studentId, c);
  }
  return map;
};

contractsRouter.get('/classes', async (_req, res, next) => {
  try {
    const [classes, latest] = await Promise.all([classRepo.list(), latestByStudent()]);
    const items = [];
    for (const c of classes) {
      const list = (await studentRepo.list({ classId: c.id })).filter((s) => s.status !== 'LEFT');
      const count = (st: string) => list.filter((s) => latest.get(s.id)?.status === st).length;
      items.push({
        id: c.id, name: c.name, studentCount: list.length,
        signed: count('SIGNED'), sent: count('SENT'), draft: count('DRAFT'),
        none: list.filter((s) => !latest.has(s.id)).length,
      });
    }
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

contractsRouter.get('/classes/:classId', async (req, res, next) => {
  try {
    const cls = await classRepo.findById(req.params.classId!);
    if (!cls) throw new ApiError(404, 'NOT_FOUND');
    const latest = await latestByStudent();
    const students = (await studentRepo.list({ classId: cls.id })).filter((s) => s.status !== 'LEFT');
    const items = await Promise.all(
      students.map(async (s) => {
        const c = latest.get(s.id);
        return {
          student: { id: s.id, fullName: fullName(s), parentName: s.parentName, parentPhone: s.parentPhone, monthlyFee: s.monthlyFee },
          contract: c ? await present(c) : null,
        };
      }),
    );
    res.json({ class: { id: cls.id, name: cls.name }, items });
  } catch (e) {
    next(e);
  }
});

// ---- templates (declared before /:id) ----
const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  language: z.enum(['uz', 'ru']),
  body: z.string().min(20).max(30_000),
  isDefault: z.boolean(),
});

contractsRouter.get('/templates', async (_req, res, next) => {
  try {
    res.json({ items: await templateRepo.all() });
  } catch (e) {
    next(e);
  }
});
contractsRouter.post('/templates', requireRole('DIRECTOR', 'MANAGER'), validateBody(templateSchema), async (req, res, next) => {
  try {
    const rec = await templateRepo.create(req.body);
    await audit(req.user!.id, 'template.create', 'template', rec.id);
    res.status(201).json(rec);
  } catch (e) {
    next(e);
  }
});
contractsRouter.put('/templates/:id', requireRole('DIRECTOR', 'MANAGER'), validateBody(templateSchema), async (req, res, next) => {
  try {
    const rec = await templateRepo.update(req.params.id!, req.body);
    if (!rec) throw new ApiError(404, 'NOT_FOUND');
    await audit(req.user!.id, 'template.update', 'template', rec.id);
    res.json(rec);
  } catch (e) {
    next(e);
  }
});
contractsRouter.delete('/templates/:id', requireRole('DIRECTOR', 'MANAGER'), async (req, res, next) => {
  try {
    const t = await templateRepo.findById(req.params.id!);
    if (!t) throw new ApiError(404, 'NOT_FOUND');
    if ((await contractRepo.all()).some((c) => c.templateId === t.id)) throw new ApiError(409, 'TEMPLATE_IN_USE');
    await templateRepo.remove(t.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
contractsRouter.post('/templates/sample-pdf', validateBody(z.object({ body: z.string().min(1), language: z.enum(['uz', 'ru']) })), async (req, res, next) => {
  try {
    const { body, language } = req.body as { body: string; language: 'uz' | 'ru' };
    const sample = {
      firstName: language === 'uz' ? 'Azizbek' : 'Азизбек', lastName: language === 'uz' ? 'Karimov' : 'Каримов', middleName: null,
      birthDate: '2016-05-14', parentName: language === 'uz' ? 'Karimov Rustam' : 'Каримов Рустам', parentPhone: '+998901234567',
    };
    const contract = { number: `${settings.contractPrefix}-SAMPLE`, language, monthlyFee: 3_000_000, startDate: '2026-09-01', endDate: '2027-05-31', signedAt: null, signerPhone: null };
    const values = contractValues(contract, sample as never, '3-A');
    const pdf = await contractPdf(contract, { body }, values);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (e) {
    next(e);
  }
});

// ---- contracts ----
const createSchema = z.object({
  studentId: z.string().min(1),
  templateId: z.string().min(1),
  monthlyFee: z.number().int().min(0).max(100_000_000),
  startDate: z.string().regex(dateRe),
  endDate: z.string().regex(dateRe),
});

contractsRouter.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const [student, template] = await Promise.all([studentRepo.findById(body.studentId), templateRepo.findById(body.templateId)]);
    if (!student || !template) throw new ApiError(404, 'NOT_FOUND');
    if (body.endDate <= body.startDate) throw new ApiError(400, 'VALIDATION_ERROR');
    const rec = await contractRepo.create({ ...body, language: template.language, status: 'DRAFT' }, settings.contractPrefix);
    await audit(req.user!.id, 'contract.create', 'contract', rec.id, { studentId: student.id });
    res.status(201).json(await present(rec));
  } catch (e) {
    next(e);
  }
});

/** Defaults used by the create form: fee after discount and the student's class. */
contractsRouter.get('/defaults/:studentId', async (req, res, next) => {
  try {
    const s = await studentRepo.findById(req.params.studentId!);
    if (!s) throw new ApiError(404, 'NOT_FOUND');
    const cls = s.classId ? await classRepo.findById(s.classId) : null;
    res.json({ monthlyFee: chargeAmount(s.monthlyFee, s.discountPercent), className: cls?.name ?? null, parentName: s.parentName });
  } catch (e) {
    next(e);
  }
});

async function load(id: string) {
  const c = await contractRepo.findById(id);
  if (!c) throw new ApiError(404, 'NOT_FOUND');
  return c;
}

contractsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const c = await load(req.params.id!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${c.number}.pdf"`);
    res.send(await contractPdfFor(c));
  } catch (e) {
    next(e);
  }
});

contractsRouter.post('/:id/send', async (req, res, next) => {
  try {
    const c = await load(req.params.id!);
    if (c.status !== 'DRAFT') throw new ApiError(409, 'CONTRACT_BAD_STATE');
    res.json(await present((await contractRepo.update(c.id, { status: 'SENT' }))!));
  } catch (e) {
    next(e);
  }
});

contractsRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const c = await load(req.params.id!);
    if (c.status === 'CANCELLED') throw new ApiError(409, 'CONTRACT_BAD_STATE');
    await audit(req.user!.id, 'contract.cancel', 'contract', c.id, { from: c.status });
    res.json(await present((await contractRepo.update(c.id, { status: 'CANCELLED', otpHash: null, otpDemoCode: null }))!));
  } catch (e) {
    next(e);
  }
});
