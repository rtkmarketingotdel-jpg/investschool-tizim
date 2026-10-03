import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut, Maximize, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { setLanguage } from '@/i18n';
import { api } from '@/lib/api';
import { Avatar, Dropdown, DropdownItem, IconButton } from '../ui';
import { GlobalSearch } from './GlobalSearch';
import { InstallButton } from '../InstallApp';
import { NotificationsButton } from './NotificationsPanel';

export function Topbar({ onMenu }: { onMenu: () => void }) {
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
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-surface px-4 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <IconButton aria-label={t('topbar.toggleSidebar')} className="xl:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
        </IconButton>
        {user.role !== 'TEACHER' && <GlobalSearch />}
      </div>

      <div className="flex items-center gap-2">
        <IconButton
          aria-label={t('topbar.fullscreen')}
          className="hidden md:inline-flex"
          onClick={() => (isFullscreen ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
        >
          <Maximize className="h-5 w-5" />
        </IconButton>
        <InstallButton />
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
                <Globe className="h-4 w-4" /> Oʻzbekcha
              </DropdownItem>
              <DropdownItem active={i18n.language === 'ru'} onClick={() => { changeLang('ru'); close(); }}>
                <Globe className="h-4 w-4" /> Русский
              </DropdownItem>
            </>
          )}
        </Dropdown>
        <NotificationsButton />
        <Link to="/profile" className="ml-2 hidden items-center gap-3 rounded-xl px-1 py-1 hover:bg-surface-muted lg:flex" aria-label={t('profile.title')}>
          <Avatar name={user.fullName} size={40} src={user.photoUrl} />
          <div className="leading-tight">
            <p className="max-w-40 truncate text-sm font-medium">{user.fullName}</p>
            <p className="text-xs text-text-muted">{t(`roles.${user.role}`)}</p>
          </div>
        </Link>
        <IconButton aria-label={t('auth.logout')} onClick={logout}>
          <LogOut className="h-5 w-5" />
        </IconButton>
      </div>

    </header>
  );
}
