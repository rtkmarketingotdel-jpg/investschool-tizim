import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, error, className, children, ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm">{label}</span>}
      <span className="relative block">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-xl border border-border bg-surface-muted px-4 py-3 pr-10 text-text',
            error && 'border-red-500',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </span>
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
});
