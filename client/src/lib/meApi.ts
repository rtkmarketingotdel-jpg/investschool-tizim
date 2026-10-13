import { api } from './api';

export interface TeachingStudent {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string | null;
  status: 'ACTIVE' | 'GRADUATED' | 'LEFT';
  phone: string;
  phone2: string | null;
  district: string | null;
  address: string | null;
  enrolledAt: string;
  contract: 'NONE' | 'DRAFT' | 'SENT' | 'SIGNED';
}
export interface TeachingGroup {
  id: string;
  name: string;
  courseName: string;
  status: 'PLANNED' | 'ACTIVE' | 'FINISHED';
  startDate: string;
  endDate: string;
  days: number[];
  timeStart: string;
  timeEnd: string;
  room: string | null;
  capacity: number;
  studentCount: number;
  freeSeats: number;
  branchName: string | null;
  men: number;
  women: number;
  students: TeachingStudent[];
}
export interface Teaching {
  specialty: string | null;
  isTeacher: boolean;
  position: string;
  groups: TeachingGroup[];
}

export const meApi = {
  teaching: () => api.get<Teaching>('/me/teaching').then((r) => r.data),
  telegram: () => api.get<{ linked: boolean; botConfigured: boolean }>('/me/telegram').then((r) => r.data),
  telegramLink: () => api.post<{ url: string }>('/me/telegram/link').then((r) => r.data),
  telegramCheck: () => api.post<{ linked: boolean; expired: boolean }>('/me/telegram/link/check').then((r) => r.data),
  telegramUnlink: () => api.delete('/me/telegram').then((r) => r.data),
};

export const ageOf = (birthDate: string | null) => {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};

export interface GroupStudentInput {
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: 'MALE' | 'FEMALE';
  phone: string;
  phone2: string | null;
  address: string | null;
  district: string | null;
}
export const addGroupStudent = (groupId: string, d: GroupStudentInput) => api.post(`/me/group/${groupId}/students`, d).then((r) => r.data);
