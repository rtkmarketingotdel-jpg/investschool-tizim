import { env } from '../env.js';

let eskizToken: string | null = null;

async function eskizLogin() {
  const body = new URLSearchParams({ email: env.eskizEmail, password: env.eskizPassword });
  const res = await fetch('https://notify.eskiz.uz/api/auth/login', { method: 'POST', body });
  const json = (await res.json()) as { data?: { token?: string } };
  eskizToken = json.data?.token ?? null;
  return eskizToken;
}

export const smsConfigured = () => env.smsProvider === 'eskiz' && !!env.eskizEmail && !!env.eskizPassword;

/** Returns true when the SMS was handed to the provider. In demo mode nothing is sent. */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!smsConfigured()) return false;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = eskizToken ?? (await eskizLogin());
      if (!token) return false;
      const body = new URLSearchParams({ mobile_phone: phone.replace(/\D/g, ''), message, from: '4546' });
      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
      });
      if (res.status === 401) {
        eskizToken = null;
        continue;
      }
      return res.ok;
    }
    return false;
  } catch (e) {
    console.error('[sms] failed', e);
    return false;
  }
}
