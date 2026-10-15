import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Copy, QrCode, RefreshCw, Send } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { schoolApi } from '@/lib/schoolApi';
import { QrModal } from '../QrModal';
import { Button, Card, useToast } from '../ui';

/** The trainee's personal bot link (lesson ratings come through it) and whether they opened it. */
export function StudentBotCard({ student }: { student: { id: string; fullName: string; telegramLinked?: boolean } }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState(false);
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const get = useMutation({ mutationFn: (renew: boolean) => schoolApi.studentBotLink(student.id, renew), onSuccess: (r, renew) => { setLink(r.link); if (renew) toast(t('plans.share.renewed')); }, onError: fail });
  const unlink = useMutation({ mutationFn: () => schoolApi.unlinkStudentBot(student.id), onSuccess: () => void qc.invalidateQueries({ queryKey: ['student', student.id] }), onError: fail });

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Send className="h-5 w-5" /></span>
        <div className="min-w-48 flex-1">
          <p className="font-medium">{t('plans.bot.studentTitle')}</p>
          {student.telegramLinked
            ? <p className="flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> {t('plans.bot.studentLinked')}</p>
            : <p className="text-sm text-text-muted">{t('plans.bot.studentHint')}</p>}
        </div>
        {!link && <Button variant="secondary" className="px-4 py-2 text-sm" loading={get.isPending} onClick={() => get.mutate(false)}>{t('plans.bot.showLink')}</Button>}
        {student.telegramLinked && <Button variant="ghost" className="px-3 py-2 text-sm" loading={unlink.isPending} onClick={() => window.confirm(t('plans.bot.unlinkConfirm')) && unlink.mutate()}>{t('telegram.unlink')}</Button>}
      </div>
      {link && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 break-all rounded-xl border border-border bg-surface-muted p-2.5 font-mono text-xs">{link}</p>
          <button type="button" aria-label={t('common.copy')} onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
          <button type="button" aria-label={t('plans.share.qr')} onClick={() => setQr(true)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><QrCode className="h-4 w-4" /></button>
          <button type="button" aria-label={t('plans.share.renew')} title={t('plans.share.renew')} onClick={() => window.confirm(t('plans.bot.renewConfirm')) && get.mutate(true)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><RefreshCw className="h-4 w-4" /></button>
        </div>
      )}
      <QrModal title={student.fullName} url={qr ? link : null} onClose={() => setQr(false)} />
    </Card>
  );
}
