import type { Gender, SchoolClass, Student, StudentStatus } from './types.js';
import { users } from './mockStore.js';

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;

const MALE = ['Azizbek', 'Muhammadali', 'Jasur', 'Sardor', 'Bobur', 'Doniyor', 'Sherzod', 'Otabek', 'Behruz', 'Umar', 'Ismoil', 'Abdulloh', 'Firdavs', 'Javohir', 'Shaxzod', 'Islom'];
const FEMALE = ['Sevinch', 'Mohinur', 'Madina', 'Dilnoza', 'Zilola', 'Nigora', 'Malika', 'Shahzoda', 'Aziza', 'Feruza', 'Sarvinoz', 'Kamola', 'Laylo', 'Munisa', 'Asal', 'Durdona'];
const SURNAMES = ['Karimov', 'Rahimov', 'Yusupov', 'Toshmatov', 'Ergashev', 'Nazarov', 'Qodirov', 'Abdullayev', 'Sobirov', 'Hamidov', 'Raxmatov', 'Olimov', 'Mirzayev', 'Tursunov', 'Jurayev'];
const DISTRICTS = ['Jomboy', 'Bulungʻur', 'Toyloq', 'Payariq', 'Samarqand sh.', 'Ishtixon', 'Kattaqoʻrgʻon'];
const CLUBS = ['Mental arifmetika', 'Taekwondo', 'Shaxmat', 'Raqs', 'Ingliz tili'];

const CLASS_NAMES = ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '4-A', '5-A', '6-A', '7-A', '8-A', '9-A'];
const FILL = [14, 12, 15, 11, 13, 12, 10, 9, 12, 14, 13, 11];
const teachers = users.filter((u) => u.position.includes('oʻqituvchisi'));

export const classes: SchoolClass[] = CLASS_NAMES.map((name, i) => ({
  id: `c${i + 1}`,
  name,
  grade: parseInt(name, 10),
  capacity: 15,
  teacherId: teachers[i % teachers.length]?.id ?? null,
}));

const phone = () => `+99890${String(Math.floor(rnd() * 9_000_000) + 1_000_000)}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export const students: Student[] = [];
let n = 1;
const make = (classId: string | null, grade: number, status: StudentStatus) => {
  const gender: Gender = rnd() < 0.5 ? 'MALE' : 'FEMALE';
  const surname = pick(SURNAMES);
  const fatherName = pick(MALE);
  const discount = rnd() < 0.2 ? pick([10, 15, 20]) : 0;
  const year = 2026 - (6 + grade) - (rnd() < 0.5 ? 0 : 1);
  students.push({
    id: `s${n++}`,
    firstName: pick(gender === 'MALE' ? MALE : FEMALE),
    lastName: gender === 'MALE' ? surname : `${surname}a`,
    middleName: gender === 'MALE' ? `${fatherName}ovich` : `${fatherName}ovna`,
    birthDate: `${year}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
    gender,
    classId,
    parentName: `${surname} ${fatherName}`,
    parentPhone: phone(),
    parentPhone2: rnd() < 0.4 ? phone() : null,
    address: null,
    district: pick(DISTRICTS),
    isBoarding: rnd() < 0.2,
    clubs: rnd() < 0.5 ? [pick(CLUBS)] : [],
    monthlyFee: 2_000_000 + Math.floor(rnd() * 5) * 500_000,
    discountPercent: discount,
    status,
    enrolledAt: rnd() < 0.05
      ? iso(new Date(Date.UTC(2026, new Date().getMonth(), 1 + Math.floor(rnd() * 20))))
      : iso(new Date(Date.UTC(2024 + Math.floor(rnd() * 2), 8, 1 + Math.floor(rnd() * 20)))),
    leftAt: status === 'LEFT' ? iso(new Date(Date.UTC(2026, 5, 1 + Math.floor(rnd() * 25)))) : null,
    notes: null,
  });
};

classes.forEach((c, i) => {
  for (let k = 0; k < FILL[i]!; k++) {
    const r = rnd();
    make(c.id, c.grade, r < 0.05 ? 'TRIAL' : 'ACTIVE');
  }
});
for (let k = 0; k < 8; k++) make(null, 1 + Math.floor(rnd() * 9), 'LEFT');
