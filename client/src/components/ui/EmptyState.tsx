import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, text, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-text-muted">{text}</p>}
      {action}
    </div>
  );
}
