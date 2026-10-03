import { cn } from '@/lib/cn';

interface Props<T extends string> {
  tabs: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <div role="tablist" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
          className={cn(
            'whitespace-nowrap rounded-lg px-5 py-2.5 transition',
            tab.id === value ? 'bg-primary-soft text-primary' : 'text-text-muted hover:text-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
