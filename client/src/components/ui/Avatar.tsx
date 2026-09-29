import { cn } from '@/lib/cn';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export function Avatar({ name, size = 48, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
