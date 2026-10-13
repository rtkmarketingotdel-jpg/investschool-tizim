import type { Course, Gender, Group, Student, StudentStatus } from './types.js';
import { users } from './mockStore.js';
import { addDays, toLocalDate } from '../lib/date.js';
import { addMonths } from '../lib/period.js';

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;

const MALE = ['Azizbek', 'Muhammadali', 'Jasur', 'Sardor', 'Bobur', 'Doniyor', 'Sherzod', 'Otabek', 'Behruz', 'Umar', 'Ismoil', 'Abdulloh', 'Firdavs', 'Javohir', 'Shaxzod', 'Islom', 'Rustam', 'Akmal'];
const FEMALE = ['Sevinch', 'Mohinur', 'Madina', 'Dilnoza', 'Zilola', 'Nigora', 'Malika', 'Shahzoda', 'Aziza', 'Feruza', 'Sarvinoz', 'Kamola', 'Laylo', 'Munisa', 'Gulnora', 'Dildora'];
const SURNAMES = ['Karimov', 'Rahimov', 'Yusupov', 'Toshmatov', 'Ergashev', 'Nazarov', 'Qodirov', 'Abdullayev', 'Sobirov', 'Hamidov', 'Raxmatov', 'Olimov', 'Mirzayev', 'Tursunov', 'Jurayev'];
const DISTRICTS = ['Jomboy', 'Bulungʻur', 'Toyloq', 'Payariq', 'Samarqand sh.', 'Ishtixon', 'Kattaqoʻrgʻon'];

export const courses: Course[] = [
  { id: 'cr1', name: 'Tikuvchilik', durationMonths: 4, price: 2_400_000, description: 'Kiyim bichish va tikish, tikuv mashinalarida ishlash' },
  { id: 'cr2', name: 'Sartaroshlik', durationMonths: 3, price: 2_100_000, description: 'Erkaklar va ayollar soch turmagi' },
  { id: 'cr3', name: 'Oshpazlik', durationMonths: 3, price: 2_700_000, description: 'Milliy va Yevropa taomlari, qandolatchilik asoslari' },
  { id: 'cr4', name: 'Elektr payvandlash', durationMonths: 3, price: 3_000_000, description: 'Elektr yoyi bilan payvandlash, xavfsizlik texnikasi' },
  { id: 'cr5', name: 'Elektr montajchi', durationMonths: 4, price: 3_200_000, description: 'Ichki elektr tarmoqlarini oʻrnatish va taʼmirlash' },
  { id: 'cr6', name: 'Kompyuter savodxonligi', durationMonths: 2, price: 1_200_000, description: 'Windows, Word, Excel, internet' },
  { id: 'cr7', name: 'Grafik dizayn', durationMonths: 4, price: 3_600_000, description: 'Photoshop, Illustrator, Figma' },
  { id: 'cr8', name: 'Manikyur va pedikyur', durationMonths: 2, price: 1_800_000, description: 'Tirnoq parvarishi va dizayni' },
];

const today = toLocalDate();
const month = today.slice(0, 7);
const teachers = users.filter((u) => u.isTeacher);

/** [name, courseId, start month offset from now, branch, morning?, filled seats] */
const PLAN: Array<[string, string, number, string, boolean, number]> = [
  ['TK-01', 'cr1', -6, 'b1', true, 12],
  ['SR-01', 'cr2', -5, 'b1', false, 10],
  ['KS-01', 'cr6', -4, 'b2', true, 14],
  ['TK-02', 'cr1', -2, 'b1', true, 13],
  ['SR-02', 'cr2', -1, 'b1', false, 11],
  ['OS-01', 'cr3', -1, 'b1', true, 12],
  ['PV-01', 'cr4', -2, 'b2', false, 9],
  ['EL-01', 'cr5', -3, 'b1', false, 10],
  ['GD-01', 'cr7', -1, 'b1', false, 8],
  ['MN-01', 'cr8', 0, 'b2', true, 9],
  ['TK-03', 'cr1', 1, 'b1', true, 6],
  ['KS-02', 'cr6', 1, 'b2', false, 5],
];

export const groups: Group[] = PLAN.map(([name, courseId, offset, branchId, morning], i) => {
  const course = courses.find((c) => c.id === courseId)!;
  const startDate = `${addMonths(month, offset)}-05`;
  const endDate = addDays(`${addMonths(startDate.slice(0, 7), course.durationMonths)}-05`, -1);
  return {
    id: `g${i + 1}`,
    name,
    courseId,
    teacherId: teachers[i % Math.max(1, teachers.length)]?.id ?? null,
    branchId,
    capacity: 15,
    startDate,
    endDate,
    days: i % 2 ? [2, 4, 6] : [1, 3, 5],
    timeStart: morning ? '09:00' : '14:00',
    timeEnd: morning ? '12:00' : '17:00',
    room: `${100 + ((i * 7) % 20)}-xona`,
  };
});

const phone = () => `+99890${String(Math.floor(rnd() * 9_000_000) + 1_000_000)}`;
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join('');
const min = (a: string, b: string) => (a < b ? a : b);

export const students: Student[] = [];
let n = 1;
const make = (g: Group, status: StudentStatus) => {
  const course = courses.find((c) => c.id === g.courseId)!;
  const gender: Gender = course.id === 'cr8' || (course.id === 'cr1' && rnd() < 0.85) ? 'FEMALE'
    : course.id === 'cr4' || course.id === 'cr5' ? 'MALE' : rnd() < 0.5 ? 'MALE' : 'FEMALE';
  const surname = pick(SURNAMES);
  const fatherName = pick(MALE);
  const year = 1982 + Math.floor(rnd() * 26);
  const enrolledAt = min(today, addDays(g.startDate, -Math.floor(rnd() * 20)));
  students.push({
    id: `s${n++}`,
    firstName: pick(gender === 'MALE' ? MALE : FEMALE),
    lastName: gender === 'MALE' ? surname : `${surname}a`,
    middleName: gender === 'MALE' ? `${fatherName}ovich` : `${fatherName}ovna`,
    birthDate: `${year}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
    gender,
    groupId: g.id,
    phone: phone(),
    phone2: rnd() < 0.3 ? phone() : null,
    passport: rnd() < 0.85 ? `${pick(['AA', 'AB', 'AC', 'AD'])}${digits(7)}` : null,
    pinfl: rnd() < 0.8 ? `${year >= 2000 ? (gender === 'MALE' ? 5 : 6) : gender === 'MALE' ? 3 : 4}${digits(13)}` : null,
    address: null,
    district: pick(DISTRICTS),
    coursePrice: course.price,
    discountPercent: rnd() < 0.2 ? pick([10, 15, 20]) : 0,
    status,
    enrolledAt,
    leftAt: status === 'LEFT' ? min(today, addDays(g.startDate, 15 + Math.floor(rnd() * 30))) : null,
    notes: null,
  });
};

groups.forEach((g, i) => {
  const finished = g.endDate < today;
  for (let k = 0; k < PLAN[i]![5]; k++) {
    const r = rnd();
    const left = g.startDate < today && r < 0.07;
    make(g, left ? 'LEFT' : finished ? 'GRADUATED' : 'ACTIVE');
  }
});
