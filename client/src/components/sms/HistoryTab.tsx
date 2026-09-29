import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ban, MessageSquare, RotateCcw } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { smsApi, type Campaign, type CampaignStatus } from '@/lib/smsApi';
import { Pagination } from '../Pagination';
import { Badge, Button, Drawer, EmptyState, Select, Skeleton, Table, Td, Th, Thead, Tr, useToast, type BadgeTone } from '../ui';

const tone: Record<CampaignStatus, BadgeTone> = { SCHEDULED: 'warning', SENDING: 'warning', DONE: 'success', CANCELLED: 'neutral' };
const msgTone = { QUEUED: 'neutral', SENT: 'success', SIMULATED: 'warning', FAILED: 'danger' } as const;
const LIMIT = 15;

export function useAudienceLabel() {
  const { t } = useTranslation();
  // labels come from the server as "KIND" or "KIND:argument" (e.g. "CLASSES:3", "STAFF:TEACHERS")
  return (label: string) => {
    const [kind, arg] = label.split(':');
    if (kind === 'STAFF') return t(`sms.audience.staff${arg === 'TEACHERS' ? 'Teachers' : arg === 'TUTORS' ? 'Tutors' : 'All'}`);
    if (arg !== undefined) return t(`sms.audienceCount.${kind}`, { count: Number(arg) });
    return t(`sms.audience.${kind}`);
  };
}

const fmtDate = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' }).format(new Date(iso));

function CampaignDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const label = useAudienceLabel();
  useEffect(() => { setStatus(''); setPage(1); }, [id]);
  const { data } = useQuery({
    queryKey: ['sms', 'campaign', id, status, page],
    queryFn: () => smsApi.campaign(id!, { page, limit: 20, status }),
    enabled: !!id,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.status === 'SENDING' ? 1500 : false),
  });
  const done = () => { void qc.invalidateQueries({ queryKey: ['sms'] }); };
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const retry = useMutation({ mutationFn: () => smsApi.retry(id!), onSuccess: (r) => { toast(t('sms.history.retried', { count: r.retried })); done(); }, onError: fail });
  const cancel = useMutation({ mutationFn: () => smsApi.cancel(id!), onSuccess: () => { toast(t('sms.history.cancelled')); done(); }, onError: fail });

  return (
    <Drawer open={!!id} onClose={onClose} title={data?.title ?? t('sms.history.details')} width={640}>
      {!data ? <Skeleton className="h-64" /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone[data.status]}>{t(`sms.campaignStatus.${data.status}`)}</Badge>
            <Badge>{t(`sms.categories.${data.category}`)}</Badge>
            <span className="text-sm text-text-muted">{label(data.audienceLabel)}</span>
          </div>
          <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-muted p-4 text-sm">{data.text}</p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['total', data.total], ['sent', data.sent + data.simulated], ['failed', data.failed], ['segments', data.segments]] as const).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-text-muted">{t(`sms.history.${k}`)}</dt><dd className={`text-xl tabular-nums ${k === 'failed' && v > 0 ? 'text-danger' : ''}`}>{v}</dd></div>
            ))}
          </dl>
          {data.simulated > 0 && <p className="text-sm text-warning">{t('sms.history.simulatedNote', { count: data.simulated })}</p>}
          {data.scheduledAt && data.status === 'SCHEDULED' && <p className="text-sm text-text-muted">{t('sms.history.scheduledFor', { when: fmtDate(data.scheduledAt, i18n.language) })}</p>}
          <div className="flex flex-wrap gap-2">
            {data.failed > 0 && data.status === 'DONE' && <Button variant="secondary" loading={retry.isPending} onClick={() => retry.mutate()}><RotateCcw className="h-4 w-4" /> {t('sms.history.retry')}</Button>}
            {data.status === 'SCHEDULED' && <Button variant="secondary" loading={cancel.isPending} onClick={() => window.confirm(t('sms.history.cancelConfirm')) && cancel.mutate()}><Ban className="h-4 w-4" /> {t('sms.history.cancel')}</Button>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg">{t('sms.history.messages')}</h3>
            <div className="w-44">
              <Select aria-label={t('attendance.statusCol')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">{t('students.allStatuses')}</option>
                {(['SENT', 'SIMULATED', 'FAILED', 'QUEUED'] as const).map((s) => <option key={s} value={s}>{t(`sms.messageStatus.${s}`)}</option>)}
              </Select>
            </div>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {data.messages.map((m) => (
              <li key={m.id} className="space-y-1 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>{m.name} <span className="text-text-muted">· {m.phone}</span></span>
                  <Badge tone={msgTone[m.status]}>{t(`sms.messageStatus.${m.status}`)}</Badge>
                </div>
                <p className="text-text-muted">{m.text}</p>
                {m.error && <p className="text-danger">{m.error}</p>}
              </li>
            ))}
            {data.messages.length === 0 && <li className="p-6 text-center text-text-muted">{t('common.empty')}</li>}
          </ul>
          <Pagination page={page} limit={20} total={data.messagesTotal} onChange={setPage} />
        </div>
      )}
    </Drawer>
  );
}

export function HistoryTab({ openId, onOpen }: { openId: string | null; onOpen: (id: string | null) => void }) {
  const { t, i18n } = useTranslation();
  const label = useAudienceLabel();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sms', 'campaigns', page],
    queryFn: () => smsApi.campaigns({ page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.items.some((c: Campaign) => c.status === 'SENDING' || c.status === 'SCHEDULED') ? 3000 : 20_000),
  });
  const rows = data?.items ?? [];

  return (
    <div>
      {isLoading ? <Skeleton className="h-64" /> : isError ? <EmptyState icon={MessageSquare} title={t('errors.INTERNAL_ERROR')} /> : rows.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('sms.history.empty')} text={t('sms.history.emptyHint')} />
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>{t('sms.history.title')}</Th>
                <Th>{t('sms.history.audience')}</Th>
                <Th>{t('attendance.date')}</Th>
                <Th numeric>{t('sms.history.total')}</Th>
                <Th numeric>{t('sms.history.failed')}</Th>
                <Th>{t('attendance.statusCol')}</Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((c) => (
                <Tr key={c.id} className="cursor-pointer" onClick={() => onOpen(c.id)}>
                  <Td className="max-w-64"><p className="truncate">{c.title}</p><p className="text-[13px] text-text-muted">{t(`sms.categories.${c.category}`)}{c.auto ? ` · ${t('sms.history.auto')}` : ''}</p></Td>
                  <Td className="text-text-muted">{label(c.audienceLabel)}</Td>
                  <Td className="whitespace-nowrap text-text-muted">{fmtDate(c.scheduledAt ?? c.createdAt, i18n.language)}</Td>
                  <Td numeric>{c.total}</Td>
                  <Td numeric className={c.failed ? 'text-danger' : 'text-text-muted'}>{c.failed || '—'}</Td>
                  <Td><Badge tone={tone[c.status]}>{t(`sms.campaignStatus.${c.status}`)}{c.status === 'SENDING' ? ` ${c.sent + c.simulated + c.failed}/${c.total}` : ''}</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <CampaignDrawer id={openId} onClose={() => onOpen(null)} />
    </div>
  );
}
