import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Globe, LogOut, Maximize, Menu, Moon, Search, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { setLanguage } from '@/i18n';
import { api } from '@/lib/api';
import { Avatar, Dropdown, DropdownItem, Drawer, IconButton } from '../ui';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = 0; // wired to the notifications API in a later stage

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const changeLang = (lang: 'uz' | 'ru') => {
    setLanguage(lang);
    api.patch('/me/language', { language: lang }).catch(() => undefined);
  };

  if (!user) return null;
  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconButton aria-label={t('topbar.toggleSidebar')} onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </IconButton>
        <label className="relative hidden w-full max-w-md sm:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            aria-label={t('topbar.search')}
            placeholder={t('topbar.search')}
            className="w-full rounded-xl border-0 bg-surface-muted py-3 pl-11 pr-4 placeholder:text-text-muted"
          />
        </label>
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          aria-label={t('topbar.fullscreen')}
          className="hidden md:inline-flex"
          onClick={() => (isFullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
        >
          <Maximize className="h-5 w-5" />
        </IconButton>
        <IconButton aria-label={t('topbar.theme')} onClick={toggle}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </IconButton>
        <Dropdown
          trigger={({ toggle: tg }) => (
            <IconButton aria-label={t('topbar.language')} onClick={tg}>
              <Globe className="h-5 w-5" />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <DropdownItem active={i18n.language === 'uz'} onClick={() => { changeLang('uz'); close(); }}>
                🌐 Oʻzbekcha
              </DropdownItem>
              <DropdownItem active={i18n.language === 'ru'} onClick={() => { changeLang('ru'); close(); }}>
                🌐 Русский
              </DropdownItem>
            </>
          )}
        </Dropdown>
        <IconButton aria-label={t('topbar.notifications')} onClick={() => setNotifOpen(true)}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
              {unread}
            </span>
          )}
        </IconButton>
        <div className="ml-2 hidden items-center gap-3 lg:flex">
          <Avatar name={user.fullName} size={40} />
          <div className="leading-tight">
            <p className="max-w-40 truncate text-sm font-semibold">{user.fullName}</p>
            <p className="text-xs text-text-muted">{t(`roles.${user.role}`)}</p>
          </div>
        </div>
        <IconButton aria-label={t('auth.logout')} onClick={logout}>
          <LogOut className="h-5 w-5" />
        </IconButton>
      </div>

      <Drawer open={notifOpen} onClose={() => setNotifOpen(false)} title={t('topbar.notifications')} width={400}>
        <div className="flex flex-col items-center gap-3 py-16 text-text-muted">
          <Check className="h-8 w-8" />
          <p>{t('topbar.noNotifications')}</p>
        </div>
      </Drawer>
    </header>
  );
}
