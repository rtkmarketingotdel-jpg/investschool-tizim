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

export type StudentStatus = 'ACTIVE' | 'TRIAL' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';

export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
  capacity: number;
  teacherId: string | null;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null; // YYYY-MM-DD
  gender: Gender;
  classId: string | null;
  parentName: string;
  parentPhone: string;
  parentPhone2: string | null;
  address: string | null;
  district: string | null;
  isBoarding: boolean;
  clubs: string[];
  monthlyFee: number;
  discountPercent: number;
  status: StudentStatus;
  enrolledAt: string; // YYYY-MM-DD
  leftAt: string | null;
  notes: string | null;
}
