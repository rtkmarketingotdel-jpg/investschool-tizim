import { api } from './api';

export interface TeachingStudent {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string | null;
  status: 'ACTIVE' | 'TRIAL' | 'LEFT';
  parentName: string;
  parentPhone: string;
  parentPhone2: string | null;
  district: string | null;
  address: string | null;
  isBoarding: boolean;
  clubs: string[];
  enrolledAt: string;
  contract: 'NONE' | 'DRAFT' | 'SENT' | 'SIGNED';
}
export interface TeachingClass {
  id: string;
  name: string;
  grade: number;
  capacity: number;
  studentCount: number;
  freeSeats: number;
  branchName: string | null;
  boys: number;
  girls: number;
  students: TeachingStudent[];
}
export interface TeachingClub {
  id: string;
  name: string;
  monthlyFee: number;
  members: Array<{ id: string; fullName: string; className: string | null; parentName: string; parentPhone: string }>;
}
export interface Teaching {
  subject: string | null;
  isTeacher: boolean;
  isTutor: boolean;
  position: string;
  classes: TeachingClass[];
  clubs: TeachingClub[];
}

export const meApi = {
  teaching: () => api.get<Teaching>('/me/teaching').then((r) => r.data),
};

export const ageOf = (birthDate: string | null) => {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};

export interface ClassStudentInput {
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: 'MALE' | 'FEMALE';
  parentName: string;
  parentPhone: string;
  parentPhone2: string | null;
  address: string | null;
  district: string | null;
  isBoarding: boolean;
}
export const addClassStudent = (classId: string, d: ClassStudentInput) => api.post(`/me/class/${classId}/students`, d).then((r) => r.data);
