import { api } from './api';

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  lateMinutes: number;
  note?: string | null;
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
        settings: { workStart: string; workEnd: string; graceMinutes: number; radiusM: number };
      }>('/attendance/today')
      .then((r) => r.data),
  checkIn: (p: PunchPayload) => api.post('/attendance/check-in', p).then((r) => r.data.record as AttendanceRecord),
  checkOut: (p: PunchPayload) => api.post('/attendance/check-out', p).then((r) => r.data.record as AttendanceRecord),
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
