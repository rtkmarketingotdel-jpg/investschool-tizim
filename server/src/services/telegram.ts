import { env } from '../env.js';
import { settings } from '../data/mockStore.js';

/**
 * Sends a message to the director/admin group through the Telegram Bot HTTP API
 * (plain fetch: no extra dependency needed for send-only notifications).
 * No-op when the bot token or chat id is not configured.
 */
/** Telegram allows 4096 characters per message: long lists are split at line boundaries (a <blockquote> never spans two parts). */
export function splitMessage(text: string, max = 3800): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let cur = '';
  for (const line of text.split('\n')) {
    if (cur && cur.length + line.length + 1 > max) { parts.push(cur); cur = ''; }
    cur += (cur ? '\n' : '') + line;
  }
  if (cur) parts.push(cur);
  return parts;
}

export async function sendTelegram(text: string, chatId: string | null = settings.telegramChatId): Promise<boolean> {
  const parts = splitMessage(text);
  if (parts.length > 1) {
    let all = true;
    for (const p of parts) all = (await sendTelegram(p, chatId)) && all;
    return all;
  }
  if (!env.telegramToken || !chatId) {
    console.log(`[telegram:skipped] ${text.replace(/<[^>]+>/g, '').replace(/\n/g, ' | ')}`);
    return false;
  }
  try {
    const res = await fetch(`${env.telegramApiUrl}/bot${env.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    });
    return res.ok;
  } catch (e) {
    console.error('[telegram] failed', e);
    return false;
  }
}

export type PhotoResult = 'sent' | 'failed' | 'not_configured';

/**
 * Sends a photo with a caption to the director. The image lives only in memory: it is never written to disk or the database,
 * Telegram is the archive. One retry, and a timeout so a Telegram outage cannot block a check-in.
 */
export async function sendTelegramPhoto(photo: Buffer, caption: string, chatId: string | null = settings.telegramChatId): Promise<PhotoResult> {
  if (!env.telegramToken || !chatId) {
    console.log(`[telegram:skipped photo] ${caption.replace(/<[^>]+>/g, '').replace(/\n/g, ' | ')}`);
    return 'not_configured';
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const form = new FormData();
      form.append('chat_id', chatId);
      // cut on a line boundary so an HTML tag is never sliced in half
      form.append('caption', splitMessage(caption, 1000)[0] ?? '');
      form.append('parse_mode', 'HTML');
      form.append('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'selfie.jpg');
      const res = await fetch(`${env.telegramApiUrl}/bot${env.telegramToken}/sendPhoto`, { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
      if (res.ok) return 'sent';
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break; // wrong chat id / blocked bot: retrying will not help
    } catch (e) {
      console.error('[telegram] photo failed', e);
    }
  }
  return 'failed';
}

export interface TelegramChat {
  id: string;
  type: string;
  title: string;
}

/** Chats seen by the update receiver (services/telegramBot.ts) since start-up: someone pressed Start or added the bot. */
export const seenChats = new Map<string, TelegramChat>();
/** "/start <code>" messages seen by the update receiver: code -> private chat id. */
export const startCodes = new Map<string, string>();

/** Chats that wrote to the bot, so the director can pick the chat id without hunting for it. */
export async function findTelegramChats(): Promise<TelegramChat[]> {
  return [...seenChats.values()];
}

/** Calls a Bot API method; null when the bot is not configured or Telegram refused it. */
export async function tgCall<T = unknown>(method: string, body: Record<string, unknown>, timeoutMs = 10_000): Promise<{ ok: boolean; result?: T; error_code?: number; description?: string } | null> {
  if (!env.telegramToken) return null;
  try {
    const res = await fetch(`${env.telegramApiUrl}/bot${env.telegramToken}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
    });
    return (await res.json()) as { ok: boolean; result?: T; error_code?: number; description?: string };
  } catch (e) {
    if ((e as Error).name !== 'TimeoutError') console.error(`[telegram] ${method} failed`, e);
    return null;
  }
}

let botUsername: string | null = null;

/** The bot's @username (for t.me deep links), fetched once. */
export async function getBotUsername(): Promise<string | null> {
  if (botUsername || !env.telegramToken) return botUsername;
  try {
    const res = await fetch(`${env.telegramApiUrl}/bot${env.telegramToken}/getMe`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { username?: string } };
    botUsername = json.result?.username ?? null;
  } catch (e) {
    console.error('[telegram] getMe failed', e);
  }
  return botUsername;
}

/** The private chat that sent "/start <code>" (the employee opened their t.me link and pressed Start). */
export async function findStartChat(code: string): Promise<string | null> {
  return startCodes.get(code) ?? null;
}
