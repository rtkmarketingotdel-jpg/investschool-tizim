import { env } from '../env.js';
import { settings } from '../data/mockStore.js';

/**
 * Sends a message to the director/admin group through the Telegram Bot HTTP API
 * (plain fetch: no extra dependency needed for send-only notifications).
 * No-op when the bot token or chat id is not configured.
 */
export async function sendTelegram(text: string, chatId: string | null = settings.telegramChatId): Promise<boolean> {
  if (!env.telegramToken || !chatId) {
    console.log(`[telegram:skipped] ${text}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch (e) {
    console.error('[telegram] failed', e);
    return false;
  }
}
