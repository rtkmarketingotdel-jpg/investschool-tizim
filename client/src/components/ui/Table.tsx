import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className={cn('w-full text-left text-[15px]', className)} {...rest} />
    </div>
  );
}

export const Thead = (p: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className="bg-surface-muted text-sm text-text-muted" {...p} />
);

export const Th = ({ className, numeric, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) => (
  <th className={cn('px-6 py-4 font-medium', numeric && 'text-right', className)} {...rest} />
);

export const Tr = ({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-border last:border-0 hover:bg-surface-muted/60', className)} {...rest} />
);

export const Td = ({ className, numeric, ...rest }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) => (
  <td className={cn('px-6 py-5', numeric && 'text-right tabular-nums', className)} {...rest} />
);
