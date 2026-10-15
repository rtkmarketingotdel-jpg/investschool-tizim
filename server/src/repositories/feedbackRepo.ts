import { feedbacks } from '../data/feedback.js';
import type { LessonFeedback } from '../data/types.js';
import { newId } from '../lib/id.js';

export const feedbackRepo = {
  async findById(id: string) {
    return feedbacks.find((f) => f.id === id) ?? null;
  },
  async find(topicId: string, studentId: string) {
    return feedbacks.find((f) => f.topicId === topicId && f.studentId === studentId) ?? null;
  },
  async byGroup(groupId: string) {
    return feedbacks.filter((f) => f.groupId === groupId);
  },
  /** The latest rated request of this chat that still waits for a comment. */
  async awaitingComment(chatId: string) {
    return feedbacks.filter((f) => f.chatId === chatId && f.status === 'RATED').sort((a, b) => (b.ratedAt?.getTime() ?? 0) - (a.ratedAt?.getTime() ?? 0))[0] ?? null;
  },
  async create(data: Omit<LessonFeedback, 'id' | 'status' | 'rating' | 'comment' | 'askedAt' | 'ratedAt' | 'commentedAt' | 'messageId'>) {
    const rec: LessonFeedback = { id: newId('fb'), status: 'ASKED', rating: null, comment: null, askedAt: new Date(), ratedAt: null, commentedAt: null, messageId: null, ...data };
    feedbacks.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<LessonFeedback>) {
    const f = feedbacks.find((x) => x.id === id);
    return f ? Object.assign(f, patch) : null;
  },
  async removeForStudent(studentId: string) {
    for (let k = feedbacks.length - 1; k >= 0; k--) if (feedbacks[k]!.studentId === studentId) feedbacks.splice(k, 1);
  },
};
