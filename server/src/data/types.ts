export type Role = 'DIRECTOR' | 'ACCOUNTANT' | 'ADMIN' | 'STAFF';
export type Lang = 'uz' | 'ru';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: Role;
  position: string;
  baseSalary: number;
  language: Lang;
  isActive: boolean;
  hiredAt: Date;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export type AttendanceStatus = 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED';

export interface Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD, Asia/Tashkent
  status: AttendanceStatus;
  lateMinutes: number;
  checkInAt: Date | null;
  checkInPhotoUrl: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInAccuracy: number | null;
  checkInDistanceM: number | null;
  checkOutAt: Date | null;
  checkOutPhotoUrl: string | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkOutDistanceM: number | null;
  deviceInfo: string | null;
  note: string | null;
}

export interface Setting {
  schoolLat: number;
  schoolLng: number;
  radiusM: number;
  maxGpsAccuracyM: number;
  /** When false the distance is recorded but not enforced (demo/dev on a laptop). */
  geoEnforced: boolean;
  workStart: string;
  workEnd: string;
  graceMinutes: number;
  workDays: number[]; // 1=Mon ... 7=Sun
}
