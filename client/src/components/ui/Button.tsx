import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-primary-bright to-primary text-white shadow-md shadow-primary/30 hover:from-primary hover:to-primary-deep',
  secondary: 'border border-border bg-surface text-text shadow-sm hover:bg-surface-muted',
  ghost: 'text-text-muted hover:bg-surface-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
        styles[variant],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function IconButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:bg-surface-muted',
        className,
      )}
      {...rest}
    />
  );
}
