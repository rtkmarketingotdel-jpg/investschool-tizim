import { grades } from '../data/grades.js';
import { newId } from '../lib/id.js';

export const gradeRepo = {
  async byGroup(groupId: string) {
    return grades.filter((g) => g.groupId === groupId);
  },
  async byStudent(studentId: string) {
    return grades.filter((g) => g.studentId === studentId);
  },
  /** Sets (or clears, with null) one trainee's mark for a topic. */
  async set(groupId: string, topicId: string, studentId: string, grade: number | null, userId: string | null) {
    const i = grades.findIndex((g) => g.topicId === topicId && g.studentId === studentId);
    if (grade === null) {
      if (i >= 0) grades.splice(i, 1);
      return;
    }
    if (i >= 0) Object.assign(grades[i]!, { grade, gradedById: userId, gradedAt: new Date() });
    else grades.push({ id: newId('gr'), groupId, topicId, studentId, grade, gradedById: userId, gradedAt: new Date() });
  },
  async removeForStudent(studentId: string) {
    for (let k = grades.length - 1; k >= 0; k--) if (grades[k]!.studentId === studentId) grades.splice(k, 1);
  },
  async removeForGroup(groupId: string) {
    for (let k = grades.length - 1; k >= 0; k--) if (grades[k]!.groupId === groupId) grades.splice(k, 1);
  },
};
