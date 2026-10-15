import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Copy, QrCode, Send } from 'lucide-react';
import { plansApi } from '@/lib/plansApi';
import { QrModal } from '../QrModal';
import { Button, Card, Skeleton } from '../ui';

/**
 * Personal bot links of the group's trainees: a trainee opens their own link once, then rates every taught topic.
 * The teacher copies the links of those not linked yet, or shows one as a QR code in class.
 */
export function BotLinksPanel({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['plans', 'bot', groupId], queryFn: () => plansApi.botLinks(groupId), refetchInterval: 15_000 });
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; link: string } | null>(null);
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  };

  if (q.isLoading) return <Skeleton className="h-40" />;
  const items = q.data?.items ?? [];
  const linked = items.filter((i) => i.linked).length;
  const waiting = items.filter((i) => !i.linked && i.link);
  const all = waiting.map((i) => `${i.fullName}: ${i.link}`).join('\n');

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg"><Send className="h-5 w-5 text-text-muted" /> {t('plans.bot.title')}</h2>
        <p className="text-sm text-text-muted">{t('plans.bot.hint')}</p>
      </div>
      {!q.data?.configured ? (
        <p className="text-sm text-warning">{t('plans.bot.notConfigured')}</p>
      ) : (
        <>
          <div>
            <div className="flex justify-between text-sm"><span>{t('plans.bot.linked')}</span><span className="tabular-nums text-text-muted">{linked} / {items.length}</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${items.length ? (linked / items.length) * 100 : 0}%` }} /></div>
          </div>
          {waiting.length > 0 && (
            <Button variant="secondary" className="w-full px-3 py-2 text-sm" onClick={() => void copy('all', all)}>
              {copied === 'all' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t('plans.bot.copyAll', { count: waiting.length })}
            </Button>
          )}
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.fullName}</span>
                {i.linked ? (
                  <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" /> {t('plans.bot.on')}</span>
                ) : i.link ? (
                  <>
                    <button type="button" aria-label={t('common.copy')} title={t('common.copy')} onClick={() => void copy(i.id, i.link!)} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted">{copied === i.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
                    <button type="button" aria-label={t('plans.share.qr')} title={t('plans.share.qr')} onClick={() => setQr({ name: i.fullName, link: i.link! })} className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted"><QrCode className="h-4 w-4" /></button>
                  </>
                ) : null}
              </li>
            ))}
            {items.length === 0 && <li className="px-3 py-4 text-center text-sm text-text-muted">{t('groups.emptyRoster')}</li>}
          </ul>
        </>
      )}
      <QrModal title={qr?.name ?? ''} url={qr?.link ?? null} onClose={() => setQr(null)} />
    </Card>
  );
}
