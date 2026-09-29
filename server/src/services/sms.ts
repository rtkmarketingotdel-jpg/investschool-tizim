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
      const body = new URLSearchParams({ mobile_phone: phone.replace(/\D/g, ''), message, from: env.smsFrom });
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

export interface DeliverResult {
  ok: boolean;
  /** true when nothing was really sent (demo mode: no provider configured). */
  simulated: boolean;
  providerId: string | null;
  error: string | null;
}

/** Sends one SMS through Eskiz, or simulates it (logged only) while no provider is configured. */
export async function deliverSms(phone: string, message: string): Promise<DeliverResult> {
  if (!smsConfigured()) {
    console.log(`[sms:demo] ${phone}: ${message}`);
    return { ok: true, simulated: true, providerId: null, error: null };
  }
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = eskizToken ?? (await eskizLogin());
      if (!token) return { ok: false, simulated: false, providerId: null, error: 'PROVIDER_AUTH_FAILED' };
      const body = new URLSearchParams({ mobile_phone: phone.replace(/\D/g, ''), message, from: env.smsFrom });
      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      if (res.status === 401) {
        eskizToken = null;
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as { id?: string | number; message?: string };
      return res.ok
        ? { ok: true, simulated: false, providerId: json.id != null ? String(json.id) : null, error: null }
        : { ok: false, simulated: false, providerId: null, error: (json.message ?? `HTTP_${res.status}`).slice(0, 200) };
    }
    return { ok: false, simulated: false, providerId: null, error: 'PROVIDER_AUTH_FAILED' };
  } catch (e) {
    console.error('[sms] failed', e);
    return { ok: false, simulated: false, providerId: null, error: 'PROVIDER_UNREACHABLE' };
  }
}

/** Remaining balance from Eskiz (null in demo mode or if the provider does not answer). */
export async function smsBalance(): Promise<number | null> {
  if (!smsConfigured()) return null;
  try {
    const token = eskizToken ?? (await eskizLogin());
    if (!token) return null;
    const res = await fetch('https://notify.eskiz.uz/api/user/get-limit', { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { data?: { balance?: number } };
    return typeof json.data?.balance === 'number' ? json.data.balance : null;
  } catch {
    return null;
  }
}

export const smsStatus = () => ({ provider: env.smsProvider, configured: smsConfigured(), simulated: !smsConfigured(), from: env.smsFrom });
