import { api } from './api';
import type { Paged } from './schoolApi';

export type SmsCategory = 'DEBT' | 'GREETING' | 'WARNING' | 'OTHER';
export const SMS_CATEGORIES: SmsCategory[] = ['DEBT', 'GREETING', 'WARNING', 'OTHER'];

export type Audience =
  | { kind: 'ALL_PARENTS' }
  | { kind: 'CLASSES'; classIds: string[] }
  | { kind: 'BRANCH'; branchId: string }
  | { kind: 'DEBTORS'; minOverdueDays: number }
  | { kind: 'STAFF'; scope: 'ALL' | 'TEACHERS' | 'TUTORS'; branchId: string | null }
  | { kind: 'NUMBERS'; numbers: string[] };

export interface SmsTemplate {
  id: string;
  name: string;
  category: SmsCategory;
  language: 'uz' | 'ru';
  body: string;
}
export interface SmsStatus {
  provider: string;
  configured: boolean;
  simulated: boolean;
  from: string;
  balance: number | null;
}
export interface Compose {
  audience: Audience;
  text: string;
  bothPhones: boolean;
  lang: 'uz' | 'ru';
}
export interface SmsPreview {
  count: number;
  segments: number;
  invalidPhones: number;
  duplicates: number;
  sample: Array<{ name: string; phone: string; text: string; segments: number }>;
  info: { encoding: 'GSM7' | 'UCS2'; length: number; segments: number };
}
export type CampaignStatus = 'SCHEDULED' | 'SENDING' | 'DONE' | 'CANCELLED';
export interface Campaign {
  id: string;
  category: SmsCategory;
  title: string;
  audienceLabel: string;
  text: string;
  status: CampaignStatus;
  auto: boolean;
  scheduledAt: string | null;
  createdAt: string;
  total: number;
  sent: number;
  simulated: number;
  failed: number;
  queued: number;
  segments: number;
}
export interface SmsMessage {
  id: string;
  phone: string;
  name: string;
  text: string;
  segments: number;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'SIMULATED';
  error: string | null;
}

export const smsApi = {
  status: () => api.get<SmsStatus>('/sms/status').then((r) => r.data),
  templates: () => api.get<{ items: SmsTemplate[] }>('/sms/templates').then((r) => r.data.items),
  saveTemplate: (id: string | null, d: Omit<SmsTemplate, 'id'>) =>
    (id ? api.put<SmsTemplate>(`/sms/templates/${id}`, d) : api.post<SmsTemplate>('/sms/templates', d)).then((r) => r.data),
  deleteTemplate: (id: string) => api.delete(`/sms/templates/${id}`),
  preview: (c: Compose) => api.post<SmsPreview>('/sms/preview', c).then((r) => r.data),
  send: (c: Compose & { category: SmsCategory; title: string; scheduleAt: string | null }) => api.post<Campaign>('/sms/send', c).then((r) => r.data),
  campaigns: (p: { page: number; limit: number }) => api.get<Paged<Campaign>>('/sms/campaigns', { params: p }).then((r) => r.data),
  campaign: (id: string, p: { page: number; limit: number; status?: string }) =>
    api
      .get<Campaign & { messages: SmsMessage[]; messagesTotal: number }>(`/sms/campaigns/${id}`, { params: { ...p, status: p.status || undefined } })
      .then((r) => r.data),
  retry: (id: string) => api.post<{ retried: number }>(`/sms/campaigns/${id}/retry`).then((r) => r.data),
  cancel: (id: string) => api.post<Campaign>(`/sms/campaigns/${id}/cancel`).then((r) => r.data),
  test: (phone: string, text: string) => api.post<{ ok: boolean; simulated: boolean; segments: number }>('/sms/test', { phone, text }).then((r) => r.data),
  runAuto: () => api.post<{ sent: number }>('/sms/auto/run').then((r) => r.data),
};

/** Mirrors the server's plain-ASCII normalisation so the counter matches what will really be sent. */
export function normalizeSms(text: string): string {
  return text.replace(/[ʻʼ‘’`´]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/\u00A0/g, ' ').trim();
}

const GSM = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~]|€".split(''));
export function smsCount(raw: string) {
  const text = normalizeSms(raw);
  const gsm = [...text].every((c) => GSM.has(c));
  const length = text.length;
  const per = gsm ? [160, 153] : [70, 67];
  return { gsm, length, segments: length === 0 ? 0 : length <= per[0]! ? 1 : Math.ceil(length / per[1]!), limit: per[0]! };
}

export const PARENT_VARS = ['parentName', 'studentName', 'className', 'debt', 'overdueDays', 'month', 'school'];
export const STAFF_VARS = ['name', 'position', 'school'];
