import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { SchoolClass } from '@/lib/schoolApi';

export type Level = 'junior' | 'middle' | 'senior';
export const LEVELS: Level[] = ['junior', 'middle', 'senior'];
export const levelOf = (grade: number): Level => (grade <= 4 ? 'junior' : grade <= 9 ? 'middle' : 'senior');

/** Level accents use the theme tokens, so they follow light/dark automatically. */
export const levelTone: Record<Level, { chip: string; ring: string }> = {
  junior: { chip: 'bg-success/10 text-success', ring: 'text-success' },
  middle: { chip: 'bg-primary-soft text-primary', ring: 'text-primary' },
  senior: { chip: 'bg-warning/10 text-warning', ring: 'text-warning' },
};

export type Fill = 'open' | 'almost' | 'full';
export const fillOf = (c: Pick<SchoolClass, 'freeSeats' | 'capacity'>): Fill => (c.freeSeats === 0 ? 'full' : c.freeSeats <= 2 ? 'almost' : 'open');
export const fillTone: Record<Fill, string> = {
  open: 'bg-success/10 text-success',
  almost: 'bg-warning/10 text-warning',
  full: 'bg-danger/10 text-danger',
};
const fillStroke: Record<Fill, string> = { open: 'text-primary', almost: 'text-warning', full: 'text-danger' };

/** Thin donut showing how full a class is; the count sits in the middle. */
export function Ring({ value, total, size = 84, fill, children }: { value: number; total: number; size?: number; fill: Fill; children?: ReactNode }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value}/${total}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-surface-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className={cn('stroke-current transition-[stroke-dashoffset] duration-700', fillStroke[fill])}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function SplitBar({ boys, girls }: { boys: number; girls: number }) {
  const total = boys + girls || 1;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
      <div className="flex h-full">
        <div className="bg-primary/70" style={{ width: `${(boys / total) * 100}%` }} />
        <div className="bg-danger/45" style={{ width: `${(girls / total) * 100}%` }} />
      </div>
    </div>
  );
}
