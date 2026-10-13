import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { meApi } from '@/lib/meApi';
import { Button, Card, Skeleton, useToast } from '../ui';

const POLL_MS = 3000;
const POLL_LIMIT_MS = 5 * 60 * 1000;

/** Links the employee's own Telegram to the bot so salary notices reach them personally. */
export function TelegramSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['me', 'telegram'], queryFn: meApi.telegram });
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');

  // after the bot was opened, ask the server every few seconds whether the Start message arrived
  useEffect(() => {
    if (!waitingSince) return;
    const timer = window.setInterval(async () => {
      try {
        const r = await meApi.telegramCheck();
        if (r.linked) {
          setWaitingSince(null);
          toast(t('telegram.linkedToast'));
          void qc.invalidateQueries({ queryKey: ['me', 'telegram'] });
        } else if (r.expired || Date.now() - waitingSince > POLL_LIMIT_MS) {
          setWaitingSince(null);
          toast(t('telegram.timeout'), 'error');
        }
      } catch (e) {
        setWaitingSince(null);
        fail(e);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [waitingSince]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = useMutation({
    mutationFn: async () => {
      // open the tab right away (inside the click) so the browser does not block it as a popup
      const w = window.open('', '_blank');
      try {
        const { url } = await meApi.telegramLink();
        if (w) w.location.href = url;
        else window.location.href = url;
      } catch (e) {
        w?.close();
        throw e;
      }
    },
    onSuccess: () => setWaitingSince(Date.now()),
    onError: fail,
  });
  const unlink = useMutation({
    mutationFn: meApi.telegramUnlink,
    onSuccess: () => { toast(t('telegram.unlinkedToast')); void qc.invalidateQueries({ queryKey: ['me', 'telegram'] }); },
    onError: fail,
  });

  if (status.isLoading) return <Skeleton className="h-28" />;
  const s = status.data;
  return (
    <Card className="flex flex-wrap items-center gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Send className="h-6 w-6" /></span>
      <div className="min-w-48 flex-1">
        {s?.linked ? (
          <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-5 w-5" /> {t('telegram.linked')}</p>
        ) : (
          <p className="font-medium">{t('telegram.notLinked')}</p>
        )}
        <p className="text-sm text-text-muted">
          {!s?.botConfigured ? t('telegram.botMissing') : s.linked ? t('telegram.linkedHint') : waitingSince ? t('telegram.waiting') : t('telegram.hint')}
        </p>
      </div>
      {s?.botConfigured && (s.linked ? (
        <Button variant="secondary" loading={unlink.isPending} onClick={() => window.confirm(t('telegram.unlinkConfirm')) && unlink.mutate()}>{t('telegram.unlink')}</Button>
      ) : waitingSince ? (
        <Button variant="secondary" disabled><Loader2 className="h-4 w-4 animate-spin" /> {t('telegram.waitingShort')}</Button>
      ) : (
        <Button loading={link.isPending} onClick={() => link.mutate()}><Send className="h-4 w-4" /> {t('telegram.link')}</Button>
      ))}
    </Card>
  );
}
