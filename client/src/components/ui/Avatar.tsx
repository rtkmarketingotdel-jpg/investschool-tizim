import { cn } from '@/lib/cn';
import { uploadUrl } from '@/lib/api';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export function Avatar({ name, size = 48, className, src }: { name: string; size?: number; className?: string; src?: string | null }) {
  const url = uploadUrl(src);
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-medium text-primary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
