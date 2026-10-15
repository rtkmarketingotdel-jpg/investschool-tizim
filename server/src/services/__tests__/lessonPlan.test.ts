import { describe, expect, it } from 'vitest';
import { lessonCapacity, lessonDates, scheduleTopics } from '../lessonPlan.js';

// 2026-10-05 is a Monday; lessons on Mon/Wed/Fri
const group = { startDate: '2026-10-05', endDate: '2026-10-16', days: [1, 3, 5] };

describe('lesson plan schedule', () => {
  it('uses only the group weekdays', () => {
    expect(lessonDates(group, 4)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09', '2026-10-12']);
  });
  it('gives a multi-lesson topic consecutive lesson days and flags topics past the end', () => {
    const s = scheduleTopics(group, [{ id: 'a', lessons: 1 }, { id: 'b', lessons: 2 }, { id: 'c', lessons: 3 }]);
    expect(s.map((x) => [x.topicId, x.date, x.lastDate, x.from, x.to])).toEqual([
      ['a', '2026-10-05', '2026-10-05', 1, 1],
      ['b', '2026-10-07', '2026-10-09', 2, 3],
      ['c', '2026-10-12', '2026-10-16', 4, 6],
    ]);
    expect(s.map((x) => x.overflow)).toEqual([false, false, false]);
    expect(scheduleTopics(group, [{ id: 'x', lessons: 7 }])[0]!.overflow).toBe(true);
  });
  it('counts the lesson days of the group', () => expect(lessonCapacity(group)).toBe(6));
  it('reordering moves the dates with the topics', () => {
    const s = scheduleTopics(group, [{ id: 'c', lessons: 1 }, { id: 'a', lessons: 1 }]);
    expect(s.map((x) => [x.topicId, x.date])).toEqual([['c', '2026-10-05'], ['a', '2026-10-07']]);
  });
});
