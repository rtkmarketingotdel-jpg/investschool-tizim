import type { Student } from '../data/types.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { courseLinkRepo, normLabel } from '../repositories/integrationRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { syncCourseCharge } from './finance.js';

export type Placement = 'placed' | 'already_in_group' | 'no_course' | 'unlinked' | 'group_missing' | 'group_finished' | 'group_full';

/** Puts a trainee without a group into this group at its course list price and opens the course bill. */
export async function placeInGroup(s: Student, groupId: string): Promise<Placement> {
  if (s.groupId) return 'already_in_group';
  const group = await groupRepo.findById(groupId);
  if (!group) return 'group_missing';
  if (groupStatus(group) === 'FINISHED') return 'group_finished';
  if (((await studentRepo.occupancy()).get(group.id) ?? 0) >= group.capacity) return 'group_full';
  const course = await courseRepo.findById(group.courseId);
  const updated = (await studentRepo.update(s.id, { groupId: group.id, coursePrice: course?.price ?? s.coursePrice }))!;
  await syncCourseCharge(updated);
  return 'placed';
}

/**
 * Places a trainee who came over the API by the course label they arrived with (linked to a group in Settings → API).
 * An unknown label is recorded, so the director sees it and can link it; the trainee then waits without a group.
 */
export async function placeByCourseLabel(s: Student): Promise<Placement> {
  if (s.groupId) return 'already_in_group';
  if (!s.externalCourse) return 'no_course';
  const link = await courseLinkRepo.ensure(s.externalCourse);
  return link.groupId ? placeInGroup(s, link.groupId) : 'unlinked';
}

/** After a label is linked in Settings: trainees who arrived with it and are still waiting get their group. */
export async function placeWaiting(label: string) {
  const waiting = (await studentRepo.list({})).filter((s) => !s.groupId && s.status === 'ACTIVE' && !!s.externalCourse && normLabel(s.externalCourse) === normLabel(label));
  let placed = 0;
  for (const s of waiting) if ((await placeByCourseLabel(s)) === 'placed') placed++;
  return { waiting: waiting.length, placed };
}
