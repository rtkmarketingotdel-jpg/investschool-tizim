export type Role = 'DIRECTOR' | 'ACCOUNTANT' | 'ADMIN' | 'STAFF';
export type Lang = 'uz' | 'ru';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: Role;
  position: string;
  isTeacher: boolean;
  subject: string | null;
  /** null = may check in at any branch */
  branchId: string | null;
  baseSalary: number;
  language: Lang;
  isActive: boolean;
  hiredAt: Date;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radiusM: number;
}

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
  branchId: string | null;
  /** Mock-only: the position is derived from the branch centre + this offset, so it follows the branch when it moves. */
  geoOffset?: [number, number];
}

export interface Setting {
  maxGpsAccuracyM: number;
  /** When false the distance is recorded but not enforced (demo/dev on a laptop). */
  geoEnforced: boolean;
  workStart: string;
  workEnd: string;
  graceMinutes: number;
  workDays: number[]; // 1=Mon ... 7=Sun
  lateFinePerMinute: number;
  lateFineMax: number;
  absentFine: number;
  paymentDueDay: number;
  contractPrefix: string;
  telegramChatId: string | null;
}

export type StudentStatus = 'ACTIVE' | 'TRIAL' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';

export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
  capacity: number;
  teacherId: string | null;
  branchId: string | null;
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

export type PaymentMethod = 'CASH' | 'CARD' | 'CLICK' | 'PAYME' | 'TRANSFER';
export type AdjustmentType = 'BONUS' | 'FINE';
export type AdjustmentSource = 'MANUAL' | 'ATTENDANCE';
export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED';

export interface StudentCharge {
  id: string;
  studentId: string;
  period: string; // YYYY-MM
  amount: number;
  dueDate: string; // YYYY-MM-DD
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  period: string | null;
  paidAt: Date;
  receivedById: string | null;
  note: string | null;
}

export interface PayrollAdjustment {
  id: string;
  userId: string;
  period: string;
  type: AdjustmentType;
  source: AdjustmentSource;
  amount: number;
  /** Free text for MANUAL, or "LATE:<minutes>" / "ABSENT" for ATTENDANCE (translated by the client). */
  reason: string;
  attendanceId: string | null;
  createdAt: Date;
}

export interface Payroll {
  id: string;
  userId: string;
  period: string;
  baseSalary: number;
  bonusTotal: number;
  fineTotal: number;
  total: number;
  workedDays: number;
  lateCount: number;
  absentCount: number;
  status: PayrollStatus;
  approvedAt: Date | null;
  paidAt: Date | null;
}

export interface ContractTemplate {
  id: string;
  name: string;
  language: Lang;
  body: string;
  isDefault: boolean;
}

export interface Contract {
  id: string;
  number: string;
  studentId: string;
  templateId: string;
  language: Lang;
  monthlyFee: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  publicToken: string;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  /** Only kept in DEMO mode so staff can read the code out to the parent. */
  otpDemoCode: string | null;
  signedAt: Date | null;
  signedIp: string | null;
  signedUserAgent: string | null;
  signerPhone: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string; // i18n key
  body: string; // i18n key
  params: Record<string, string | number> | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}
