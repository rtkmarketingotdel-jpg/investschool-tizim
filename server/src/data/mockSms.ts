import type { SmsCampaign, SmsTemplate } from './types.js';

export const smsTemplates: SmsTemplate[] = [
  // ---- debt reminders ----
  { id: 'st1', category: 'DEBT', language: 'uz', name: 'Qarz eslatmasi (uz)', body: "Hurmatli {{parentName}}, {{studentName}} ({{className}}) uchun {{month}} oyi to'lovi muddati o'tdi. Qarz: {{debt}} so'm. Iltimos, to'lovni amalga oshiring. {{school}}" },
  { id: 'st2', category: 'DEBT', language: 'ru', name: 'Напоминание о долге (ru)', body: 'Уважаемый(ая) {{parentName}}, срок оплаты за {{month}} для {{studentName}} ({{className}}) истёк. Долг: {{debt}} сум. Пожалуйста, оплатите. {{school}}' },
  { id: 'st3', category: 'DEBT', language: 'uz', name: "To'lov muddati yaqinlashdi (uz)", body: "Hurmatli {{parentName}}, {{studentName}} uchun oylik to'lov muddati yaqinlashmoqda. Iltimos, o'z vaqtida to'lang. {{school}}" },
  // ---- greetings ----
  { id: 'st4', category: 'GREETING', language: 'uz', name: 'Navro\'z bayrami (uz)', body: "Aziz {{parentName}}! Sizni Navro'z bayrami bilan chin dildan tabriklaymiz. Bahor sizga baxt va omad olib kelsin! {{school}}" },
  { id: 'st5', category: 'GREETING', language: 'uz', name: 'Mustaqillik kuni (uz)', body: "Aziz {{parentName}}! Sizni Mustaqillik kuni bilan tabriklaymiz. Yurtimiz tinch, farzandlarimiz baxtli bo'lsin! {{school}}" },
  { id: 'st6', category: 'GREETING', language: 'uz', name: "Yangi yil bilan (uz)", body: "Aziz {{parentName}}! Yangi yil bilan tabriklaymiz. Yangi yilda oilangizga sog'lik, baxt va omad tilaymiz! {{school}}" },
  { id: 'st7', category: 'GREETING', language: 'uz', name: "Xotin-qizlar kuni (uz)", body: "Aziz {{parentName}}! 8-mart Xalqaro xotin-qizlar kuni bilan chin qalbdan tabriklaymiz! {{school}}" },
  { id: 'st8', category: 'GREETING', language: 'uz', name: "Ustoz va murabbiylar kuni (xodimlarga)", body: "Hurmatli {{name}}! Sizni Ustoz va murabbiylar kuni bilan tabriklaymiz. Mehnatingiz uchun rahmat! {{school}}" },
  { id: 'st9', category: 'GREETING', language: 'uz', name: 'Hayit muborak (uz)', body: "Aziz {{parentName}}! Hayit ayyomi muborak bo'lsin! Xonadoningizga baraka va farovonlik tilaymiz. {{school}}" },
  { id: 'st10', category: 'GREETING', language: 'ru', name: 'С праздником (ru)', body: 'Уважаемый(ая) {{parentName}}! Поздравляем вас с праздником! Желаем здоровья, счастья и благополучия вашей семье. {{school}}' },
  // ---- warnings / notices ----
  { id: 'st11', category: 'WARNING', language: 'uz', name: "Ota-onalar yig'ilishi (uz)", body: "Hurmatli {{parentName}}, ota-onalar yig'ilishi bo'lib o'tadi. Vaqti va joyi maktab ma'muriyatidan aniqlanadi. Qatnashishingizni so'raymiz. {{school}}" },
  { id: 'st12', category: 'WARNING', language: 'uz', name: 'Darslar bekor qilindi (uz)', body: "Diqqat! Ob-havo sababli ertaga darslar bekor qilindi. Xabardor bo'ling. {{school}}" },
  { id: 'st13', category: 'WARNING', language: 'uz', name: "Farzandingiz darsga kelmadi (uz)", body: "Hurmatli {{parentName}}, {{studentName}} bugun darsga kelmadi. Sababini maktabga xabar qiling. {{school}}" },
  { id: 'st14', category: 'WARNING', language: 'ru', name: 'Отмена занятий (ru)', body: 'Внимание! Из-за погодных условий занятия завтра отменены. {{school}}' },
];

export const smsCampaigns: SmsCampaign[] = [];

/** studentId -> last automatic debt reminder (used to space the reminders out). */
export const lastDebtSms = new Map<string, Date>();
