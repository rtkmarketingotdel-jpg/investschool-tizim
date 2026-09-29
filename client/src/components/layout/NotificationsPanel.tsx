import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { financeApi, type AppNotification } from '@/lib/financeApi';
import { cn } from '@/lib/cn';
import { Drawer, IconButton } from '../ui';
import { useState } from 'react';

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: financeApi.notifications, refetchInterval: 60_000 });

export function NotificationsButton() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const refresh = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const readAll = useMutation({ mutationFn: financeApi.readAll, onSuccess: refresh });
  const readOne = useMutation({ mutationFn: financeApi.readOne, onSuccess: refresh });

  const go = (n: AppNotification) => {
    if (!n.isRead) readOne.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };
  const unread = data?.unread ?? 0;
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ru' ? 'ru-RU' : 'uz-UZ', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tashkent' });

  return (
    <>
      <IconButton aria-label={t('topbar.notifications')} onClick={() => setOpen(true)}>
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
            {unread}
          </span>
        )}
      </IconButton>
      <Drawer open={open} onClose={() => setOpen(false)} title={t('topbar.notifications')} width={400}>
        {data && data.items.length > 0 ? (
          <div className="space-y-3">
            <button onClick={() => readAll.mutate()} disabled={unread === 0} className="flex items-center gap-2 text-sm font-medium text-primary disabled:opacity-40">
              <CheckCheck className="h-4 w-4" /> {t('topbar.markAllRead')}
            </button>
            {data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n)}
                className={cn('block w-full rounded-xl border border-border p-4 text-left hover:bg-surface-muted', !n.isRead && 'border-primary/40 bg-primary-soft')}
              >
                <p className="font-medium">{t(n.title, n.params ?? {})}</p>
                <p className="mt-1 text-sm text-text-muted">{t(n.body, n.params ?? {})}</p>
                <p className="mt-2 text-xs text-text-muted">{fmt.format(new Date(n.createdAt))}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-text-muted">{t('topbar.noNotifications')}</p>
        )}
      </Drawer>
    </>
  );
}
