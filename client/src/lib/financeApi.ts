import { api } from './api';
import type { Paged, Role } from './schoolApi';

export type PaymentMethod = 'CASH' | 'CARD' | 'CLICK' | 'PAYME' | 'TRANSFER';
export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CLICK', 'PAYME', 'TRANSFER'];

export interface Dashboard {
  students: { active: number; newThisMonth: number };
  classFill: { items: Array<{ id: string; name: string; count: number; capacity: number }>; freeSeats: number };
  attendance?: {
    total: number;
    came: number;
    late: number;
    isWorkday: boolean;
    problems: Array<{ id: string; fullName: string; position: string; status: 'LATE' | 'NOT_ARRIVED' | 'ABSENT'; lateMinutes: number }>;
  };
  revenue?: { fact: number; plan: number; changePct: number | null };
  chart?: Array<{ period: string; plan: number; fact: number }>;
  debt?: { total: number; count: number };
  topDebtors?: Array<{ studentId: string; name: string; className: string | null; debt: number; overdueDays: number }>;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  params: Record<string, string | number> | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  className: string | null;
  amount: number;
  method: PaymentMethod;
  period: string | null;
  paidAt: string;
  receivedByName: string | null;
  note: string | null;
}
export interface PaymentsResponse extends Paged<Payment> {
  summary: { total: number; count: number; byMethod: Record<string, number> };
}
export interface Debtor {
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  className: string | null;
  debt: number;
  overdueDays: number;
  oldestPeriod: string | null;
  lastPaymentAt: string | null;
}
export interface DebtorsResponse extends Paged<Debtor> {
  summary: { totalDebt: number; count: number };
}
export interface StudentFinance {
  balance: number;
  debt: number;
  overdueDays: number;
  timeline: Array<{ kind: 'CHARGE' | 'PAYMENT'; id: string; date: string; period: string | null; amount: number; method: PaymentMethod | null }>;
}

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID';
export interface PayrollRow {
  id: string;
  userId: string;
  fullName: string;
  position: string;
  period: string;
  baseSalary: number;
  bonusTotal: number;
  fineTotal: number;
  total: number;
  workedDays: number;
  lateCount: number;
  absentCount: number;
  status: PayrollStatus;
}
export interface Adjustment {
  id: string;
  type: 'BONUS' | 'FINE';
  source: 'MANUAL' | 'ATTENDANCE';
  amount: number;
  reason: string;
  createdAt: string;
}
/** Live estimate for the current month (base + bonuses - fines), even before the accountant calculates it. */
export interface PayrollCurrent {
  period: string;
  status: PayrollStatus | 'ESTIMATE';
  baseSalary: number;
  bonusTotal: number;
  fineTotal: number;
  total: number;
  workedDays: number;
  lateCount: number;
  absentCount: number;
  adjustments: Adjustment[];
}
export interface PayrollMine {
  items: Array<PayrollRow & { adjustments: Adjustment[] }>;
  current: PayrollCurrent;
}
export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'CANCELLED';
export interface ContractRow {
  id: string;
  number: string;
  studentId: string;
  studentName: string;
  parentName: string;
  language: 'uz' | 'ru';
  monthlyFee: number;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  publicToken: string;
  createdAt: string;
  signedAt: string | null;
  demoCode: string | null;
}
export interface Template {
  id: string;
  name: string;
  language: 'uz' | 'ru';
  body: string;
  isDefault: boolean;
}
export interface Settings {
  maxGpsAccuracyM: number;
  geoEnforced: boolean;
  workStart: string;
  workEnd: string;
  graceMinutes: number;
  workDays: number[];
  lateFinePerMinute: number;
  lateFineMax: number;
  absentFine: number;
  paymentDueDay: number;
  contractPrefix: string;
  telegramChatId: string | null;
  smsDebtAutoEnabled: boolean;
  smsDebtEveryDays: number;
  smsDebtMinOverdueDays: number;
  smsDebtTemplateId: string | null;
}
export interface Matrix {
  month: string;
  days: string[];
  workDays: number[];
  rows: Array<{
    user: { id: string; fullName: string; position: string };
    days: Record<string, 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED'>;
    totals: { onTime: number; late: number; absent: number; excused: number };
  }>;
}
export interface PublicContract {
  number: string;
  language: 'uz' | 'ru';
  status: ContractStatus;
  signedAt: string | null;
  blocks: Array<{ heading: string | null; paragraphs: string[] }>;
  school: string;
  demoMode: boolean;
}

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const financeApi = {
  dashboard: () => api.get<Dashboard>('/dashboard').then((r) => r.data),

  notifications: () => api.get<{ items: AppNotification[]; unread: number }>('/notifications').then((r) => r.data),
  readAll: () => api.post('/notifications/read-all'),
  readOne: (id: string) => api.post(`/notifications/${id}/read`),

  payments: (p: { from?: string; to?: string; method?: string; classId?: string; page: number; limit: number }) =>
    api.get<PaymentsResponse>('/payments', { params: clean(p) }).then((r) => r.data),
  createPayment: (d: { studentId: string; amount: number; method: PaymentMethod; period: string | null; note: string | null }) =>
    api.post<{ payment: Payment; debt: number }>('/payments', d).then((r) => r.data),
  studentFinance: (id: string) => api.get<StudentFinance>(`/students/${id}/finance`).then((r) => r.data),

  debtors: (p: { q?: string; classId?: string; page: number; limit: number }) =>
    api.get<DebtorsResponse>('/debtors', { params: clean(p) }).then((r) => r.data),

  payroll: (period: string) =>
    api.get<{ period: string; items: PayrollRow[]; summary: { total: number; bonus: number; fine: number } }>('/payroll', { params: { period } }).then((r) => r.data),
  payrollDetail: (id: string) => api.get<PayrollRow & { adjustments: Adjustment[] }>(`/payroll/${id}`).then((r) => r.data),
  payrollMine: () => api.get<PayrollMine>('/payroll/mine').then((r) => r.data),
  calculatePayroll: (period: string) => api.post<{ calculated: number; skipped: number }>('/payroll/calculate', { period }).then((r) => r.data),
  addAdjustment: (d: { userId: string; period: string; type: 'BONUS' | 'FINE'; amount: number; reason: string }) =>
    api.post('/payroll/adjustments', d).then((r) => r.data),
  approvePayroll: (id: string) => api.post(`/payroll/${id}/approve`).then((r) => r.data),
  payPayroll: (id: string) => api.post(`/payroll/${id}/pay`).then((r) => r.data),

  contracts: (p: { q?: string; status?: string; studentId?: string; page: number; limit: number }) =>
    api.get<Paged<ContractRow>>('/contracts', { params: clean(p) }).then((r) => r.data),
  contractDefaults: (studentId: string) =>
    api.get<{ monthlyFee: number; className: string | null; parentName: string }>(`/contracts/defaults/${studentId}`).then((r) => r.data),
  createContract: (d: { studentId: string; templateId: string; monthlyFee: number; startDate: string; endDate: string }) =>
    api.post<ContractRow>('/contracts', d).then((r) => r.data),
  sendContract: (id: string) => api.post<ContractRow>(`/contracts/${id}/send`).then((r) => r.data),
  cancelContract: (id: string) => api.post<ContractRow>(`/contracts/${id}/cancel`).then((r) => r.data),
  contractClasses: () =>
    api.get<{ items: Array<{ id: string; name: string; studentCount: number; signed: number; sent: number; draft: number; none: number }> }>('/contracts/classes').then((r) => r.data.items),
  contractClass: (id: string) =>
    api.get<{
      class: { id: string; name: string };
      items: Array<{ student: { id: string; fullName: string; parentName: string; parentPhone: string; monthlyFee: number }; contract: ContractRow | null }>;
    }>(`/contracts/classes/${id}`).then((r) => r.data),
  templates: () => api.get<{ items: Template[] }>('/contracts/templates').then((r) => r.data.items),
  saveTemplate: (id: string | null, d: Omit<Template, 'id'>) =>
    (id ? api.put<Template>(`/contracts/templates/${id}`, d) : api.post<Template>('/contracts/templates', d)).then((r) => r.data),
  deleteTemplate: (id: string) => api.delete(`/contracts/templates/${id}`),

  publicContract: (token: string) => api.get<PublicContract>(`/public/contracts/${token}`).then((r) => r.data),
  requestOtp: (token: string) => api.post<{ delivery: 'sms' | 'demo' }>(`/public/contracts/${token}/otp`, { agree: true }).then((r) => r.data),
  signContract: (token: string, code: string) => api.post(`/public/contracts/${token}/sign`, { code }).then((r) => r.data),

  settings: () => api.get<{ settings: Settings }>('/settings').then((r) => r.data.settings),
  saveSettings: (patch: Partial<Settings>) => api.put<{ settings: Settings }>('/settings', patch).then((r) => r.data.settings),
  testTelegram: () => api.post('/settings/telegram/test'),
  telegramChats: () => api.get<{ items: Array<{ id: string; type: string; title: string }> }>('/settings/telegram/chats').then((r) => r.data.items),

  matrix: (month: string) => api.get<Matrix>('/attendance/matrix', { params: { month } }).then((r) => r.data),
  setAttendanceStatus: (id: string, status: string, note: string | null) => api.patch(`/attendance/${id}`, { status, note }).then((r) => r.data),

  staffOverview: (id: string, month: string) =>
    api.get<{
      user: { id: string; fullName: string; phone: string; role: Role; position: string; baseSalary: number; isActive: boolean; isTeacher: boolean; isTutor: boolean; subject: string | null; photoUrl: string | null; branchId: string | null };
      profile: { achievements: Array<{ id: string; title: string; year: number | null; description: string }>; documents: Array<{ id: string; kind: 'CERTIFICATE' | 'DIPLOMA' | 'OTHER'; title: string; issuer: string | null; year: number | null; fileUrl: string; mime: string }>; completed: boolean; branchName: string | null; hiredAt: string; classesLed: string[]; clubsLed: string[] };
      month: string;
      attendance: Array<{ id: string; date: string; status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED'; lateMinutes: number; checkInAt: string | null; checkOutAt: string | null }>;
      payrolls: PayrollRow[];
      adjustments: Adjustment[];
      seesPay: boolean;
    }>(`/staff/${id}/overview`, { params: { month } }).then((r) => r.data),
};

/** Opens an authenticated PDF (or any blob endpoint) in a new tab. */
export async function openPdf(path: string, method: 'get' | 'post' = 'get', body?: unknown) {
  const w = window.open('', '_blank');
  try {
    const res = await api.request<Blob>({ url: path, method, data: body, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    throw e;
  }
}

export async function downloadCsv(path: string, filename: string, params?: Record<string, string>) {
  const res = await api.get<Blob>(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
