import { env } from '../env.js';
import { schedulePersist } from '../db/store.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { feedbackRepo } from '../repositories/feedbackRepo.js';
import { groupRepo } from '../repositories/groupRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { seenChats, startCodes, tgCall } from './telegram.js';
import {
  askCommentMessage, commentSkippedMessage, commentThanksMessage, feedbackRequestMessage, idleHelpMessage, startHelpMessage, studentLinkedMessage,
} from './telegramText.js';

/**
 * Receives the bot's updates by long polling (one server instance): trainees linking through their personal link,
 * rating buttons and comments; staff "/start <code>" links and the chats the director picks from are recorded too.
 */

interface Chat { id: number; type: string; title?: string; first_name?: string; last_name?: string; username?: string }
interface Update {
  update_id: number;
  message?: { message_id: number; text?: string; chat: Chat };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: Chat } };
  my_chat_member?: { chat: Chat };
}

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const reply = (chatId: string, text: string, extra: Record<string, unknown> = {}) => tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
/** Trainee personal links carry "s_<code>"; anything else after /start is a staff link code. */
export const STUDENT_PREFIX = 's_';

function remember(chat: Chat) {
  const title = chat.title ?? ([chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || String(chat.id));
  seenChats.set(String(chat.id), { id: String(chat.id), type: chat.type, title });
}

async function linkStudent(chatId: string, code: string) {
  const s = (await studentRepo.list({})).find((x) => x.telegramCode === code);
  if (!s) return reply(chatId, startHelpMessage());
  await studentRepo.update(s.id, { telegramChatId: chatId });
  await audit(null, 'student.telegram.link', 'student', s.id);
  const group = s.groupId ? await groupRepo.findById(s.groupId) : null;
  const course = group ? await courseRepo.findById(group.courseId) : null;
  return reply(chatId, studentLinkedMessage({ name: s.firstName, course: course?.name ?? null, group: group?.name ?? null }));
}

async function onRate(cbId: string, chatId: string, feedbackId: string, rating: number) {
  const f = await feedbackRepo.findById(feedbackId);
  if (!f || f.chatId !== chatId || !(rating >= 1 && rating <= 5)) return tgCall('answerCallbackQuery', { callback_query_id: cbId });
  if (f.status !== 'ASKED') return tgCall('answerCallbackQuery', { callback_query_id: cbId, text: 'Siz bu darsni allaqachon baholagansiz' });
  await feedbackRepo.update(f.id, { rating, status: 'RATED', ratedAt: new Date() });
  await tgCall('answerCallbackQuery', { callback_query_id: cbId, text: 'Rahmat!' });
  const group = await groupRepo.findById(f.groupId);
  const course = group ? await courseRepo.findById(group.courseId) : null;
  if (f.messageId) {
    await tgCall('editMessageText', {
      chat_id: chatId, message_id: f.messageId, parse_mode: 'HTML',
      text: feedbackRequestMessage({ course: course?.name ?? '—', group: group?.name ?? '—', topic: f.topicTitle, rating }),
    });
  }
  await reply(chatId, askCommentMessage(), { reply_markup: { inline_keyboard: [[{ text: 'Oʻtkazib yuborish', callback_data: `fbskip:${f.id}` }]] } });
}

async function onSkip(cbId: string, chatId: string, feedbackId: string, messageId: number | undefined) {
  const f = await feedbackRepo.findById(feedbackId);
  await tgCall('answerCallbackQuery', { callback_query_id: cbId });
  if (!f || f.chatId !== chatId || f.status !== 'RATED') return;
  await feedbackRepo.update(f.id, { status: 'DONE' });
  if (messageId) await tgCall('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  await reply(chatId, commentSkippedMessage());
}

async function onText(chatId: string, text: string) {
  const f = await feedbackRepo.awaitingComment(chatId);
  if (!f) {
    // only trainees get the hint; a staff member writing to the bot is left alone
    const isTrainee = (await studentRepo.list({})).some((s) => s.telegramChatId === chatId);
    return isTrainee ? reply(chatId, idleHelpMessage()) : undefined;
  }
  await feedbackRepo.update(f.id, { comment: text.slice(0, 1000), status: 'DONE', commentedAt: new Date() });
  await reply(chatId, commentThanksMessage());
}

async function handle(u: Update) {
  const chat = u.message?.chat ?? u.callback_query?.message?.chat ?? u.my_chat_member?.chat;
  if (chat) remember(chat);
  if (u.callback_query) {
    const cb = u.callback_query;
    const chatId = String(cb.message?.chat.id ?? '');
    const [kind, id, n] = (cb.data ?? '').split(':');
    if (kind === 'fb' && id) await onRate(cb.id, chatId, id, Number(n));
    else if (kind === 'fbskip' && id) await onSkip(cb.id, chatId, id, cb.message?.message_id);
    else await tgCall('answerCallbackQuery', { callback_query_id: cb.id });
    return;
  }
  const m = u.message;
  if (!m?.text || m.chat.type !== 'private') return;
  const chatId = String(m.chat.id);
  const text = m.text.trim();
  if (text.startsWith('/start')) {
    const arg = text.split(/\s+/)[1] ?? '';
    if (arg.startsWith(STUDENT_PREFIX)) return linkStudent(chatId, arg.slice(STUDENT_PREFIX.length));
    if (arg) {
      startCodes.set(arg, chatId); // staff link, picked up by /api/me/telegram/link/check
      return;
    }
    return reply(chatId, startHelpMessage());
  }
  if (!text.startsWith('/')) return onText(chatId, text);
}

let running = false;

export function startTelegramBot() {
  if (!env.telegramToken || process.env.TELEGRAM_POLLING === 'false' || running) return;
  running = true;
  void (async () => {
    let offset = 0;
    while (running) {
      const r = await tgCall<Update[]>('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query', 'my_chat_member'] }, 35_000);
      if (!r) { await sleep(3000); continue; }
      if (!r.ok) {
        // 409: a webhook is set or another instance (e.g. during a deploy) is polling
        if (r.error_code !== 409) console.error('[telegram] getUpdates', r.error_code, r.description);
        await sleep(r.error_code === 409 ? 10_000 : 5000);
        continue;
      }
      for (const u of r.result ?? []) {
        offset = u.update_id + 1;
        try {
          await handle(u);
        } catch (e) {
          console.error('[telegram] update failed', e);
        }
      }
      if (r.result?.length) schedulePersist();
    }
  })();
  console.log('[telegram] receiving bot updates');
}

export const stopTelegramBot = () => { running = false; };
