export type Role = 'DIRECTOR' | 'MANAGER' | 'ACCOUNTANT' | 'TEACHER';
export type Lang = 'uz' | 'ru';

export interface Achievement {
  id: string;
  title: string;
  year: number | null;
  description: string;
}

export type DocumentKind = 'CERTIFICATE' | 'DIPLOMA' | 'OTHER';
export interface StaffDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  issuer: string | null;
  year: number | null;
  fileUrl: string;
  mime: string;
}

/** A vocational programme (kasb kursi): its full price is billed once per enrolment. */
export interface Course {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string | null;
}

export interface User {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: Role;
  position: string;
  isTeacher: boolean;
  /** Course name the teacher (master) teaches; kept in sync when the course is renamed. */
  specialty: string | null;
  photoUrl: string | null;
  achievements: Achievement[];
  documents: StaffDocument[];
  /** null until the employee has completed the first-login profile (the director is exempt). */
  profileCompletedAt: Date | null;
  /** null = may check in at any branch */
  branchId: string | null;
  /** Personal Telegram chat, linked by the employee through the bot (salary notices go there). */
  telegramChatId: string | null;
  baseSalary: number;
  language: Lang;
  isActive: boolean;
  hiredAt: Date;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash' | 'achievements' | 'documents'>;

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
  /** Whether the selfie reached the director on Telegram (photos are never stored on our side). */
  selfieSent: boolean;
  selfieOutSent: boolean;
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
  /** Days after the group start (or a later enrolment) by which the course price is due. */
  paymentDueDays: number;
  contractPrefix: string;
  telegramChatId: string | null;
  /** Automatic debtor reminders (daily job). */
  smsDebtAutoEnabled: boolean;
  smsDebtEveryDays: number;
  smsDebtMinOverdueDays: number;
  smsDebtTemplateId: string | null;
}

export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';

/** Derived from the dates: PLANNED before startDate, FINISHED after endDate. */
export type GroupStatus = 'PLANNED' | 'ACTIVE' | 'FINISHED';

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string | null;
  branchId: string | null;
  capacity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number[]; // 1=Mon ... 7=Sun
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  room: string | null;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null; // YYYY-MM-DD
  gender: Gender;
  groupId: string | null;
  phone: string;
  phone2: string | null;
  /** Passport series and number, e.g. AB1234567. */
  passport: string | null;
  /** JSHSHIR, 14 digits. */
  pinfl: string | null;
  address: string | null;
  district: string | null;
  /** Agreed full course price before the discount. */
  coursePrice: number;
  discountPercent: number;
  status: StudentStatus;
  /** Id of the trainee in the system that sent them over the API (Nazorat AI); makes repeated sends idempotent. */
  externalId: string | null;
  /** Course label the external system sent (kept to place the trainee once the label is linked to a group). */
  externalCourse: string | null;
  enrolledAt: string; // YYYY-MM-DD
  leftAt: string | null;
  notes: string | null;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'CLICK' | 'PAYME' | 'TRANSFER';
export type AdjustmentType = 'BONUS' | 'FINE';
export type AdjustmentSource = 'MANUAL' | 'ATTENDANCE';
export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED';

/** The course bill: one per student (an enrolment), its amount follows the price and discount. */
export interface StudentCharge {
  id: string;
  studentId: string;
  groupId: string | null;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  createdAt: Date;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
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
  price: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  publicToken: string;
  otpHash: string | null;
  otpExpiresAt: Date | null;
  otpAttempts: number;
  /** Only kept in DEMO mode so staff can read the code out to the trainee. */
  otpDemoCode: string | null;
  signedAt: Date | null;
  signedIp: string | null;
  signedUserAgent: string | null;
  signerPhone: string | null;
  /** Text and values frozen when the contract is sent: later template/student/brand edits must not rewrite it. */
  snapshot: { body: string; values: Record<string, string> } | null;
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

export type SmsCategory = 'DEBT' | 'GREETING' | 'WARNING' | 'OTHER';
export type SmsMessageStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SIMULATED';
export type SmsCampaignStatus = 'SCHEDULED' | 'SENDING' | 'DONE' | 'CANCELLED';

export interface SmsTemplate {
  id: string;
  name: string;
  category: SmsCategory;
  language: Lang;
  body: string;
}

export interface SmsMessage {
  id: string;
  phone: string;
  name: string;
  text: string;
  segments: number;
  status: SmsMessageStatus;
  error: string | null;
  providerId: string | null;
  studentId: string | null;
  sentAt: Date | null;
}

export interface SmsCampaign {
  id: string;
  category: SmsCategory;
  title: string;
  audienceLabel: string;
  text: string;
  status: SmsCampaignStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  createdById: string | null;
  auto: boolean;
  messages: SmsMessage[];
}

/** Key for the integration API (/api/v1). Only a hash is kept; the full key is shown once when it is created. */
export interface ApiKey {
  id: string;
  name: string;
  /** First characters of the key, shown in the list to tell keys apart. */
  prefix: string;
  hash: string;
  createdAt: Date;
  createdById: string | null;
  lastUsedAt: Date | null;
}

/** Maps a course label used by an external system (e.g. Nazorat AI "Samarqand santexnika") to a group of this centre. */
export interface CourseLink {
  id: string;
  label: string;
  /** null until the director links the label (it is recorded automatically when a trainee arrives with it). */
  groupId: string | null;
}

export type TopicKind = 'THEORY' | 'PRACTICE';

/** One topic of a lesson plan; `lessons` is how many lessons it takes. */
export interface PlanTopic {
  id: string;
  title: string;
  description: string | null;
  kind: TopicKind;
  lessons: number;
  /** Optional link or note about materials. */
  materials: string | null;
}

/** The course's master plan: a group copies it and then orders it with its trainees. */
export interface CoursePlan {
  id: string;
  courseId: string;
  topics: PlanTopic[];
  updatedAt: Date;
  updatedById: string | null;
}

/** A group's own plan; topic order is the teaching order, dates follow from the group schedule. */
export interface GroupPlan {
  id: string;
  groupId: string;
  topics: PlanTopic[];
  /** Ids of the topics already taught. */
  done: string[];
  /** Token of the public link (/p/:token); renewing it disables the old link. */
  publicToken: string;
  updatedAt: Date;
  updatedById: string | null;
}
