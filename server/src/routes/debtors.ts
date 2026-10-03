import { Router } from 'express';
import { z } from 'zod';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { classRepo } from '../repositories/classRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { debtMap } from '../services/finance.js';

export const debtorsRouter = Router();
debtorsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER'));

const query = z.object({ ...pageQuery, q: z.string().optional(), classId: z.string().optional() });

debtorsRouter.get('/', async (req, res, next) => {
  try {
    const q = query.parse(req.query);
    const [debts, students] = await Promise.all([debtMap(), studentRepo.list({ q: q.q, classId: q.classId })]);
    const rows = students
      .filter((s) => (debts.get(s.id)?.debt ?? 0) > 0)
      .map((s) => ({ s, d: debts.get(s.id)! }))
      .sort((a, b) => b.d.overdueDays - a.d.overdueDays || b.d.debt - a.d.debt);
    const page = paginate(rows, q.page, q.limit);
    const items = await Promise.all(
      page.items.map(async ({ s, d }) => ({
        studentId: s.id, studentName: fullName(s), parentName: s.parentName, parentPhone: s.parentPhone,
        className: s.classId ? ((await classRepo.findById(s.classId))?.name ?? null) : null,
        debt: d.debt, overdueDays: d.overdueDays, oldestPeriod: d.oldestPeriod, lastPaymentAt: d.lastPaymentAt,
      })),
    );
    res.json({ ...page, items, summary: { totalDebt: rows.reduce((n, r) => n + r.d.debt, 0), count: rows.length } });
  } catch (e) {
    next(e);
  }
});
