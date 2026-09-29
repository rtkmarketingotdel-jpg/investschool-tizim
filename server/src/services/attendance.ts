import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { settings } from '../data/mockStore.js';
import type { Attendance, User } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { haversineM } from '../lib/geo.js';
import { isoWeekday, localMinutes, parseHHMM, toLocalDate } from '../lib/date.js';
import { attendanceRepo } from '../repositories/attendanceRepo.js';
import { onLateCheckIn, syncFine } from './attendanceEffects.js';

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

async function savePhoto(buf: Buffer, userId: string, date: string, kind: 'in' | 'out') {
  const rel = path.join('attendance', date.slice(0, 7), `${userId}_${date}_${kind}.jpg`);
  const abs = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return `/uploads/${rel.split(path.sep).join('/')}`;
}

function validate(input: PunchInput, now: Date) {
  if (Math.abs(now.getTime() - new Date(input.capturedAt).getTime()) > MAX_CLOCK_SKEW_MS) {
    throw new ApiError(400, 'ATTENDANCE_BAD_TIMESTAMP');
  }
  const photo = decodeJpeg(input.photo);
  if (input.accuracy > settings.maxGpsAccuracyM) throw new ApiError(400, 'ATTENDANCE_LOW_ACCURACY');
  const distanceM = haversineM(input.lat, input.lng, settings.schoolLat, settings.schoolLng);
  if (settings.geoEnforced && distanceM > settings.radiusM) {
    throw new ApiError(400, 'ATTENDANCE_OUT_OF_RADIUS', { distanceM, radiusM: settings.radiusM });
  }
  return { photo, distanceM };
}

export async function checkIn(user: User, input: PunchInput, userAgent: string | undefined) {
  const now = new Date();
  const date = toLocalDate(now);
  if (!settings.workDays.includes(isoWeekday(date))) throw new ApiError(400, 'ATTENDANCE_NOT_WORKDAY');
  const existing = await attendanceRepo.findByUserDate(user.id, date);
  if (existing?.checkInAt) throw new ApiError(409, 'ATTENDANCE_ALREADY_CHECKED_IN');

  const { photo, distanceM } = validate(input, now);
  const photoUrl = await savePhoto(photo, user.id, date, 'in');

  const workStart = parseHHMM(settings.workStart);
  const minutes = localMinutes(now);
  const late = minutes > workStart + settings.graceMinutes;
  const data = {
    status: late ? ('LATE' as const) : ('ON_TIME' as const),
    lateMinutes: late ? minutes - workStart : 0,
    checkInAt: now,
    checkInPhotoUrl: photoUrl,
    checkInLat: input.lat,
    checkInLng: input.lng,
    checkInAccuracy: input.accuracy,
    checkInDistanceM: distanceM,
    deviceInfo: userAgent ?? null,
  };
  // An ABSENT row (from the noon job) is overwritten by a late check-in.
  const rec = existing
    ? (await attendanceRepo.update(existing.id, data))!
    : await attendanceRepo.create({
    userId: user.id, date, note: null,
    checkOutAt: null, checkOutPhotoUrl: null, checkOutLat: null, checkOutLng: null, checkOutDistanceM: null,
    ...data,
  });
  if (rec.status === 'LATE') await onLateCheckIn(user, rec);
  else if (existing) await syncFine(rec); // an earlier ABSENT fine no longer applies
  return rec;
}

export async function checkOut(user: User, input: PunchInput) {
  const now = new Date();
  const date = toLocalDate(now);
  const rec = await attendanceRepo.findByUserDate(user.id, date);
  if (!rec?.checkInAt) throw new ApiError(400, 'ATTENDANCE_NOT_CHECKED_IN');
  if (rec.checkOutAt) throw new ApiError(409, 'ATTENDANCE_ALREADY_CHECKED_OUT');

  const { photo, distanceM } = validate(input, now);
  const photoUrl = await savePhoto(photo, user.id, date, 'out');
  return (await attendanceRepo.update(rec.id, {
    checkOutAt: now,
    checkOutPhotoUrl: photoUrl,
    checkOutLat: input.lat,
    checkOutLng: input.lng,
    checkOutDistanceM: distanceM,
  }))!;
}

export function monthStats(records: Attendance[]) {
  return {
    onTime: records.filter((r) => r.status === 'ON_TIME').length,
    late: records.filter((r) => r.status === 'LATE').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    excused: records.filter((r) => r.status === 'EXCUSED').length,
  };
}
