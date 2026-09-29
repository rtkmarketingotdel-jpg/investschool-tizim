import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, icon, className, id, ...rest },
  ref,
) {
  return (
    <label className="block" htmlFor={id}>
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <span className="relative block">
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-text placeholder:text-text-muted',
            !!icon && 'pr-11',
            error && 'border-red-500',
            className,
          )}
          {...rest}
        />
        {icon && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
      </span>
      {error && <span className="mt-1 block text-sm text-red-600">{error}</span>}
    </label>
  );
});
