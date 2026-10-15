import type { Group, PlanTopic, Student } from '../data/types.js';
import { schedulePersist } from '../db/store.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { feedbackRepo } from '../repositories/feedbackRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { tgCall } from './telegram.js';
import { feedbackRequestMessage } from './telegramText.js';

export const ratingKeyboard = (feedbackId: string) => ({
  inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: `${n} ⭐`, callback_data: `fb:${feedbackId}:${n}` }))],
});

/** A blocked bot or a deleted chat: the trainee has to link again. */
export async function dropDeadChat(s: Student, errorCode: number | undefined) {
  if (errorCode === 403 || errorCode === 400) await studentRepo.update(s.id, { telegramChatId: null });
}

/**
 * The topic was marked as taught: every linked trainee of this group (and only this group) gets a rating request.
 * Each trainee is asked once per topic (unticking and ticking again does not ask twice).
 * Returns how many trainees are asked; the messages go out in the background.
 */
export async function requestFeedback(group: Group, topic: PlanTopic): Promise<number> {
  const course = await courseRepo.findById(group.courseId);
  const roster = (await studentRepo.list({ groupId: group.id })).filter((s) => s.status === 'ACTIVE' && s.telegramChatId);
  const todo: Array<{ s: Student; id: string }> = [];
  for (const s of roster) {
    if (await feedbackRepo.find(topic.id, s.id)) continue;
    const f = await feedbackRepo.create({ groupId: group.id, topicId: topic.id, topicTitle: topic.title, studentId: s.id, chatId: s.telegramChatId! });
    todo.push({ s, id: f.id });
  }
  void (async () => {
    for (const { s, id } of todo) {
      const r = await tgCall<{ message_id: number }>('sendMessage', {
        chat_id: s.telegramChatId, parse_mode: 'HTML',
        text: feedbackRequestMessage({ course: course?.name ?? '—', group: group.name, topic: topic.title }),
        reply_markup: ratingKeyboard(id),
      });
      if (r?.ok && r.result) await feedbackRepo.update(id, { messageId: r.result.message_id });
      else await dropDeadChat(s, r?.error_code);
      await new Promise((ok) => setTimeout(ok, 60)); // stay well under Telegram's per-second limit
    }
    schedulePersist();
  })().catch((e) => console.error('[feedback] send failed', e));
  return todo.length;
}
