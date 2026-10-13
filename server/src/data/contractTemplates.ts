export const TEMPLATE_UZ = `## 1. Shartnoma predmeti
{{schoolLegalName}} (keyingi oʻrinlarda — «Markaz») nomidan direktor {{director}} bir tomondan, va {{studentFullName}} (keyingi oʻrinlarda — «Tinglovchi»), tugʻilgan sana: {{studentBirthDate}}, pasport: {{studentPassport}}, JSHSHIR: {{studentPinfl}}, telefon: {{studentPhone}}, ikkinchi tomondan, mazkur shartnomani tuzdilar.
Markaz Tinglovchini «{{courseName}}» kasbiga oʻqitadi ({{courseDuration}} oy, guruh: {{groupName}}), Tinglovchi esa oʻqish uchun haq toʻlaydi.

## 2. Oʻqish narxi va toʻlov tartibi
Kursning umumiy narxi {{price}} soʻm ({{priceWords}}) ni tashkil etadi.
Toʻlov bir yoʻla yoki bir necha qismga boʻlib, {{paymentDueDate}} gacha toʻliq amalga oshiriladi. Toʻlov naqd pul, bank kartasi yoki bank oʻtkazmasi orqali qabul qilinadi.
Toʻlov muddati oʻtkazib yuborilgan taqdirda Markaz Tinglovchiga ogohlantirish yuborish huquqiga ega.

## 3. Markazning majburiyatlari
Oʻquv dasturiga muvofiq nazariy va amaliy mashgʻulotlarni oʻtkazish; mashgʻulotlar uchun jihozlar va materiallarni taʼminlash; xavfsizlik texnikasi boʻyicha yoʻriqnoma berish; yakuniy imtihondan muvaffaqiyatli oʻtgan Tinglovchiga sertifikat berish.

## 4. Tinglovchining majburiyatlari
Oʻqish haqini oʻz vaqtida toʻlash; mashgʻulotlarga muntazam qatnashish; Markazning ichki tartib qoidalari va xavfsizlik texnikasiga rioya qilish; Markaz jihozlariga ehtiyotkorlik bilan munosabatda boʻlish.

## 5. Shartnoma muddati
Shartnoma {{startDate}} dan {{endDate}} gacha amal qiladi. Tinglovchi oʻqishni oʻz xohishi bilan toʻxtatsa, oʻtilgan mashgʻulotlar uchun toʻlangan summa qaytarilmaydi.

## 6. Yakuniy qoidalar
Shartnoma elektron shaklda tuziladi va Tinglovchi tasdiqlash kodini kiritgan paytdan boshlab kuchga kiradi. Nizolar muzokaralar yoʻli bilan, kelisha olmagan taqdirda qonunchilikka muvofiq hal etiladi.

## 7. Tomonlar rekvizitlari
Markaz: {{schoolLegalName}}, STIR: {{schoolInn}}, manzil: {{schoolAddress}}.
Shartnoma raqami: {{contractNumber}}, sana: {{date}}.
Tinglovchi: {{studentFullName}}, telefon: {{studentPhone}}.`;

export const TEMPLATE_RU = `## 1. Предмет договора
{{schoolLegalName}} (далее — «Центр») в лице директора {{director}}, с одной стороны, и {{studentFullName}} (далее — «Слушатель»), дата рождения: {{studentBirthDate}}, паспорт: {{studentPassport}}, ПИНФЛ: {{studentPinfl}}, телефон: {{studentPhone}}, с другой стороны, заключили настоящий договор.
Центр обучает Слушателя профессии «{{courseName}}» ({{courseDuration}} мес., группа: {{groupName}}), а Слушатель оплачивает обучение.

## 2. Стоимость обучения и порядок оплаты
Общая стоимость курса составляет {{price}} сум ({{priceWords}}).
Оплата вносится единовременно или частями и должна быть полностью внесена до {{paymentDueDate}}. Оплата принимается наличными, банковской картой или банковским переводом.
При просрочке платежа Центр вправе направить Слушателю уведомление.

## 3. Обязанности Центра
Проводить теоретические и практические занятия согласно учебной программе; обеспечивать оборудование и материалы для занятий; проводить инструктаж по технике безопасности; выдать сертификат Слушателю, успешно сдавшему итоговый экзамен.

## 4. Обязанности Слушателя
Своевременно вносить плату за обучение; регулярно посещать занятия; соблюдать внутренний распорядок и технику безопасности Центра; бережно относиться к оборудованию Центра.

## 5. Срок действия договора
Договор действует с {{startDate}} по {{endDate}}. При досрочном прекращении обучения по инициативе Слушателя сумма, оплаченная за пройденные занятия, не возвращается.

## 6. Заключительные положения
Договор заключается в электронной форме и вступает в силу с момента ввода Слушателем кода подтверждения. Споры решаются путём переговоров, а при недостижении согласия — в соответствии с законодательством.

## 7. Реквизиты сторон
Центр: {{schoolLegalName}}, ИНН: {{schoolInn}}, адрес: {{schoolAddress}}.
Номер договора: {{contractNumber}}, дата: {{date}}.
Слушатель: {{studentFullName}}, телефон: {{studentPhone}}.`;
