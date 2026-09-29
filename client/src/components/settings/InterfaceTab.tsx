import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { setLanguage } from '@/i18n';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Card } from '../ui';

export function InterfaceTab() {
  const { t, i18n } = useTranslation();
  const { theme, toggle } = useTheme();
  const pick = (l: 'uz' | 'ru') => { setLanguage(l); api.patch('/me/language', { language: l }).catch(() => undefined); };
  const chip = (on: boolean) => cn('flex items-center gap-2 rounded-xl border px-5 py-3 font-medium', on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted');
  return (
    <Card className="max-w-2xl space-y-6">
      <div>
        <p className="mb-2 font-medium">{t('topbar.language')}</p>
        <div className="flex gap-3">
          <button aria-pressed={i18n.language === 'uz'} className={chip(i18n.language === 'uz')} onClick={() => pick('uz')}><Globe className="h-5 w-5" /> Oʻzbekcha</button>
          <button aria-pressed={i18n.language === 'ru'} className={chip(i18n.language === 'ru')} onClick={() => pick('ru')}><Globe className="h-5 w-5" /> Русский</button>
        </div>
      </div>
      <div>
        <p className="mb-2 font-medium">{t('settings.interface.theme')}</p>
        <div className="flex gap-3">
          <button aria-pressed={theme === 'light'} className={chip(theme === 'light')} onClick={() => theme !== 'light' && toggle()}><Sun className="h-5 w-5" /> {t('settings.interface.light')}</button>
          <button aria-pressed={theme === 'dark'} className={chip(theme === 'dark')} onClick={() => theme !== 'dark' && toggle()}><Moon className="h-5 w-5" /> {t('settings.interface.dark')}</button>
        </div>
      </div>
    </Card>
  );
}
