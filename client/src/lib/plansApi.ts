import { api } from './api';
import type { GroupStatus } from './schoolApi';

export type TopicKind = 'THEORY' | 'PRACTICE';
export interface Topic {
  /** absent for a topic not saved yet */
  id?: string;
  title: string;
  description: string | null;
  kind: TopicKind;
  lessons: number;
  materials: string | null;
}
export interface ScheduledTopic extends Topic {
  id: string;
  from: number;
  to: number;
  date: string;
  lastDate: string;
  overflow: boolean;
  done: boolean;
  /** trainees' ratings over Telegram (null until the topic was marked as taught) */
  rating?: { avg: number | null; count: number; comments: number; asked: number } | null;
  /** the teacher's marks for this topic */
  grades?: { avg: number; count: number } | null;
}
export interface GradeRow {
  studentId: string;
  fullName: string;
  status: 'ACTIVE' | 'GRADUATED' | 'LEFT';
  grade: number | null;
}
export interface BotLinkRow {
  id: string;
  fullName: string;
  phone: string;
  linked: boolean;
  link: string | null;
}
export interface FeedbackRow {
  id: string;
  topicId: string;
  topicTitle: string;
  studentId: string;
  studentName: string;
  status: 'ASKED' | 'RATED' | 'DONE';
  rating: number | null;
  comment: string | null;
  askedAt: string;
  ratedAt: string | null;
}
export interface PlanGroup {
  id: string;
  name: string;
  status: GroupStatus;
  startDate: string;
  endDate: string;
  days: number[];
  timeStart: string;
  timeEnd: string;
  room: string | null;
  courseId: string;
  courseName: string;
  teacherName: string | null;
  branchName: string | null;
  /** lesson days between the group's start and end */
  lessonCapacity: number;
}
export interface GroupPlanData {
  group: PlanGroup;
  plan: { id: string; publicToken: string; updatedAt: string; done: string[]; topics: ScheduledTopic[]; lessons: number } | null;
  templateTopics: number;
  canEdit: boolean;
}
export interface PlanCourse {
  id: string;
  name: string;
  durationMonths: number;
  templateTopics: number;
  templateLessons: number;
  groups: Array<{ id: string; name: string; status: GroupStatus; hasPlan: boolean; topics: number; done: number }>;
}
export interface PublicPlan {
  school: string;
  group: PlanGroup;
  plan: { id: string; updatedAt: string; done: string[]; topics: ScheduledTopic[]; lessons: number };
}

/** Only the editable fields go to the server (dates and ticks are computed there). */
export const toPayload = (topics: Topic[]) =>
  topics.map(({ id, title, description, kind, lessons, materials }) => ({ id, title, description, kind, lessons, materials }));

export const plansApi = {
  courses: () => api.get<{ items: PlanCourse[] }>('/plans/courses').then((r) => r.data.items),
  course: (id: string) =>
    api.get<{ course: { id: string; name: string; durationMonths: number }; topics: Topic[]; updatedAt: string | null; canEdit: boolean }>(`/plans/course/${id}`).then((r) => r.data),
  saveCourse: (id: string, topics: Topic[]) => api.put<{ topics: Topic[] }>(`/plans/course/${id}`, { topics: toPayload(topics) }).then((r) => r.data),
  group: (id: string) => api.get<GroupPlanData>(`/plans/group/${id}`).then((r) => r.data),
  createGroup: (id: string, fromTemplate: boolean) => api.post<GroupPlanData>(`/plans/group/${id}`, { fromTemplate }).then((r) => r.data),
  saveGroup: (id: string, topics: Topic[]) => api.put<GroupPlanData>(`/plans/group/${id}`, { topics: toPayload(topics) }).then((r) => r.data),
  setDone: (id: string, topicId: string, done: boolean) => api.put<GroupPlanData & { feedbackRequested: number }>(`/plans/group/${id}/done`, { topicId, done }).then((r) => r.data),
  grades: (id: string, topicId: string) => api.get<{ items: GradeRow[] }>(`/plans/group/${id}/grades`, { params: { topicId } }).then((r) => r.data.items),
  saveGrades: (id: string, topicId: string, grades: Array<{ studentId: string; grade: number | null }>) =>
    api.put<GroupPlanData>(`/plans/group/${id}/grades`, { topicId, grades }).then((r) => r.data),
  botLinks: (id: string) => api.get<{ configured: boolean; items: BotLinkRow[] }>(`/plans/group/${id}/telegram`).then((r) => r.data),
  feedback: (id: string, topicId?: string) => api.get<{ items: FeedbackRow[] }>(`/plans/group/${id}/feedback`, { params: topicId ? { topicId } : {} }).then((r) => r.data.items),
  renewToken: (id: string) => api.post<GroupPlanData>(`/plans/group/${id}/token`).then((r) => r.data),
  publicPlan: (token: string) => api.get<PublicPlan>(`/public/plans/${token}`).then((r) => r.data),
};

/** Public link of a group plan (opens without signing in). */
export const publicPlanUrl = (token: string) => `${window.location.origin}/p/${token}`;
