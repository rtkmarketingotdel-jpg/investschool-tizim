import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export function Field({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-4', className)}>{children}</div>;
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-sm font-medium uppercase tracking-wider text-text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  function Textarea({ label, className, ...rest }, ref) {
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-sm">{label}</span>}
        <textarea
          ref={ref}
          rows={3}
          className={cn('w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-text', className)}
          {...rest}
        />
      </label>
    );
  },
);

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded accent-[rgb(var(--primary))]" />
      <span>{label}</span>
    </label>
  );
}
