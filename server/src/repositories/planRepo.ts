import { randomBytes } from 'node:crypto';
import { coursePlans, groupPlans } from '../data/lessonPlans.js';
import type { CoursePlan, GroupPlan, PlanTopic } from '../data/types.js';
import { newId } from '../lib/id.js';

const token = () => randomBytes(12).toString('base64url');

export const coursePlanRepo = {
  async byCourse(courseId: string) {
    return coursePlans.find((p) => p.courseId === courseId) ?? null;
  },
  async all() {
    return coursePlans;
  },
  async save(courseId: string, topics: PlanTopic[], userId: string | null): Promise<CoursePlan> {
    const cur = coursePlans.find((p) => p.courseId === courseId);
    if (cur) return Object.assign(cur, { topics, updatedAt: new Date(), updatedById: userId });
    const rec: CoursePlan = { id: newId('cp'), courseId, topics, updatedAt: new Date(), updatedById: userId };
    coursePlans.push(rec);
    return rec;
  },
  async removeForCourse(courseId: string) {
    const i = coursePlans.findIndex((p) => p.courseId === courseId);
    if (i >= 0) coursePlans.splice(i, 1);
  },
};

export const groupPlanRepo = {
  async byGroup(groupId: string) {
    return groupPlans.find((p) => p.groupId === groupId) ?? null;
  },
  async byToken(t: string) {
    return groupPlans.find((p) => p.publicToken === t) ?? null;
  },
  async all() {
    return groupPlans;
  },
  async create(groupId: string, topics: PlanTopic[], userId: string | null): Promise<GroupPlan> {
    const rec: GroupPlan = { id: newId('gp'), groupId, topics, done: [], publicToken: token(), updatedAt: new Date(), updatedById: userId };
    groupPlans.push(rec);
    return rec;
  },
  /** New topics/order; ticks of topics that no longer exist are dropped. */
  async saveTopics(groupId: string, topics: PlanTopic[], userId: string | null) {
    const p = groupPlans.find((x) => x.groupId === groupId);
    if (!p) return null;
    const ids = new Set(topics.map((t) => t.id));
    return Object.assign(p, { topics, done: p.done.filter((id) => ids.has(id)), updatedAt: new Date(), updatedById: userId });
  },
  async setDone(groupId: string, topicId: string, done: boolean) {
    const p = groupPlans.find((x) => x.groupId === groupId);
    if (!p) return null;
    p.done = done ? [...new Set([...p.done, topicId])] : p.done.filter((id) => id !== topicId);
    return p;
  },
  async renewToken(groupId: string) {
    const p = groupPlans.find((x) => x.groupId === groupId);
    return p ? Object.assign(p, { publicToken: token() }) : null;
  },
  async removeForGroup(groupId: string) {
    const i = groupPlans.findIndex((p) => p.groupId === groupId);
    if (i >= 0) groupPlans.splice(i, 1);
  },
};
