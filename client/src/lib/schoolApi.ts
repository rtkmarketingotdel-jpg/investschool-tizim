import { api } from './api';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type StudentStatus = 'ACTIVE' | 'GRADUATED' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';

export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: Gender;
  groupId: string | null;
  groupName: string | null;
  courseId: string | null;
  courseName: string | null;
  phone: string;
  phone2: string | null;
  passport: string | null;
  pinfl: string | null;
  address: string | null;
  district: string | null;
  coursePrice: number;
  discountPercent: number;
  status: StudentStatus;
  /** set when the trainee came from another system over the API (Nazorat AI) */
  externalId?: string | null;
  externalCourse?: string | null;
  /** the trainee opened their personal bot link (lesson ratings reach them) */
  telegramLinked?: boolean;
  enrolledAt: string;
  leftAt: string | null;
  notes: string | null;
  /** null when the current role may not see finances */
  debt: number | null;
}
export type StudentInput = Omit<Student, 'id' | 'fullName' | 'groupName' | 'courseId' | 'courseName' | 'leftAt' | 'debt' | 'externalId' | 'externalCourse' | 'telegramLinked'>;

export interface StudentFilters {
  q?: string;
  status?: string;
  groupId?: string;
  courseId?: string;
  debtor?: string;
  sort?: string;
  page: number;
  limit: number;
}

export type GroupStatus = 'PLANNED' | 'ACTIVE' | 'FINISHED';
export interface Group {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  status: GroupStatus;
  capacity: number;
  startDate: string;
  endDate: string;
  days: number[];
  timeStart: string;
  timeEnd: string;
  room: string | null;
  teacherId: string | null;
  teacherName: string | null;
  teacherPhone: string | null;
  teacherPhotoUrl: string | null;
  men: number;
  women: number;
  graduated: number;
  branchId: string | null;
  studentCount: number;
  freeSeats: number;
}
export type GroupInput = Pick<Group, 'name' | 'courseId' | 'capacity' | 'teacherId' | 'branchId' | 'startDate' | 'endDate' | 'days' | 'timeStart' | 'timeEnd' | 'room'>;

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  usage: { users: number; groups: number };
}
export type BranchInput = Pick<Branch, 'name' | 'address' | 'lat' | 'lng' | 'radiusM'>;

export interface Course {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string | null;
  teachers: Array<{ id: string; fullName: string; photoUrl: string | null; position: string }>;
  groups: Array<{ id: string; name: string; status: GroupStatus; startDate: string; endDate: string }>;
  activeStudents: number;
  graduates: number;
}
export type CourseInput = Pick<Course, 'name' | 'durationMonths' | 'price' | 'description'>;

export type Role = 'DIRECTOR' | 'MANAGER' | 'ACCOUNTANT' | 'TEACHER';
export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  position: string;
  isTeacher: boolean;
  specialty: string | null;
  photoUrl: string | null;
  profileCompletedAt: string | null;
  branchId: string | null;
  baseSalary: number;
  isActive: boolean;
  lateCount: number;
  absentCount: number;
}
export type StaffInput = Pick<StaffMember, 'fullName' | 'phone' | 'role' | 'position' | 'baseSalary' | 'isActive' | 'isTeacher' | 'specialty' | 'branchId'> & {
  password?: string;
  /** Groups the teacher leads (synced only when sent). */
  groupIds?: string[];
};

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const schoolApi = {
  students: (f: StudentFilters) => api.get<Paged<Student>>('/students', { params: clean(f) }).then((r) => r.data),
  student: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  createStudent: (d: StudentInput) => api.post<Student>('/students', d).then((r) => r.data),
  updateStudent: (id: string, d: StudentInput) => api.patch<Student>(`/students/${id}`, d).then((r) => r.data),
  studentBotLink: (id: string, renew = false) => api.post<{ link: string; linked: boolean }>(`/students/${id}/telegram-link`, { renew }).then((r) => r.data),
  unlinkStudentBot: (id: string) => api.delete(`/students/${id}/telegram`).then((r) => r.data),
  deleteStudent: (id: string, withPayments: boolean) => api.delete(`/students/${id}`, { params: withPayments ? { withPayments: 'true' } : {} }).then((r) => r.data),
  exportStudents: (f: Omit<StudentFilters, 'page' | 'limit' | 'debtor'>) =>
    api.get<Blob>('/students/export', { params: clean(f), responseType: 'blob' }).then((r) => r.data),

  courses: () => api.get<{ items: Course[] }>('/catalog/courses').then((r) => r.data.items),
  saveCourse: (id: string | null, d: CourseInput) => (id ? api.patch<Course>(`/catalog/courses/${id}`, d) : api.post<Course>('/catalog/courses', d)).then((r) => r.data),
  deleteCourse: (id: string) => api.delete(`/catalog/courses/${id}`),

  branches: () => api.get<{ items: Branch[] }>('/branches').then((r) => r.data.items),
  createBranch: (d: BranchInput) => api.post<Branch>('/branches', d).then((r) => r.data),
  updateBranch: (id: string, d: BranchInput) => api.patch<Branch>(`/branches/${id}`, d).then((r) => r.data),
  deleteBranch: (id: string, moveTo?: string) => api.delete(`/branches/${id}`, { params: moveTo ? { moveTo } : {} }).then((r) => r.data),
  assignBranch: (id: string, userIds: string[], groupIds: string[]) => api.put(`/branches/${id}/assign`, { userIds, groupIds }).then((r) => r.data),

  groups: () => api.get<{ items: Group[] }>('/groups').then((r) => r.data.items),
  createGroup: (d: GroupInput) => api.post<Group>('/groups', d).then((r) => r.data),
  updateGroup: (id: string, d: GroupInput) => api.patch<Group>(`/groups/${id}`, d).then((r) => r.data),
  deleteGroup: (id: string) => api.delete(`/groups/${id}`).then(() => null),

  staff: (p: { q?: string; role?: string; active?: string; teacher?: string; page: number; limit: number }) =>
    api.get<Paged<StaffMember>>('/staff', { params: clean(p) }).then((r) => r.data),
  createStaff: (d: StaffInput) =>
    api.post<{ user: StaffMember; tempPassword: string; generated: boolean }>('/staff', d).then((r) => r.data),
  updateStaff: (id: string, d: StaffInput) => api.patch(`/staff/${id}`, d).then((r) => r.data),
  deleteStaff: (id: string) => api.delete(`/staff/${id}`).then(() => null),
  resetPassword: (id: string) =>
    api.post<{ tempPassword: string }>(`/staff/${id}/reset-password`).then((r) => r.data),
};
