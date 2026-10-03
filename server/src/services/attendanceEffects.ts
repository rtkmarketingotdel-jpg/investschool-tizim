import { settings } from '../data/mockStore.js';
import type { Attendance, User } from '../data/types.js';
import { isoWeekday, toLocalDate } from '../lib/date.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { adjustmentRepo } from '../repositories/financeRepo.js';
import { audit, notifyRoles } from '../repositories/notificationRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { lateFine } from './payrollCalc.js';
import { refreshDraft } from './payroll.js';
import { sendTelegram } from './telegram.js';

/** Replaces any ATTENDANCE fine linked to the record with the one matching its current status. */
export async function syncFine(rec: Attendance) {
  const removed = await adjustmentRepo.removeByAttendance(rec.id);
  const period = rec.date.slice(0, 7);
  const amount =
    rec.status === 'LATE' ? lateFine(rec.lateMinutes, settings.lateFinePerMinute, settings.lateFineMax)
    : rec.status === 'ABSENT' ? settings.absentFine
    : 0;
  if (amount > 0) {
    await adjustmentRepo.create({
      userId: rec.userId, period, type: 'FINE', source: 'ATTENDANCE', amount,
      reason: rec.status === 'LATE' ? `LATE:${rec.lateMinutes}` : 'ABSENT', attendanceId: rec.id,
    });
  }
  const periods = new Set([period, ...removed.map((r) => r.period)]);
  for (const p of periods) await refreshDraft(rec.userId, p);
}

export async function onLateCheckIn(user: User, rec: Attendance) {
  await syncFine(rec);
  await notifyRoles(['DIRECTOR', 'MANAGER'], 'notif.late', { name: user.fullName, minutes: rec.lateMinutes }, '/attendance');
}

/** Noon job: marks active employees without a check-in as ABSENT (workdays only). */
export async function markAbsentees(date = toLocalDate()): Promise<number> {
  if (!settings.workDays.includes(isoWeekday(date))) return 0;
  const absent: User[] = [];
  for (const u of await userRepo.list()) {
    if (!u.isActive || u.role === 'DIRECTOR') continue; // the director supervises attendance, he is not tracked
    if (await attendanceRepo.findByUserDate(u.id, date)) continue;
    const rec = await attendanceRepo.create({
      userId: u.id, date, status: 'ABSENT', lateMinutes: 0, checkInAt: null, checkInPhotoUrl: null, checkInLat: null, checkInLng: null,
      checkInAccuracy: null, checkInDistanceM: null, checkOutAt: null, checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null,
      checkOutDistanceM: null, deviceInfo: null, note: null, branchId: u.branchId, selfieSent: false, selfieOutSent: false,
    });
    await syncFine(rec);
    absent.push(u);
  }
  if (absent.length) {
    await notifyRoles(['DIRECTOR', 'MANAGER'], 'notif.absent', { count: absent.length, names: absent.map((a) => a.fullName).slice(0, 3).join(', ') }, '/attendance');
    await sendTelegram(`❌ Kelmadi (${absent.length}): ${absent.map((a) => a.fullName).join(', ')}`);
  }
  return absent.length;
}

export async function dailyReport(date = toLocalDate()) {
  const recs = await attendanceRepo.list({ from: date, to: date });
  const came = recs.filter((r) => r.checkInAt).length;
  const late = recs.filter((r) => r.status === 'LATE').length;
  const absent = recs.filter((r) => r.status === 'ABSENT').length;
  await sendTelegram(`📊 Bugun: ${came} keldi, ${late} kechikdi, ${absent} kelmadi`);
}

export async function setStatus(rec: Attendance, status: Attendance['status'], note: string | null, actorId: string) {
  const before = rec.status;
  const updated = (await attendanceRepo.update(rec.id, {
    status,
    note,
    lateMinutes: status === 'LATE' ? rec.lateMinutes : status === 'EXCUSED' || status === 'ABSENT' ? 0 : rec.lateMinutes,
  }))!;
  // EXCUSED removes the linked fine; other statuses re-derive it.
  await syncFine(updated);
  await audit(actorId, 'attendance.update', 'attendance', rec.id, { from: before, to: status, note });
  return updated;
}
