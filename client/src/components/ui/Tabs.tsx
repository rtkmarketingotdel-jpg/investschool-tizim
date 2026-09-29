import { cn } from '@/lib/cn';

interface Props<T extends string> {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-3 font-medium transition',
            tab.id === value ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
