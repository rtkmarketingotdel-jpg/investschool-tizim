import { Router } from 'express';
import { settings } from '../data/mockStore.js';
import { students } from '../data/mockStudents.js';
import { toLocalDate } from '../lib/date.js';
import { addMonths } from '../lib/period.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
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
    const groupsById = new Map((await groupRepo.list()).map((g) => [g.id, g]));

    const active = students.filter((s) => s.status === 'ACTIVE');
    const out: Record<string, unknown> = {
      students: {
        active: active.length,
        newThisMonth: students.filter((s) => s.status !== 'LEFT' && s.enrolledAt.startsWith(period)).length,
        graduatedThisMonth: students.filter((s) => s.status === 'GRADUATED' && (s.groupId ? groupsById.get(s.groupId)?.endDate.startsWith(period) : false)).length,
      },
    };

    // running and upcoming groups: how full they are (finished groups no longer take trainees)
    const occ = await studentRepo.occupancy();
    const courseName = new Map((await courseRepo.list()).map((c) => [c.id, c.name]));
    const groupFill = [...groupsById.values()]
      .filter((g) => groupStatus(g, today) !== 'FINISHED')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((g) => ({ id: g.id, name: g.name, courseName: courseName.get(g.courseId) ?? '—', status: groupStatus(g, today), startDate: g.startDate, count: occ.get(g.id) ?? 0, capacity: g.capacity }));
    out.groupFill = { items: groupFill, freeSeats: groupFill.reduce((n, g) => n + Math.max(0, g.capacity - g.count), 0) };

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
      // "sold": course bills opened in the month (enrolments), against the money actually received
      const planOf = (p: string) => charges.filter((c) => toLocalDate(c.createdAt).startsWith(p)).reduce((s, c) => s + c.amount, 0);
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
          return { studentId: id, name: fullName(s), groupName: s.groupId ? (groupsById.get(s.groupId)?.name ?? null) : null, debt: d.debt, overdueDays: d.overdueDays };
        }),
      );
    }
    res.json(out);
  } catch (e) {
    next(e);
  }
});
