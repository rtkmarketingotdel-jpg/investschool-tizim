import type { Group, PlanTopic } from '../data/types.js';
import { addDays, isoWeekday } from '../lib/date.js';

export interface ScheduledTopic {
  topicId: string;
  /** Lesson numbers in the course (1-based), e.g. a 2-lesson topic → [5, 6]. */
  from: number;
  to: number;
  /** First and last lesson day (YYYY-MM-DD). */
  date: string;
  lastDate: string;
  /** True when the topic falls after the group's end date (the plan has more lessons than the group). */
  overflow: boolean;
}

/** Lesson days of a group from its start date: only its weekdays. Stops after `count` lessons. */
export function lessonDates(group: Pick<Group, 'startDate' | 'days'>, count: number): string[] {
  const out: string[] = [];
  if (!group.days.length || count <= 0) return out;
  // a year is far beyond any course: guards against an empty weekday set looping forever
  for (let d = group.startDate, i = 0; out.length < count && i < 800; d = addDays(d, 1), i++) {
    if (group.days.includes(isoWeekday(d))) out.push(d);
  }
  return out;
}

/** Gives every topic its lesson day(s) in plan order; a topic of n lessons takes n consecutive lesson days. */
export function scheduleTopics(group: Pick<Group, 'startDate' | 'endDate' | 'days'>, topics: Pick<PlanTopic, 'id' | 'lessons'>[]): ScheduledTopic[] {
  const total = topics.reduce((n, t) => n + Math.max(1, t.lessons), 0);
  const dates = lessonDates(group, total);
  const out: ScheduledTopic[] = [];
  let i = 0;
  for (const t of topics) {
    const n = Math.max(1, t.lessons);
    const first = dates[i] ?? dates.at(-1) ?? group.startDate;
    const last = dates[i + n - 1] ?? first;
    out.push({ topicId: t.id, from: i + 1, to: i + n, date: first, lastDate: last, overflow: last > group.endDate });
    i += n;
  }
  return out;
}

/** How many lesson days a group has between its start and end dates. */
export const lessonCapacity = (group: Pick<Group, 'startDate' | 'endDate' | 'days'>) =>
  lessonDates(group, 1000).filter((d) => d <= group.endDate).length;
