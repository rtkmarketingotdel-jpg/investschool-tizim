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
  setDone: (id: string, topicId: string, done: boolean) => api.put<GroupPlanData>(`/plans/group/${id}/done`, { topicId, done }).then((r) => r.data),
  renewToken: (id: string) => api.post<GroupPlanData>(`/plans/group/${id}/token`).then((r) => r.data),
  publicPlan: (token: string) => api.get<PublicPlan>(`/public/plans/${token}`).then((r) => r.data),
};

/** Public link of a group plan (opens without signing in). */
export const publicPlanUrl = (token: string) => `${window.location.origin}/p/${token}`;
