import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Copy, MessageSquareText, Search } from 'lucide-react';
import { brand } from '@/brand.config';
import { financeApi, type Debtor } from '@/lib/financeApi';
import { schoolApi } from '@/lib/schoolApi';
import { formatMoney } from '@/lib/format';
import { fmtDay } from '@/lib/dates';
import { useDebounce } from '@/lib/useDebounce';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton, Table, Td, Th, Thead, Tr } from '@/components/ui';
import { cn } from '@/lib/cn';

const LIMIT = 20;

function reminderText(d: Debtor, lang: 'uz' | 'ru') {
  const month = d.oldestPeriod ? fmtDay(`${d.oldestPeriod}-01`, lang, 'LLLL') : '';
  const sum = formatMoney(d.debt, '').trim();
  return lang === 'uz'
    ? `Hurmatli ${d.parentName}, ${d.studentName} uchun ${month} oyi toʻlovi muddati oʻtdi. Umumiy qarz: ${sum} soʻm. Iltimos, toʻlovni amalga oshiring. — ${brand.name}`
    : `Уважаемый(ая) ${d.parentName}, срок оплаты за ${month} для ${d.studentName} истёк. Общая задолженность: ${sum} сум. Пожалуйста, произведите оплату. — ${brand.name}`;
}

export default function Debtors() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Debtor | null>(null);
  const [lang, setLang] = useState<'uz' | 'ru'>(i18n.language === 'ru' ? 'ru' : 'uz');
  const [copied, setCopied] = useState(false);

  const list = useQuery({ queryKey: ['debtors', q, classId, page], queryFn: () => financeApi.debtors({ q, classId, page, limit: LIMIT }), placeholderData: keepPreviousData });
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });
  const cur = t('common.currency');
  const rows = list.data?.items ?? [];
  const text = target ? reminderText(target, lang) : '';

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader title={t('nav.debtors')} subtitle={t('finance.debtors.subtitle')} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card><p className="text-text-muted">{t('finance.debtors.totalDebt')}</p><p className="mt-1 text-3xl font-medium tabular-nums text-danger">{formatMoney(list.data?.summary.totalDebt ?? 0, cur)}</p></Card>
        <Card><p className="text-text-muted">{t('finance.debtors.count')}</p><p className="mt-1 text-3xl font-medium tabular-nums">{list.data?.summary.count ?? 0}</p></Card>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="min-w-64 flex-1"><Input aria-label={t('common.search')} placeholder={t('students.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="h-4 w-4" />} /></div>
        <div className="w-40">
          <Select aria-label={t('students.class')} value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
            <option value="">{t('students.allClasses')}</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <EmptyState icon={AlertCircle} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={AlertCircle} title={t('finance.debtors.empty')} />
      ) : (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>{t('finance.payments.student')}</Th>
                <Th>{t('students.class')}</Th>
                <Th>{t('students.parentPhone')}</Th>
                <Th numeric>{t('finance.debtors.debt')}</Th>
                <Th>{t('finance.debtors.overdue')}</Th>
                <Th>{t('finance.debtors.lastPayment')}</Th>
                <Th className="w-16"><span className="sr-only">{t('common.actions')}</span></Th>
              </tr>
            </Thead>
            <tbody>
              {rows.map((d) => (
                <Tr key={d.studentId}>
                  <Td><Link to={`/students/${d.studentId}`} className="font-medium hover:text-primary">{d.studentName}</Link><p className="text-[13px] text-text-muted">{d.parentName}</p></Td>
                  <Td>{d.className ?? '—'}</Td>
                  <Td>{d.parentPhone}</Td>
                  <Td numeric className="font-medium text-danger">{formatMoney(d.debt, cur)}</Td>
                  <Td><Badge tone={d.overdueDays > 30 ? 'danger' : 'warning'}>{t('dashboard.days', { count: d.overdueDays })}</Badge></Td>
                  <Td className="text-text-muted">{d.lastPaymentAt ? fmtDay(d.lastPaymentAt.slice(0, 10), i18n.language, 'd MMM yyyy') : '—'}</Td>
                  <Td>
                    <button aria-label={t('finance.debtors.reminder')} title={t('finance.debtors.reminder')} onClick={() => { setTarget(d); setCopied(false); }} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted">
                      <MessageSquareText className="h-5 w-5" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={setPage} />
        </>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title={t('finance.debtors.reminder')}>
        <div className="mb-3 flex gap-2">
          {(['uz', 'ru'] as const).map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={cn('rounded-full border px-4 py-1.5 text-sm font-medium', lang === l ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted')}>
              {l === 'uz' ? 'Oʻzbekcha' : 'Русский'}
            </button>
          ))}
        </div>
        <p className="whitespace-pre-wrap rounded-xl border border-border bg-surface-muted p-4 text-sm">{text}</p>
        <Button className="mt-4 w-full" onClick={copy}>{copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {t(copied ? 'finance.debtors.copied' : 'finance.debtors.copy')}</Button>
      </Modal>
    </div>
  );
}
