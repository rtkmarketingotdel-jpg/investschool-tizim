import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileSignature, Plus } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ContractActions, StatusCell } from '@/components/finance/ContractTable';
import { ContractDrawer } from '@/components/finance/ContractDrawer';
import { Avatar, Badge, Button, EmptyState, Skeleton, Table, Td, Th, Thead, Tr } from '@/components/ui';

export default function ContractClass() {
  const { classId = '' } = useParams();
  const { t } = useTranslation();
  const [target, setTarget] = useState<{ id: string; fullName: string } | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ['contracts', 'class', classId], queryFn: () => financeApi.contractClass(classId), refetchInterval: 30_000 });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !data) return <EmptyState icon={FileSignature} title={t('errors.NOT_FOUND')} action={<Link to="/finance/contracts" className="text-primary">{t('common.back')}</Link>} />;
  const cur = t('common.currency');
  const signed = data.items.filter((i) => i.contract?.status === 'SIGNED').length;

  return (
    <div>
      <Link to="/finance/contracts" className="mb-4 inline-flex items-center gap-2 text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> {t('nav.contracts')}</Link>
      <PageHeader title={data.class.name} subtitle={t('finance.contracts.classSubtitle', { signed, total: data.items.length })} />
      {data.items.length === 0 ? (
        <EmptyState icon={FileSignature} title={t('students.empty')} />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{t('finance.payments.student')}</Th>
              <Th>{t('students.parentName')}</Th>
              <Th numeric>{t('students.monthlyFee')}</Th>
              <Th>{t('finance.contracts.number')}</Th>
              <Th>{t('attendance.statusCol')}</Th>
              <Th>{t('finance.contracts.actions')}</Th>
            </tr>
          </Thead>
          <tbody>
            {data.items.map(({ student: s, contract: c }) => (
              <Tr key={s.id}>
                <Td><div className="flex items-center gap-3"><Avatar name={s.fullName} size={40} /><Link to={`/students/${s.id}`} className="hover:text-primary">{s.fullName}</Link></div></Td>
                <Td className="text-text-muted">{s.parentName}<p className="text-[13px]">{s.parentPhone}</p></Td>
                <Td numeric>{formatMoney(s.monthlyFee, cur)}</Td>
                <Td className="whitespace-nowrap">{c?.number ?? '—'}</Td>
                <Td>{c ? <StatusCell c={c} /> : <Badge>{t('finance.contracts.noContract')}</Badge>}</Td>
                <Td>
                  {c ? <ContractActions c={c} /> : (
                    <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={() => setTarget({ id: s.id, fullName: s.fullName })}><Plus className="h-4 w-4" /> {t('finance.contracts.create')}</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <ContractDrawer open={!!target} onClose={() => setTarget(null)} student={target} />
    </div>
  );
}
