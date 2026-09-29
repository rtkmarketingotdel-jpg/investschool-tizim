import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, Maximize, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { setLanguage } from '@/i18n';
import { api } from '@/lib/api';
import { Avatar, Dropdown, DropdownItem, IconButton } from '../ui';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsButton } from './NotificationsPanel';

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

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
        {user.role !== 'STAFF' && <GlobalSearch />}
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
        <NotificationsButton />
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

    </header>
  );
}
