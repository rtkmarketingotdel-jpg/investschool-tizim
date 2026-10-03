import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Printer, Wallet } from 'lucide-react';
import { financeApi, openPdf, PAYMENT_METHODS } from '@/lib/financeApi';
import { schoolApi } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { fmtDay, todayLocal } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { PaymentDrawer } from '@/components/finance/PaymentDrawer';
import { Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr } from '@/components/ui';

const LIMIT = 20;
type Preset = 'today' | 'week' | 'month' | 'custom';

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function Payments() {
  const { t, i18n } = useTranslation();
  const today = todayLocal();
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState({ from: shift(today, -29), to: today });
  const [method, setMethod] = useState('');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);

  const range = useMemo(() => {
    if (preset === 'today') return { from: today, to: today };
    if (preset === 'week') return { from: shift(today, -6), to: today };
    if (preset === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
    return custom;
  }, [preset, today, custom]);

  const list = useQuery({
    queryKey: ['payments', range, method, classId, page],
    queryFn: () => financeApi.payments({ ...range, method, classId, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });
  const cur = t('common.currency');
  const rows = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t('nav.payments')}
        subtitle={t('finance.payments.subtitle')}
        action={<Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" /> {t('finance.payments.receive')}</Button>}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <p className="text-text-muted">{t('finance.payments.total')}</p>
          <p className="mt-1 text-2xl font-medium tabular-nums">{formatMoney(list.data?.summary.total ?? 0, cur)}</p>
          <p className="mt-1 text-sm text-text-muted">{t('finance.payments.count', { count: list.data?.summary.count ?? 0 })}</p>
        </Card>
        <Card>
          <p className="mb-3 text-text-muted">{t('finance.payments.byMethod')}</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <span key={m} className="rounded-full bg-primary-soft px-4 py-2 text-sm">
                <span className="text-text-muted">{t(`finance.methods.${m}`)}: </span>
                <b className="tabular-nums">{formatMoney(list.data?.summary.byMethod[m] ?? 0, cur)}</b>
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex rounded-xl border border-border bg-surface-muted p-1" role="group" aria-label={t('finance.payments.period')}>
          {(['today', 'week', 'month', 'custom'] as Preset[]).map((p) => (
            <button
              key={p}
              aria-pressed={preset === p}
              onClick={() => { setPreset(p); setPage(1); }}
              className={cn('rounded-lg px-4 py-2 text-sm font-medium', preset === p ? 'bg-surface text-primary shadow' : 'text-text-muted')}
            >
              {t(`finance.payments.presets.${p}`)}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <div className="w-[calc(50%-0.375rem)] sm:w-40"><Input type="date" aria-label={t('attendance.from')} value={custom.from} onChange={(e) => { setCustom({ ...custom, from: e.target.value }); setPage(1); }} /></div>
            <div className="w-[calc(50%-0.375rem)] sm:w-40"><Input type="date" aria-label={t('attendance.to')} value={custom.to} onChange={(e) => { setCustom({ ...custom, to: e.target.value }); setPage(1); }} /></div>
          </>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <Select aria-label={t('finance.payments.method')} value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}>
            <option value="">{t('finance.payments.allMethods')}</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`finance.methods.${m}`)}</option>)}
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <Select aria-label={t('students.class')} value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
            <option value="">{t('students.allClasses')}</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <EmptyState icon={Wallet} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Wallet} title={t('finance.payments.empty')} action={<Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" /> {t('finance.payments.receive')}</Button>} />
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>{t('attendance.date')}</Th>
                <Th>{t('finance.payments.student')}</Th>
                <Th>{t('students.class')}</Th>
                <Th numeric>{t('finance.payments.amount')}</Th>
                <Th>{t('finance.payments.method')}</Th>
                <Th>{t('finance.payments.receivedBy')}</Th>
                <Th>{t('finance.payments.note')}</Th>
                <Th className="w-16"><span className="sr-only">{t('finance.payments.receipt')}</span></Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((p) => (
                <Tr key={p.id}>
                  <Td className="whitespace-nowrap">{fmtDay(p.paidAt.slice(0, 10), i18n.language, 'd MMM yyyy')}</Td>
                  <Td className="font-medium">{p.studentName}</Td>
                  <Td>{p.className ?? '—'}</Td>
                  <Td numeric className="font-medium">{formatMoney(p.amount, cur)}</Td>
                  <Td>{t(`finance.methods.${p.method}`)}</Td>
                  <Td className="text-text-muted">{p.receivedByName ?? '—'}</Td>
                  <Td className="max-w-48 truncate text-text-muted">{p.note ?? '—'}</Td>
                  <Td>
                    <button aria-label={t('finance.payments.receipt')} onClick={() => void openPdf(`/payments/${p.id}/receipt?lang=${i18n.language}`)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted">
                      <Printer className="h-4 w-4" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <PaymentDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
