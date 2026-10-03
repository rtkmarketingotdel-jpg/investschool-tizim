import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileSignature, Plus, Search } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
import { useDebounce } from '@/lib/useDebounce';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { ContractDrawer } from '@/components/finance/ContractDrawer';
import { ContractTable } from '@/components/finance/ContractTable';
import { Button, Card, EmptyState, Input, Select, Skeleton, Tabs } from '@/components/ui';
import { KeyRound } from 'lucide-react';

const LIMIT = 20;

/** Active OTP codes (DEMO mode only): staff read them out to the parent. */
function DemoCodes() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ['contracts', 'demo-codes'],
    queryFn: () => financeApi.contracts({ status: 'SENT', page: 1, limit: 100 }),
    refetchInterval: 8_000,
  });
  const active = data?.items.filter((c) => c.demoCode) ?? [];
  if (active.length === 0) return null;
  return (
    <Card className="border-amber-400/50 bg-[#FEF3C7] p-4 text-[#B45309] dark:bg-amber-500/15 dark:text-amber-400">
      <p className="mb-2 flex items-center gap-2 text-sm"><KeyRound className="h-4 w-4" /> {t('finance.contracts.activeCodes')}</p>
      <ul className="space-y-1">
        {active.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline gap-x-3">
            <span>{c.number} · {c.studentName}</span>
            <span className="text-lg tracking-[0.3em]">{c.demoCode}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ClassesView() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({ queryKey: ['contracts', 'classes'], queryFn: financeApi.contractClasses, refetchInterval: 30_000 });
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>;
  if (isError || !data) return <EmptyState icon={FileSignature} title={t('errors.INTERNAL_ERROR')} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((c) => {
        const pct = c.studentCount ? Math.round((c.signed / c.studentCount) * 100) : 0;
        return (
          <Link key={c.id} to={`/finance/contracts/class/${c.id}`}>
            <Card className="h-full transition hover:bg-surface-muted/60">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-medium">{c.name}</h2>
                <span className="text-sm text-text-muted">{t('finance.contracts.students', { count: c.studentCount })}</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-text-muted">{t('finance.contracts.statuses.SIGNED')}</dt><dd className="text-right tabular-nums text-success">{c.signed}</dd>
                <dt className="text-text-muted">{t('finance.contracts.statuses.SENT')}</dt><dd className="text-right tabular-nums text-warning">{c.sent}</dd>
                <dt className="text-text-muted">{t('finance.contracts.statuses.DRAFT')}</dt><dd className="text-right tabular-nums">{c.draft}</dd>
                <dt className="text-text-muted">{t('finance.contracts.noContract')}</dt><dd className="text-right tabular-nums text-danger">{c.none}</dd>
              </dl>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function AllView({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ['contracts', q, status, page],
    queryFn: () => financeApi.contracts({ q, status, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = list.data?.items ?? [];
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="min-w-64 flex-1"><Input aria-label={t('common.search')} placeholder={t('finance.contracts.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="h-4 w-4" />} /></div>
        <div className="w-[calc(50%-0.375rem)] sm:w-44">
          <Select aria-label={t('attendance.statusCol')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('students.allStatuses')}</option>
            {(['DRAFT', 'SENT', 'SIGNED', 'CANCELLED'] as const).map((s) => <option key={s} value={s}>{t(`finance.contracts.statuses.${s}`)}</option>)}
          </Select>
        </div>
      </div>
      {list.isLoading ? <Skeleton className="h-96" /> : list.isError ? <EmptyState icon={FileSignature} title={t('errors.INTERNAL_ERROR')} /> : rows.length === 0 ? (
        <EmptyState icon={FileSignature} title={t('finance.contracts.empty')} action={<Button onClick={onCreate}><Plus className="h-5 w-5" /> {t('finance.contracts.create')}</Button>} />
      ) : (
        <>
          <ContractTable rows={rows} />
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default function Contracts() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'classes' | 'all'>('classes');
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.contracts')}
        subtitle={t('finance.contracts.subtitleClasses')}
        action={<Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" /> {t('finance.contracts.create')}</Button>}
      />
      <DemoCodes />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'classes', label: t('finance.contracts.tabs.classes') }, { id: 'all', label: t('finance.contracts.tabs.all') }]} />
      {tab === 'classes' ? <ClassesView /> : <AllView onCreate={() => setDrawer(true)} />}
      <ContractDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
