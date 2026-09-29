import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<BadgeTone, string> = {
  success: 'bg-[#DCFCE7] text-[#15803D] dark:bg-green-500/15 dark:text-green-400',
  warning: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-500/15 dark:text-amber-400',
  danger: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-500/15 dark:text-red-400',
  neutral: 'bg-[#F1F5F9] text-[#475569] dark:bg-slate-500/15 dark:text-slate-400',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-sm font-medium', tones[tone])}>
      {children}
    </span>
  );
}
