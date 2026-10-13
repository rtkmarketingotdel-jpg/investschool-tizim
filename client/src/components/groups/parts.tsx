import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { cn } from '@/lib/cn';
import { todayLocal } from '@/lib/dates';
import type { Group, GroupStatus } from '@/lib/schoolApi';

export const STATUSES: GroupStatus[] = ['ACTIVE', 'PLANNED', 'FINISHED'];

/** Status accents use the theme tokens, so they follow light/dark automatically. */
export const statusTone: Record<GroupStatus, { chip: string; ring: string }> = {
  ACTIVE: { chip: 'bg-success/10 text-success', ring: 'text-success' },
  PLANNED: { chip: 'bg-primary-soft text-primary', ring: 'text-primary' },
  FINISHED: { chip: 'bg-surface-muted text-text-muted', ring: 'text-text-muted' },
};

export type Fill = 'open' | 'almost' | 'full';
export const fillOf = (g: Pick<Group, 'freeSeats' | 'capacity'>): Fill => (g.freeSeats === 0 ? 'full' : g.freeSeats <= 2 ? 'almost' : 'open');
export const fillTone: Record<Fill, string> = {
  open: 'bg-success/10 text-success',
  almost: 'bg-warning/10 text-warning',
  full: 'bg-danger/10 text-danger',
};
const fillStroke: Record<Fill, string> = { open: 'text-primary', almost: 'text-warning', full: 'text-danger' };

/** "Du, Cho, Ju · 09:00–12:00" */
export const scheduleText = (g: Pick<Group, 'days' | 'timeStart' | 'timeEnd'>, t: TFunction) =>
  `${g.days.map((d) => t(`groups.daysShort.${d}`)).join(', ')} · ${g.timeStart}–${g.timeEnd}`;

/** Share of the course already behind (0..1) for a running group. */
export function progressOf(g: Pick<Group, 'startDate' | 'endDate'>, today = todayLocal()) {
  const start = Date.parse(g.startDate);
  const end = Date.parse(g.endDate);
  const now = Date.parse(today);
  if (!(end > start)) return 0;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Thin donut showing how full a group is; the count sits in the middle. */
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

export function SplitBar({ men, women }: { men: number; women: number }) {
  const total = men + women || 1;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" aria-hidden>
      <div className="flex h-full">
        <div className="bg-primary/70" style={{ width: `${(men / total) * 100}%` }} />
        <div className="bg-danger/45" style={{ width: `${(women / total) * 100}%` }} />
      </div>
    </div>
  );
}

/** Elapsed share of the course between its start and end dates. */
export function CourseProgress({ group: g }: { group: Pick<Group, 'startDate' | 'endDate' | 'status'> }) {
  const pct = g.status === 'FINISHED' ? 100 : g.status === 'PLANNED' ? 0 : Math.round(progressOf(g) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full', g.status === 'FINISHED' ? 'bg-text-muted/40' : 'bg-success')} style={{ width: `${pct}%` }} />
    </div>
  );
}
