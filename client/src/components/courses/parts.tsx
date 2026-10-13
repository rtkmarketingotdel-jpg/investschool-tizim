import { BookOpen, ChefHat, Flame, Hammer, Laptop, Palette, Scissors, Shirt, Sparkles, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { Avatar } from '../ui';

/** A calm rotating set of tints (theme tokens, so they follow light/dark). */
const TINTS = ['bg-primary-soft text-primary', 'bg-success/10 text-success', 'bg-warning/10 text-warning', 'bg-danger/10 text-danger'];
export const tintFor = (name: string) => TINTS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length]!;

const COURSE_ICONS: Array<[RegExp, LucideIcon]> = [
  [/tikuv|bichish|швей|портн/i, Shirt], [/sartarosh|барбер|парикмах/i, Scissors], [/oshpaz|qandol|повар|кулин/i, ChefHat],
  [/payvand|свар/i, Flame], [/elektr|электр/i, Zap], [/kompyuter|dastur|it\b|компьют|программ/i, Laptop],
  [/dizayn|rassom|дизайн/i, Palette], [/manikyur|kosmet|vizaj|маникюр|космет/i, Sparkles], [/santex|avto|mexanik|сантех|авто|механ/i, Wrench],
  [/duradgor|qurilish|столяр|строит/i, Hammer],
];
export const courseIcon = (name: string): LucideIcon => COURSE_ICONS.find(([re]) => re.test(name))?.[1] ?? BookOpen;

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
  'group relative overflow-hidden rounded-xl bg-surface transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0';
