import path from 'node:path';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import type { Attendance, Branch, User } from '../data/types.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { ApiError } from '../lib/errors.js';
import { haversineM } from '../lib/geo.js';
import { addDays, isoWeekday, localMinutes, parseHHMM, toLocalDate } from '../lib/date.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { onLateCheckIn, syncFine } from './attendanceEffects.js';
import { sendTelegramPhoto } from './telegram.js';
import { punchCaption } from './telegramText.js';

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

export const punchSchema = z.object({
  photo: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0),
  capturedAt: z.string().datetime(),
});
export type PunchInput = z.infer<typeof punchSchema>;

function decodeJpeg(dataUrl: string): Buffer {
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(dataUrl);
  if (!m) throw new ApiError(400, 'ATTENDANCE_INVALID_PHOTO');
  const buf = Buffer.from(m[1]!, 'base64');
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg) throw new ApiError(400, 'ATTENDANCE_INVALID_PHOTO');
  if (buf.length > MAX_PHOTO_BYTES) throw new ApiError(400, 'ATTENDANCE_PHOTO_TOO_LARGE');
  return buf;
}

/** Branches the employee may check in at: their own, or all when none is assigned. */
export async function allowedBranches(user: Pick<User, 'branchId'>) {
  const all = await branchRepo.list();
  const own = user.branchId ? all.filter((b) => b.id === user.branchId) : [];
  return own.length ? own : all;
}

export function nearestBranch(branches: Branch[], lat: number, lng: number) {
  let best: { branch: Branch; distanceM: number } | null = null;
  for (const b of branches) {
    const d = haversineM(lat, lng, b.lat, b.lng);
    if (!best || d < best.distanceM) best = { branch: b, distanceM: d };
  }
  return best;
}

async function validate(input: PunchInput, now: Date, user: User) {
  if (Math.abs(now.getTime() - new Date(input.capturedAt).getTime()) > MAX_CLOCK_SKEW_MS) {
    throw new ApiError(400, 'ATTENDANCE_BAD_TIMESTAMP');
  }
  const photo = decodeJpeg(input.photo);
  if (input.accuracy > settings.maxGpsAccuracyM) throw new ApiError(400, 'ATTENDANCE_LOW_ACCURACY');
  const near = nearestBranch(await allowedBranches(user), input.lat, input.lng);
  if (near && near.distanceM > near.branch.radiusM) {
    throw new ApiError(400, 'ATTENDANCE_OUT_OF_RADIUS', { distanceM: near.distanceM, radiusM: near.branch.radiusM, branch: near.branch.name });
  }
  return { photo, distanceM: near?.distanceM ?? null, branchId: near?.branch.id ?? user.branchId };
}

const fmtClock = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

/** The selfie goes straight to the director's Telegram with who/when/where; nothing is kept on our side. */
async function reportSelfie(user: User, rec: Attendance, photo: Buffer, kind: 'in' | 'out') {
  const at = kind === 'in' ? rec.checkInAt : rec.checkOutAt;
  const branch = rec.branchId ? await branchRepo.findById(rec.branchId) : null;
  const dist = kind === 'in' ? rec.checkInDistanceM : rec.checkOutDistanceM;
  const place = [branch?.name, dist != null ? `${dist} m` : null].filter(Boolean).join(' · ');
  const caption = punchCaption({
    kind, name: user.fullName, position: user.position, time: at ? fmtClock(at) : '', date: rec.date, place,
    late: rec.status === 'LATE' ? rec.lateMinutes : null,
  });
  return sendTelegramPhoto(photo, caption);
}

export async function checkIn(user: User, input: PunchInput, userAgent: string | undefined) {
  if (user.role === 'DIRECTOR') throw new ApiError(403, 'ATTENDANCE_NOT_TRACKED');
  const now = new Date();
  const date = toLocalDate(now);
  if (!settings.workDays.includes(isoWeekday(date))) throw new ApiError(400, 'ATTENDANCE_NOT_WORKDAY');
  const existing = await attendanceRepo.findByUserDate(user.id, date);
  if (existing?.checkInAt) throw new ApiError(409, 'ATTENDANCE_ALREADY_CHECKED_IN');

  const { photo, distanceM, branchId } = await validate(input, now, user);

  const workStart = parseHHMM(settings.workStart);
  const minutes = localMinutes(now);
  const late = minutes > workStart + settings.graceMinutes;
  const keepExcused = existing?.status === 'EXCUSED'; // an excused day stays excused, the arrival time is still recorded
  const data = {
    status: keepExcused ? ('EXCUSED' as const) : late ? ('LATE' as const) : ('ON_TIME' as const),
    lateMinutes: keepExcused || !late ? 0 : minutes - workStart,
    checkInAt: now,
    checkInPhotoUrl: null,
    selfieSent: false,
    checkInLat: input.lat,
    checkInLng: input.lng,
    checkInAccuracy: input.accuracy,
    checkInDistanceM: distanceM,
    branchId,
    deviceInfo: userAgent ?? null,
  };
  // An ABSENT row (from the noon job) is overwritten by a late check-in.
  const rec = existing
    ? (await attendanceRepo.update(existing.id, data))!
    : await attendanceRepo.create({
    userId: user.id, date, note: null,
    checkOutAt: null, checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null, checkOutDistanceM: null, selfieOutSent: false,
    ...data,
  });
  if (rec.status === 'LATE' && !keepExcused) await onLateCheckIn(user, rec);
  else if (existing) await syncFine(rec); // an earlier ABSENT fine no longer applies
  const selfie = await reportSelfie(user, rec, photo, 'in');
  await attendanceRepo.update(rec.id, { selfieSent: selfie === 'sent' });
  return { record: rec, selfie };
}

export async function checkOut(user: User, input: PunchInput) {
  if (user.role === 'DIRECTOR') throw new ApiError(403, 'ATTENDANCE_NOT_TRACKED');
  const now = new Date();
  const date = toLocalDate(now);
  // a shift that runs past midnight closes yesterday's open record
  let rec = await attendanceRepo.findByUserDate(user.id, date);
  if (!rec?.checkInAt) {
    const prev = await attendanceRepo.findByUserDate(user.id, addDays(date, -1));
    if (prev?.checkInAt && !prev.checkOutAt) rec = prev;
  }
  if (!rec?.checkInAt) throw new ApiError(400, 'ATTENDANCE_NOT_CHECKED_IN');
  if (rec.checkOutAt) throw new ApiError(409, 'ATTENDANCE_ALREADY_CHECKED_OUT');

  const { photo, distanceM } = await validate(input, now, user);
  const updated = (await attendanceRepo.update(rec.id, {
    checkOutAt: now,
    checkOutPhotoUrl: null,
    checkOutLat: input.lat,
    checkOutLng: input.lng,
    checkOutDistanceM: distanceM,
  }))!;
  const selfie = await reportSelfie(user, updated, photo, 'out');
  await attendanceRepo.update(rec.id, { selfieOutSent: selfie === 'sent' });
  return { record: updated, selfie };
}

export function monthStats(records: Attendance[]) {
  return {
    onTime: records.filter((r) => r.status === 'ON_TIME').length,
    late: records.filter((r) => r.status === 'LATE').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    excused: records.filter((r) => r.status === 'EXCUSED').length,
  };
}
