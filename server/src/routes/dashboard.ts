import { Router } from 'express';
import { settings } from '../data/mockStore.js';
import { students } from '../data/mockStudents.js';
import { toLocalDate } from '../lib/date.js';
import { addMonths } from '../lib/period.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { classRepo } from '../repositories/classRepo.js';
import { chargeRepo, paymentRepo } from '../repositories/financeRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { debtMap } from '../services/finance.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole('DIRECTOR', 'MANAGER', 'ACCOUNTANT'));

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const seesFinance = role !== 'TEACHER';
    const seesAttendance = role === 'DIRECTOR' || role === 'MANAGER';
    const today = toLocalDate();
    const period = today.slice(0, 7);

    const active = students.filter((s) => s.status === 'ACTIVE');
    const out: Record<string, unknown> = {
      students: { active: active.length, newThisMonth: students.filter((s) => s.status !== 'LEFT' && s.enrolledAt.startsWith(period)).length },
    };

    const occ = await studentRepo.occupancy();
    const classFill = (await classRepo.list()).map((c) => ({ id: c.id, name: c.name, count: occ.get(c.id) ?? 0, capacity: c.capacity }));
    out.classFill = { items: classFill, freeSeats: classFill.reduce((n, c) => n + Math.max(0, c.capacity - c.count), 0) };

    if (seesAttendance) {
      const users = (await userRepo.list()).filter((u) => u.isActive && u.role !== 'DIRECTOR');
      const todays = await attendanceRepo.list({ from: today, to: today });
      const byUser = new Map(todays.map((r) => [r.userId, r]));
      out.attendance = {
        total: users.length,
        came: todays.filter((r) => r.checkInAt).length,
        late: todays.filter((r) => r.status === 'LATE').length,
        problems: users
          .map((u) => ({ u, r: byUser.get(u.id) }))
          .filter(({ r }) => !r?.checkInAt || r.status === 'LATE')
          .map(({ u, r }) => ({
            id: u.id, fullName: u.fullName, position: u.position,
            status: r?.status === 'LATE' ? 'LATE' : r?.status === 'EXCUSED' ? 'EXCUSED' : r?.status === 'ABSENT' ? 'ABSENT' : 'NOT_ARRIVED',
            lateMinutes: r?.lateMinutes ?? 0,
          }))
          .filter((p) => p.status !== 'EXCUSED')
          .slice(0, 8),
        isWorkday: settings.workDays.includes(new Date(`${today}T00:00:00Z`).getUTCDay() || 7),
      };
    }

    if (seesFinance) {
      const [charges, payments, debts] = await Promise.all([chargeRepo.all(), paymentRepo.all(), debtMap()]);
      const factOf = (p: string) => payments.filter((x) => toLocalDate(x.paidAt).startsWith(p)).reduce((s, x) => s + x.amount, 0);
      const planOf = (p: string) => charges.filter((c) => c.period === p).reduce((s, c) => s + c.amount, 0);
      const fact = factOf(period);
      const prev = factOf(addMonths(period, -1));
      out.revenue = { fact, plan: planOf(period), changePct: prev > 0 ? Math.round(((fact - prev) / prev) * 100) : null };
      out.chart = [-5, -4, -3, -2, -1, 0].map((n) => {
        const p = addMonths(period, n);
        return { period: p, plan: planOf(p), fact: factOf(p) };
      });
      const debtors = [...debts.entries()].filter(([, d]) => d.debt > 0);
      out.debt = { total: debtors.reduce((s, [, d]) => s + d.debt, 0), count: debtors.length };
      out.topDebtors = await Promise.all(
        debtors.sort((a, b) => b[1].debt - a[1].debt).slice(0, 5).map(async ([id, d]) => {
          const s = (await studentRepo.findById(id))!;
          return { studentId: id, name: fullName(s), className: s.classId ? ((await classRepo.findById(s.classId))?.name ?? null) : null, debt: d.debt, overdueDays: d.overdueDays };
        }),
      );
    }
    res.json(out);
  } catch (e) {
    next(e);
  }
});
