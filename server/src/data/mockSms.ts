import type { SmsCampaign, SmsTemplate } from './types.js';

export const smsTemplates: SmsTemplate[] = [
  // ---- debt reminders ----
  { id: 'st1', category: 'DEBT', language: 'uz', name: 'Qarz eslatmasi (uz)', body: "Hurmatli {{name}}, {{courseName}} kursi ({{groupName}}) uchun to'lov muddati o'tdi. Qarz: {{debt}} so'm. Iltimos, to'lovni amalga oshiring. {{school}}" },
  { id: 'st2', category: 'DEBT', language: 'ru', name: 'Напоминание о долге (ru)', body: 'Уважаемый(ая) {{name}}, срок оплаты курса {{courseName}} ({{groupName}}) истёк. Долг: {{debt}} сум. Пожалуйста, оплатите. {{school}}' },
  { id: 'st3', category: 'DEBT', language: 'uz', name: "To'lov muddati yaqinlashdi (uz)", body: "Hurmatli {{name}}, {{courseName}} kursi uchun qolgan {{debt}} so'mni {{dueDate}} gacha to'lashingizni so'raymiz. {{school}}" },
  // ---- notices for trainees ----
  { id: 'st4', category: 'OTHER', language: 'uz', name: "Guruh boshlanadi (uz)", body: "Hurmatli {{name}}, {{courseName}} guruhi ({{groupName}}) {{startDate}} kuni boshlanadi. Darslarga o'z vaqtida keling. {{school}}" },
  { id: 'st5', category: 'WARNING', language: 'uz', name: 'Darsga kelmadingiz (uz)', body: "Hurmatli {{name}}, bugun {{groupName}} guruhi darsiga kelmadingiz. Sababini markazga xabar qiling. {{school}}" },
  { id: 'st6', category: 'WARNING', language: 'uz', name: 'Darslar bekor qilindi (uz)', body: "Diqqat! Ertaga darslar bekor qilindi. Keyingi dars jadval bo'yicha bo'ladi. {{school}}" },
  { id: 'st7', category: 'WARNING', language: 'ru', name: 'Отмена занятий (ru)', body: 'Внимание! Занятия завтра отменены. Следующее занятие — по расписанию. {{school}}' },
  { id: 'st8', category: 'OTHER', language: 'uz', name: "Yangi kursga qabul (bitiruvchilarga)", body: "Hurmatli {{name}}, markazimizda yangi kurslarga qabul boshlandi. Bitiruvchilarimiz uchun chegirma mavjud! {{school}}" },
  // ---- greetings ----
  { id: 'st9', category: 'GREETING', language: 'uz', name: "Navro'z bayrami (uz)", body: "Aziz {{name}}! Sizni Navro'z bayrami bilan chin dildan tabriklaymiz. Bahor sizga baxt va omad olib kelsin! {{school}}" },
  { id: 'st10', category: 'GREETING', language: 'uz', name: 'Mustaqillik kuni (uz)', body: "Aziz {{name}}! Sizni Mustaqillik kuni bilan tabriklaymiz. Yurtimiz tinch, hayotingiz farovon bo'lsin! {{school}}" },
  { id: 'st11', category: 'GREETING', language: 'uz', name: 'Yangi yil bilan (uz)', body: "Aziz {{name}}! Yangi yil bilan tabriklaymiz. Yangi yilda sog'lik, baxt va omad tilaymiz! {{school}}" },
  { id: 'st12', category: 'GREETING', language: 'uz', name: 'Ustoz va murabbiylar kuni (xodimlarga)', body: "Hurmatli {{name}}! Sizni Ustoz va murabbiylar kuni bilan tabriklaymiz. Mehnatingiz uchun rahmat! {{school}}" },
  { id: 'st13', category: 'GREETING', language: 'uz', name: 'Hayit muborak (uz)', body: "Aziz {{name}}! Hayit ayyomi muborak bo'lsin! Xonadoningizga baraka va farovonlik tilaymiz. {{school}}" },
  { id: 'st15', category: 'GREETING', language: 'uz', name: 'Xotin-qizlar kuni (uz)', body: "Aziz {{name}}! 8-mart Xalqaro xotin-qizlar kuni bilan chin qalbdan tabriklaymiz! {{school}}" },
  { id: 'st14', category: 'GREETING', language: 'ru', name: 'С праздником (ru)', body: 'Уважаемый(ая) {{name}}! Поздравляем вас с праздником! Желаем здоровья, счастья и благополучия. {{school}}' },
];

export const smsCampaigns: SmsCampaign[] = [];

/** studentId -> last automatic debt reminder (used to space the reminders out). */
export const lastDebtSms = new Map<string, Date>();
