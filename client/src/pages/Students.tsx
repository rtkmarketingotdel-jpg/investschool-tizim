import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BedDouble, Download, Eye, LayoutGrid, List, Plus, Search, GraduationCap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schoolApi, type Student, type StudentStatus } from '@/lib/schoolApi';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { downloadBlob } from '@/lib/download';
import { useDebounce } from '@/lib/useDebounce';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr, type BadgeTone } from '@/components/ui';

export const statusTone: Record<StudentStatus, BadgeTone> = { ACTIVE: 'success', TRIAL: 'warning', LEFT: 'danger' };
const LIMIT = 20;

export default function Students() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const seesFinance = user?.role === 'DIRECTOR' || user?.role === 'ACCOUNTANT';
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search);
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [drawer, setDrawer] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });

  const status = params.get('status') ?? '';
  const classId = params.get('classId') ?? '';
  const boarding = params.get('boarding') ?? '';
  const debtor = seesFinance ? (params.get('debtor') ?? '') : '';
  const sort = params.get('sort') ?? 'name';
  const page = Number(params.get('page') ?? 1);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  useEffect(() => {
    if (q !== (params.get('q') ?? '')) setParam('q', q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filters = { q: params.get('q') ?? '', status, classId, boarding, debtor, sort };
  const list = useQuery({
    queryKey: ['students', filters, page],
    queryFn: () => schoolApi.students({ ...filters, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const classes = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });

  const exportCsv = async () => downloadBlob(await schoolApi.exportStudents({ q: filters.q, status, classId, boarding, sort: sort === 'debt' ? 'name' : sort }), 'students.csv');
  const rows = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={t('nav.studentsList')}
        subtitle={t('students.subtitle', { count: list.data?.total ?? 0 })}
        action={
          canEdit && (
            <Button onClick={() => setDrawer({ open: true, student: null })}>
              <Plus className="h-5 w-5" /> {t('students.add')}
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Input
            aria-label={t('common.search')}
            placeholder={t('students.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-48">
          <Select aria-label={t('students.status')} value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">{t('students.allStatuses')}</option>
            {(['ACTIVE', 'TRIAL', 'LEFT'] as const).map((s) => (
              <option key={s} value={s}>{t(`students.statuses.${s}`)}</option>
            ))}
          </Select>
        </div>
        <div className="w-36">
          <Select aria-label={t('students.class')} value={classId} onChange={(e) => setParam('classId', e.target.value)}>
            <option value="">{t('students.allClasses')}</option>
            {classes.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select aria-label={t('students.boarding')} value={boarding} onChange={(e) => setParam('boarding', e.target.value)}>
            <option value="">{t('students.boardingAny')}</option>
            <option value="true">{t('students.boardingYes')}</option>
            <option value="false">{t('students.boardingNo')}</option>
          </Select>
        </div>
        {seesFinance && (
          <div className="w-48">
            <Select aria-label={t('students.debtorsFilter')} value={debtor} onChange={(e) => setParam('debtor', e.target.value)}>
              <option value="">{t('students.debtAny')}</option>
              <option value="true">{t('students.debtOnly')}</option>
            </Select>
          </div>
        )}
        <div className="w-40">
          <Select aria-label={t('students.sort')} value={sort} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="name">{t('students.sortName')}</option>
            <option value="date">{t('students.sortDate')}</option>
            {seesFinance && <option value="debt">{t('students.sortDebt')}</option>}
          </Select>
        </div>
        <Button variant="secondary" onClick={exportCsv} aria-label={t('students.export')} className="py-3">
          <Download className="h-5 w-5" /> <span className="hidden xl:inline">{t('students.export')}</span>
        </Button>
        <div className="hidden rounded-xl border border-border bg-surface-muted p-1 md:flex">
          {([['table', List], ['cards', LayoutGrid]] as const).map(([v, Icon]) => (
            <button
              key={v}
              aria-label={t(`students.view.${v}`)}
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn('rounded-lg p-2', view === v ? 'bg-surface text-primary shadow' : 'text-text-muted')}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : list.isError ? (
        <EmptyState icon={GraduationCap} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={t('students.empty')}
          action={canEdit && <Button onClick={() => setDrawer({ open: true, student: null })}><Plus className="h-5 w-5" /> {t('students.add')}</Button>}
        />
      ) : (
        <>
          <div className={cn(view === 'cards' ? 'hidden' : 'hidden md:block')}>
            <Table>
              <Thead>
                <tr>
                  <Th className="w-16">№</Th>
                  <Th>{t('students.fullName')}</Th>
                  <Th>{t('students.class')}</Th>
                  <Th>{t('students.status')}</Th>
                  <Th>{t('students.boarding')}</Th>
                  <Th numeric>{t('students.monthlyFee')}</Th>
                  {seesFinance && <Th numeric>{t('students.debt')}</Th>}
                  <Th>{t('students.enrolledAt')}</Th>
                  <Th className="w-16"><span className="sr-only">{t('common.details')}</span></Th>
                </tr>
              </Thead>
              <tbody>
                {rows.map((s, i) => (
                  <Tr key={s.id} className="h-[110px]">
                    <Td className="text-text-muted">{(page - 1) * LIMIT + i + 1}</Td>
                    <Td>
                      <Link to={`/students/${s.id}`} className="flex items-center gap-4">
                        <Avatar name={`${s.firstName} ${s.lastName}`} />
                        <div>
                          <p className="font-medium">{s.fullName}</p>
                          <p className="text-[13px] text-text-muted">{s.parentPhone}</p>
                        </div>
                      </Link>
                    </Td>
                    <Td>{s.className ?? '—'}</Td>
                    <Td><Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge></Td>
                    <Td>{s.isBoarding ? <BedDouble aria-label={t('students.boarding')} className="h-5 w-5 text-primary" /> : <span className="text-text-muted">—</span>}</Td>
                    <Td numeric>
                      {formatMoney(s.monthlyFee, t('common.currency'))}
                      {s.discountPercent > 0 && <p className="text-[13px] text-text-muted">−{s.discountPercent}%</p>}
                    </Td>
                    {seesFinance && (
                      <Td numeric className={s.debt ? 'font-medium text-red-600' : 'text-text-muted'}>{s.debt ? formatMoney(s.debt, t('common.currency')) : '—'}</Td>
                    )}
                    <Td className="whitespace-nowrap text-text-muted">{fmtDay(s.enrolledAt, i18n.language, 'd MMM yyyy')}</Td>
                    <Td>
                      <Link to={`/students/${s.id}`} aria-label={t('common.details')} className="inline-flex rounded-lg p-2 text-text-muted hover:bg-surface-muted">
                        <Eye className="h-5 w-5" />
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', view === 'cards' ? '' : 'md:hidden')}>
            {rows.map((s) => (
              <Link key={s.id} to={`/students/${s.id}`}>
                <Card className="h-full transition hover:bg-surface-muted/60">
                  <div className="flex items-center gap-4">
                    <Avatar name={`${s.firstName} ${s.lastName}`} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.fullName}</p>
                      <p className="text-[13px] text-text-muted">{s.parentPhone}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge>
                    {s.className && <span className="text-sm text-text-muted">{s.className}</span>}
                    {s.isBoarding && <BedDouble className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-3 font-medium tabular-nums">{formatMoney(s.monthlyFee, t('common.currency'))}</p>
                  {s.debt ? <p className="text-sm font-medium text-red-600">{t('students.debt')}: {formatMoney(s.debt, t('common.currency'))}</p> : null}
                </Card>
              </Link>
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      <StudentDrawer open={drawer.open} student={drawer.student} onClose={() => setDrawer({ open: false, student: null })} />
    </div>
  );
}
