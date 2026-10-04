import 'dotenv/config';

process.env.TZ = 'Asia/Tashkent';

const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const production = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
if (production && (secret.length < 32 || /change-?me/i.test(secret))) {
  throw new Error('JWT_SECRET must be a random string of at least 32 characters in production');
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: secret,
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  demoMode: process.env.DEMO_MODE === 'true',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramApiUrl: process.env.TELEGRAM_API_URL || 'https://api.telegram.org',
  smsProvider: process.env.SMS_PROVIDER ?? 'demo',
  eskizEmail: process.env.ESKIZ_EMAIL ?? '',
  eskizPassword: process.env.ESKIZ_PASSWORD ?? '',
  smsFrom: process.env.ESKIZ_FROM || '4546',
};
