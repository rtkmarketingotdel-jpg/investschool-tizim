import { Atom, BookOpen, Calculator, Crown, Dumbbell, FlaskConical, Globe, Landmark, Languages, Laptop, Leaf, Music, Palette, Swords, Trophy, type LucideIcon } from 'lucide-react';
import { Avatar } from '../ui';

/** A calm rotating set of tints (theme tokens, so they follow light/dark). */
const TINTS = ['bg-primary-soft text-primary', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-danger/10 text-danger'];
export const tintFor = (name: string) => TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length]!;

const SUBJECT_ICONS: Array<[RegExp, LucideIcon]> = [
  [/matem/i, Calculator], [/fizika/i, Atom], [/kimyo/i, FlaskConical], [/biolog/i, Leaf], [/tarix/i, Landmark], [/geograf/i, Globe],
  [/til|adabiyot/i, Languages], [/informat/i, Laptop], [/jismoniy/i, Dumbbell], [/tasvir|sanʼat|san'at/i, Palette], [/musiq/i, Music],
];
export const subjectIcon = (name: string): LucideIcon => SUBJECT_ICONS.find(([re]) => re.test(name))?.[1] ?? BookOpen;

const CLUB_ICONS: Array<[RegExp, LucideIcon]> = [
  [/shaxmat/i, Crown], [/taekwondo|karate|kurash/i, Swords], [/mental|arifmet/i, Calculator], [/til/i, Languages], [/raqs|musiq|qoʻshiq/i, Music], [/rasm|san/i, Palette],
];
export const clubIcon = (name: string): LucideIcon => CLUB_ICONS.find(([re]) => re.test(name))?.[1] ?? Trophy;

/** Overlapping avatars with a "+n" tail. */
export function AvatarStack({ people, max = 4 }: { people: Array<{ id: string; fullName: string; photoUrl: string | null }>; max?: number }) {
  const shown = people.slice(0, max);
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <span key={p.id} title={p.fullName} className="rounded-full ring-2 ring-surface" style={{ marginLeft: i === 0 ? 0 : -10 }}>
          <Avatar name={p.fullName} size={32} src={p.photoUrl} />
        </span>
      ))}
      {people.length > max && (
        <span className="ml-1 flex h-8 min-w-8 items-center justify-center rounded-full bg-surface-muted px-2 text-xs text-text-muted ring-2 ring-surface" style={{ marginLeft: -10 }}>+{people.length - max}</span>
      )}
    </div>
  );
}

export const cardShell =
  'group relative overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_28px_-18px_rgb(0_0_0/0.18)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_2px_4px_rgb(0_0_0/0.05),0_22px_40px_-20px_rgb(37_99_235/0.30)] motion-reduce:transition-none motion-reduce:hover:translate-y-0';
