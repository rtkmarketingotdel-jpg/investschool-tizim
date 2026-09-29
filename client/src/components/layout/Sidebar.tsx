import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { brand } from '@/brand.config';
import { useAuth } from '@/context/AuthContext';
import { navGroups } from '@/nav';
import { cn } from '@/lib/cn';
import { UserCircle } from 'lucide-react';

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onNavigate }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(user.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onNavigate} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-surface transition-all md:static md:translate-x-0',
          collapsed ? 'md:w-[72px]' : 'md:w-[280px]',
          'w-[280px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border px-4">
          <img src={brand.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl" />
          <span className={cn('truncate text-lg font-medium', collapsed && 'md:hidden')}>{brand.name}</span>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          <NavItemLink
            collapsed={collapsed}
            onNavigate={onNavigate}
            to="/me"
            label={t('nav.me')}
            icon={UserCircle}
          />
          {groups.map((g) => (
            <div key={g.titleKey}>
              <p className={cn('mb-2 px-3 text-xs uppercase tracking-wider text-text-muted', collapsed && 'md:hidden')}>
                {t(g.titleKey)}
              </p>
              <div className="space-y-1">
                {g.items.map((i) => (
                  <NavItemLink
                    key={i.to}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                    to={i.to}
                    end={i.end}
                    label={t(i.labelKey)}
                    icon={i.icon}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavItemLink({
  to, label, icon: Icon, collapsed, onNavigate, end,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  onNavigate: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-3 font-medium transition',
          isActive ? 'bg-primary-soft text-primary' : 'text-text-muted hover:bg-surface-muted hover:text-text',
          collapsed && 'md:justify-center',
        )
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className={cn('truncate', collapsed && 'md:hidden')}>{label}</span>
    </NavLink>
  );
}
