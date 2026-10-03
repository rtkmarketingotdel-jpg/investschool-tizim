import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronsLeft, UserCircle } from 'lucide-react';
import { brand } from '@/brand.config';
import { useAuth } from '@/context/AuthContext';
import { navGroups } from '@/nav';
import { cn } from '@/lib/cn';

const KEY = 'sidebar-open';
const initialOpen = () => {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null) return v === '1';
  } catch { /* storage may be blocked */ }
  return window.matchMedia('(min-width: 1280px)').matches;
};

/**
 * Collapsible navigation. Open: icons with page names. Closed: an icon rail, the name pops out beside the icon on hover.
 * Below md the open sidebar floats over the page instead of pushing it.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(initialOpen);

  const toggle = () => setOpen((o) => {
    try { localStorage.setItem(KEY, o ? '0' : '1'); } catch { /* ignore */ }
    return !o;
  });
  // on phones the open sidebar covers the page: close it after navigating
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setOpen(false);
  }, [pathname]);

  if (!user) return null;
  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(user.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={toggle} />}
      <div className={cn('relative z-40 w-[68px] shrink-0 transition-[width] duration-300 ease-out', open ? 'md:w-[248px]' : 'md:w-[76px]')}>
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex flex-col overflow-hidden border-r border-border/70 bg-surface transition-[width] duration-300 ease-out',
            open ? 'w-[248px]' : 'w-[68px] md:w-[76px]',
          )}
        >
          <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border/70 px-3 md:px-4">
            <img src={brand.logo} alt="" className="h-11 w-11 shrink-0 rounded-full" />
            <span className={cn('truncate text-lg transition-opacity duration-200', open ? 'opacity-100 delay-100' : 'pointer-events-none opacity-0')}>{brand.name}</span>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-4">
            {user.role !== 'DIRECTOR' && (
              <div className="mb-3 border-b border-border/70 pb-3">
                <RailLink to="/me" label={t('nav.me')} icon={UserCircle} open={open} />
              </div>
            )}
            {groups.map((g, gi) => (
              <div key={g.titleKey} className={cn('space-y-1 pb-3', gi < groups.length - 1 && 'mb-3 border-b border-border/70')}>
                <p className={cn('truncate px-3 pb-1 text-xs uppercase tracking-wider text-text-muted transition-opacity duration-200', open ? 'opacity-100' : 'h-0 pb-0 opacity-0')}>{t(g.titleKey)}</p>
                {g.items.map((i) => (
                  <RailLink key={i.to} to={i.to} end={i.end} label={t(i.labelKey)} icon={i.icon} open={open} />
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <button
          type="button"
          onClick={toggle}
          aria-label={t('topbar.toggleSidebar')}
          aria-expanded={open}
          className="absolute -right-3.5 top-[58px] z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-sm transition hover:border-primary hover:bg-primary hover:text-white"
        >
          <ChevronsLeft className={cn('h-4 w-4 transition-transform duration-300', !open && 'rotate-180')} />
        </button>
      </div>
    </>
  );
}

function RailLink({ to, label, icon: Icon, end, open }: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean; open: boolean }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const show = (el: HTMLElement) => {
    if (open) return;
    const r = el.getBoundingClientRect();
    setTip({ x: r.right + 12, y: r.top + r.height / 2 });
  };
  useEffect(() => { if (open) setTip(null); }, [open]);
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
            'relative flex h-11 items-center gap-3 rounded-xl px-3 transition duration-200',
            isActive
              ? 'bg-primary-soft text-primary before:absolute before:-left-3 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-r-full before:bg-primary md:before:-left-4'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
          )
        }
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className={cn('truncate transition-opacity duration-200', open ? 'opacity-100 delay-100' : 'opacity-0')}>{label}</span>
      </NavLink>
      {tip &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
            className="pointer-events-none fixed z-[90] -translate-y-1/2 animate-tip-in whitespace-nowrap rounded-lg bg-primary-deep px-3 py-2 text-sm text-white shadow-lg motion-reduce:animate-none before:absolute before:-left-1 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rotate-45 before:bg-primary-deep"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
