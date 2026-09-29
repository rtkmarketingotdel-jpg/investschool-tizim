import { api } from './api';

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  lateMinutes: number;
  note?: string | null;
  branchId?: string | null;
  selfieSent?: boolean;
  selfieOutSent?: boolean;
  checkInAt: string | null;
  checkInPhotoUrl: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInDistanceM: number | null;
  checkOutAt: string | null;
  checkOutPhotoUrl: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutDistanceM: number | null;
  user?: { id: string; fullName: string; position: string } | null;
}

export interface Stats {
  onTime: number;
  late: number;
  absent: number;
  excused: number;
}

/** `selfie` says whether the photo reached the director on Telegram (it is never stored on our side). */
export interface PunchResult {
  record: AttendanceRecord;
  selfie: 'sent' | 'failed' | 'not_configured';
}

export interface PunchPayload {
  photo: string;
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
}

export const attendanceApi = {
  today: () =>
    api
      .get<{
        today: string;
        record: AttendanceRecord | null;
        settings: { workStart: string; workEnd: string; graceMinutes: number; geoEnforced: boolean; maxGpsAccuracyM: number };
        branches: Array<{ id: string; name: string; lat: number; lng: number; radiusM: number }>;
      }>('/attendance/today')
      .then((r) => r.data),
  checkIn: (p: PunchPayload) => api.post<PunchResult>('/attendance/check-in', p).then((r) => r.data),
  checkOut: (p: PunchPayload) => api.post<PunchResult>('/attendance/check-out', p).then((r) => r.data),
  day: (date: string, branchId: string) =>
    api
      .get<{
        date: string;
        isWorkday: boolean;
        rows: Array<{ user: { id: string; fullName: string; position: string; role: string }; branchId: string | null; branchName: string | null; record: AttendanceRecord | null; state: AttendanceStatus | 'NOT_YET' }>;
        summary: { total: number; came: number; onTime: number; late: number; absent: number; excused: number; notYet: number; left: number };
      }>('/attendance/day', { params: { date, branchId: branchId || undefined } })
      .then((r) => r.data),
  map: () =>
    api
      .get<{
        branches: Array<{ id: string; name: string; lat: number; lng: number; radiusM: number }>;
        points: Array<{ userId: string; fullName: string; position: string; lat: number; lng: number; checkInAt: string; status: AttendanceStatus; lateMinutes: number; distanceM: number | null; photoUrl: string | null; branchName: string | null }>;
        counts: { onSite: number; left: number };
      }>('/attendance/map')
      .then((r) => r.data),
  mine: (month: string) =>
    api.get<{ records: AttendanceRecord[]; stats: Stats }>('/attendance/mine', { params: { month } }).then((r) => r.data),
  list: (params: { from?: string; to?: string; page: number; limit: number }) =>
    api
      .get<{
        items: AttendanceRecord[];
        total: number;
        today: Stats & { workers: number };
      }>('/attendance', { params })
      .then((r) => r.data),
};
