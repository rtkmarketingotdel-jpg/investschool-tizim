import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCircle } from 'lucide-react';
import { brand } from '@/brand.config';
import { useAuth } from '@/context/AuthContext';
import { navGroups } from '@/nav';
import { cn } from '@/lib/cn';

/** Icon rail: always compact; the page name pops out next to the icon on hover/focus. */
export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(user.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className="flex w-[68px] shrink-0 flex-col border-r border-border/70 bg-surface md:w-[76px]">
      <div className="flex h-[72px] shrink-0 items-center justify-center border-b border-border/70">
        <img src={brand.logo} alt={brand.name} className="h-10 w-10 rounded-full" />
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {user.role !== 'DIRECTOR' && (
          <div className="mb-3 flex flex-col items-center gap-1 border-b border-border/70 pb-3">
            <RailLink to="/me" label={t('nav.me')} icon={UserCircle} />
          </div>
        )}
        {groups.map((g, gi) => (
          <div key={g.titleKey} className={cn('flex flex-col items-center gap-1 pb-3', gi < groups.length - 1 && 'mb-3 border-b border-border/70')}>
            {g.items.map((i) => (
              <RailLink key={i.to} to={i.to} end={i.end} label={t(i.labelKey)} icon={i.icon} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function RailLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTip({ x: r.right + 12, y: r.top + r.height / 2 });
  };
  return (
    <>
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        onMouseEnter={(e) => show(e.currentTarget)}
        onMouseLeave={() => setTip(null)}
        onFocus={(e) => show(e.currentTarget)}
        onBlur={() => setTip(null)}
        onClick={() => setTip(null)}
        className={({ isActive }) =>
          cn(
            'relative flex h-11 w-11 items-center justify-center rounded-xl transition',
            isActive
              ? 'bg-primary-soft text-primary before:absolute before:-left-[11px] before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-r-full before:bg-primary md:before:-left-[15px]'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
          )
        }
      >
        <Icon className="h-5 w-5" />
      </NavLink>
      {tip &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
            className="pointer-events-none fixed z-[90] -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary-deep px-3 py-2 text-sm text-white shadow-lg before:absolute before:-left-1 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rotate-45 before:bg-primary-deep"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
