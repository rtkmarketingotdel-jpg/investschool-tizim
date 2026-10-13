import { Router } from 'express';
import { z } from 'zod';
import { paginate, pageQuery } from '../lib/pagination.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { groupRepo } from '../repositories/groupRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { debtMap } from '../services/finance.js';

export const debtorsRouter = Router();
debtorsRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

const query = z.object({ ...pageQuery, q: z.string().optional(), groupId: z.string().optional() });

debtorsRouter.get('/', async (req, res, next) => {
  try {
    const q = query.parse(req.query);
    const [debts, students] = await Promise.all([debtMap(), studentRepo.list({ q: q.q, groupId: q.groupId })]);
    const rows = students
      .filter((s) => (debts.get(s.id)?.debt ?? 0) > 0)
      .map((s) => ({ s, d: debts.get(s.id)! }))
      .sort((a, b) => b.d.overdueDays - a.d.overdueDays || b.d.debt - a.d.debt);
    const page = paginate(rows, q.page, q.limit);
    const items = await Promise.all(
      page.items.map(async ({ s, d }) => ({
        studentId: s.id, studentName: fullName(s), phone: s.phone, status: s.status,
        groupName: s.groupId ? ((await groupRepo.findById(s.groupId))?.name ?? null) : null,
        debt: d.debt, overdueDays: d.overdueDays, dueDate: d.oldestDueDate, lastPaymentAt: d.lastPaymentAt,
      })),
    );
    res.json({ ...page, items, summary: { totalDebt: rows.reduce((n, r) => n + r.d.debt, 0), count: rows.length } });
  } catch (e) {
    next(e);
  }
});
