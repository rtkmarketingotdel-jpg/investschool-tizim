import type { SmsCampaign, SmsTemplate } from './types.js';

// One example template: the debt reminder (also used by the automatic daily reminder).
export const smsTemplates: SmsTemplate[] = [
  { id: 'st1', category: 'DEBT', language: 'uz', name: 'Qarz eslatmasi (uz)', body: "Hurmatli {{name}}, {{courseName}} kursi ({{groupName}}) uchun to'lov muddati o'tdi. Qarz: {{debt}} so'm. Iltimos, to'lovni amalga oshiring. {{school}}" },
];

export const smsCampaigns: SmsCampaign[] = [];

/** studentId -> last automatic debt reminder (used to space the reminders out). */
export const lastDebtSms = new Map<string, Date>();
