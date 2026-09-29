import 'dotenv/config';

process.env.TZ = 'Asia/Tashkent';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE === 'true',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramApiUrl: process.env.TELEGRAM_API_URL || 'https://api.telegram.org',
  smsProvider: process.env.SMS_PROVIDER ?? 'demo',
  eskizEmail: process.env.ESKIZ_EMAIL ?? '',
  eskizPassword: process.env.ESKIZ_PASSWORD ?? '',
  smsFrom: process.env.ESKIZ_FROM || '4546',
};
