import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileSignature, Plus, Search } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
import { useDebounce } from '@/lib/useDebounce';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { ContractDrawer } from '@/components/finance/ContractDrawer';
import { ContractTable } from '@/components/finance/ContractTable';
import { Button, EmptyState, Input, Select, Skeleton } from '@/components/ui';

const LIMIT = 20;

export default function Contracts() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);
  const list = useQuery({
    queryKey: ['contracts', q, status, page],
    queryFn: () => financeApi.contracts({ q, status, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const rows = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t('nav.contracts')}
        subtitle={t('finance.contracts.subtitle', { count: list.data?.total ?? 0 })}
        action={<Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" /> {t('finance.contracts.create')}</Button>}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="min-w-64 flex-1"><Input aria-label={t('common.search')} placeholder={t('finance.contracts.search')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="h-4 w-4" />} /></div>
        <div className="w-44">
          <Select aria-label={t('attendance.statusCol')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('students.allStatuses')}</option>
            {(['DRAFT', 'SENT', 'SIGNED', 'CANCELLED'] as const).map((s) => <option key={s} value={s}>{t(`finance.contracts.statuses.${s}`)}</option>)}
          </Select>
        </div>
      </div>
      {list.isLoading ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <EmptyState icon={FileSignature} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileSignature} title={t('finance.contracts.empty')} action={<Button onClick={() => setDrawer(true)}><Plus className="h-5 w-5" /> {t('finance.contracts.create')}</Button>} />
      ) : (
        <>
          <ContractTable rows={rows} />
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <ContractDrawer open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
