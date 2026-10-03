import { env } from '../env.js';
import { settings } from '../data/mockStore.js';

/**
 * Sends a message to the director/admin group through the Telegram Bot HTTP API
 * (plain fetch: no extra dependency needed for send-only notifications).
 * No-op when the bot token or chat id is not configured.
 */
export async function sendTelegram(text: string, chatId: string | null = settings.telegramChatId): Promise<boolean> {
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
      form.append('caption', caption.slice(0, 1000));
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

/**
 * Lists the chats that recently wrote to the bot (someone pressed Start, or the bot was added to a group),
 * so the director can pick the chat id without hunting for it. Works only while no webhook is set.
 */
export async function findTelegramChats(): Promise<TelegramChat[]> {
  if (!env.telegramToken) return [];
  const res = await fetch(`${env.telegramApiUrl}/bot${env.telegramToken}/getUpdates?limit=100`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: Array<Record<string, { chat?: { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string } }>> };
  const chats = new Map<string, TelegramChat>();
  for (const u of json.result ?? []) {
    const chat = (u.message ?? u.my_chat_member ?? u.channel_post ?? u.edited_message)?.chat;
    if (!chat) continue;
    const title = chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || String(chat.id));
    chats.set(String(chat.id), { id: String(chat.id), type: chat.type, title });
  }
  return [...chats.values()];
}
