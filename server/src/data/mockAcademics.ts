import type { Club, Subject } from './types.js';

const SUBJECTS = ['Matematika', 'Ona tili va adabiyot', 'Ingliz tili', 'Rus tili', 'Fizika', 'Kimyo', 'Biologiya', 'Tarix', 'Geografiya', 'Informatika', 'Jismoniy tarbiya', 'Tasviriy sanʼat', 'Musiqa', 'Boshlangʻich sinf'];

export const subjects: Subject[] = SUBJECTS.map((name, i) => ({ id: `sb${i + 1}`, name }));

export const clubs: Club[] = [
  { id: 'cl1', name: 'Mental arifmetika', teacherId: 'u12', monthlyFee: 200_000 },
  { id: 'cl2', name: 'Taekwondo', teacherId: 'u13', monthlyFee: 250_000 },
  { id: 'cl3', name: 'Shaxmat', teacherId: 'u10', monthlyFee: 150_000 },
  { id: 'cl4', name: 'Raqs', teacherId: null, monthlyFee: 180_000 },
  { id: 'cl5', name: 'Ingliz tili', teacherId: 'u11', monthlyFee: 220_000 },
];
