import { api } from './api';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type StudentStatus = 'ACTIVE' | 'TRIAL' | 'LEFT';
export type Gender = 'MALE' | 'FEMALE';

export interface Student {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: Gender;
  classId: string | null;
  className: string | null;
  parentName: string;
  parentPhone: string;
  parentPhone2: string | null;
  address: string | null;
  district: string | null;
  isBoarding: boolean;
  clubs: string[];
  monthlyFee: number;
  discountPercent: number;
  status: StudentStatus;
  enrolledAt: string;
  leftAt: string | null;
  notes: string | null;
  /** null when the current role may not see finances */
  debt: number | null;
}
export type StudentInput = Omit<Student, 'id' | 'fullName' | 'className' | 'leftAt' | 'debt'>;

export interface StudentFilters {
  q?: string;
  status?: string;
  classId?: string;
  boarding?: string;
  debtor?: string;
  sort?: string;
  page: number;
  limit: number;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: number;
  capacity: number;
  teacherId: string | null;
  teacherName: string | null;
  teacherPhone: string | null;
  teacherPhotoUrl: string | null;
  boys: number;
  girls: number;
  branchId: string | null;
  studentCount: number;
  freeSeats: number;
}
export type ClassInput = Pick<SchoolClass, 'name' | 'grade' | 'capacity' | 'teacherId' | 'branchId'>;

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  usage: { users: number; classes: number };
}
export type BranchInput = Pick<Branch, 'name' | 'address' | 'lat' | 'lng' | 'radiusM'>;

export interface Subject {
  id: string;
  name: string;
  teachers: number;
}
export interface Club {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
  monthlyFee: number;
  members: number;
}
export type ClubInput = Pick<Club, 'name' | 'teacherId' | 'monthlyFee'>;

export type Role = 'DIRECTOR' | 'ACCOUNTANT' | 'ADMIN' | 'STAFF';
export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  position: string;
  isTeacher: boolean;
  isTutor: boolean;
  subject: string | null;
  photoUrl: string | null;
  profileCompletedAt: string | null;
  branchId: string | null;
  baseSalary: number;
  isActive: boolean;
  lateCount: number;
  absentCount: number;
}
export type StaffInput = Pick<StaffMember, 'fullName' | 'phone' | 'role' | 'position' | 'baseSalary' | 'isActive' | 'isTeacher' | 'isTutor' | 'subject' | 'branchId'> & {
  password?: string;
  homeroomClassId?: string | null;
};

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

export const schoolApi = {
  students: (f: StudentFilters) => api.get<Paged<Student>>('/students', { params: clean(f) }).then((r) => r.data),
  student: (id: string) => api.get<Student>(`/students/${id}`).then((r) => r.data),
  createStudent: (d: StudentInput) => api.post<Student>('/students', d).then((r) => r.data),
  updateStudent: (id: string, d: StudentInput) => api.patch<Student>(`/students/${id}`, d).then((r) => r.data),
  exportStudents: (f: Omit<StudentFilters, 'page' | 'limit' | 'debtor'>) =>
    api.get<Blob>('/students/export', { params: clean(f), responseType: 'blob' }).then((r) => r.data),

  subjects: () => api.get<{ items: Subject[] }>('/catalog/subjects').then((r) => r.data.items),
  saveSubject: (id: string | null, name: string) => (id ? api.patch<Subject>(`/catalog/subjects/${id}`, { name }) : api.post<Subject>('/catalog/subjects', { name })).then((r) => r.data),
  deleteSubject: (id: string) => api.delete(`/catalog/subjects/${id}`),
  clubs: () => api.get<{ items: Club[] }>('/catalog/clubs').then((r) => r.data.items),
  saveClub: (id: string | null, d: ClubInput) => (id ? api.patch<Club>(`/catalog/clubs/${id}`, d) : api.post<Club>('/catalog/clubs', d)).then((r) => r.data),
  deleteClub: (id: string) => api.delete<{ members: number }>(`/catalog/clubs/${id}`).then((r) => r.data),

  branches: () => api.get<{ items: Branch[] }>('/branches').then((r) => r.data.items),
  createBranch: (d: BranchInput) => api.post<Branch>('/branches', d).then((r) => r.data),
  updateBranch: (id: string, d: BranchInput) => api.patch<Branch>(`/branches/${id}`, d).then((r) => r.data),
  deleteBranch: (id: string, moveTo?: string) => api.delete(`/branches/${id}`, { params: moveTo ? { moveTo } : {} }).then((r) => r.data),
  assignBranch: (id: string, userIds: string[], classIds: string[]) => api.put(`/branches/${id}/assign`, { userIds, classIds }).then((r) => r.data),

  classes: () => api.get<{ items: SchoolClass[] }>('/classes').then((r) => r.data.items),
  createClass: (d: ClassInput) => api.post<SchoolClass>('/classes', d).then((r) => r.data),
  updateClass: (id: string, d: ClassInput) => api.patch<SchoolClass>(`/classes/${id}`, d).then((r) => r.data),

  staff: (p: { q?: string; role?: string; active?: string; teacher?: string; tutor?: string; page: number; limit: number }) =>
    api.get<Paged<StaffMember>>('/staff', { params: clean(p) }).then((r) => r.data),
  createStaff: (d: StaffInput) =>
    api.post<{ user: StaffMember; tempPassword: string; generated: boolean }>('/staff', d).then((r) => r.data),
  updateStaff: (id: string, d: StaffInput) => api.patch(`/staff/${id}`, d).then((r) => r.data),
  resetPassword: (id: string) =>
    api.post<{ tempPassword: string }>(`/staff/${id}/reset-password`).then((r) => r.data),
};
