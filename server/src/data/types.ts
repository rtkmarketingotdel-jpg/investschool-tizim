export type Role = 'DIRECTOR' | 'ACCOUNTANT' | 'ADMIN' | 'STAFF';
export type Lang = 'uz' | 'ru';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  role: Role;
  position: string;
  baseSalary: number;
  language: Lang;
  isActive: boolean;
  hiredAt: Date;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;
