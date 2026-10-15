import type { Course, Group, Student } from './types.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { addMonths } from '../lib/period.js';

// One example of each: a course, a running group of that course (led by the demo teacher) and a trainee in it.
const month = toLocalDate().slice(0, 7);

export const courses: Course[] = [
  { id: 'cr1', name: 'Tikuvchilik', durationMonths: 4, price: 2_400_000, description: 'Kiyim bichish va tikish, tikuv mashinalarida ishlash' },
];

const startDate = `${addMonths(month, -1)}-05`;
export const groups: Group[] = [
  {
    id: 'g1', name: 'TK-01', courseId: 'cr1', teacherId: 'u2', branchId: 'b1', capacity: 15,
    startDate, endDate: addDays(`${addMonths(startDate.slice(0, 7), 4)}-05`, -1),
    days: [1, 3, 5], timeStart: '09:00', timeEnd: '12:00', room: '101-xona',
  },
];

export const students: Student[] = [
  {
    id: 's1', firstName: 'Madina', lastName: 'Karimova', middleName: 'Rustamovna', birthDate: '1998-04-12', gender: 'FEMALE',
    groupId: 'g1', phone: '+998901234567', phone2: null, passport: 'AB1234567', pinfl: '49804121234567',
    address: null, district: 'Samarqand sh.', coursePrice: 2_400_000, discountPercent: 0, status: 'ACTIVE', externalId: null, externalCourse: null, telegramChatId: null, telegramCode: null,
    enrolledAt: addDays(startDate, -3), leftAt: null, notes: null,
  },
];
