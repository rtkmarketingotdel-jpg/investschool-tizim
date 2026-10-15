import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Eye, Trash2, LayoutGrid, List, Plus, Search, GraduationCap } from 'lucide-react';
import { useAuth, isManagement } from '@/context/AuthContext';
import { schoolApi, type Student, type StudentStatus } from '@/lib/schoolApi';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { downloadBlob } from '@/lib/download';
import { useDebounce } from '@/lib/useDebounce';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { StudentDrawer } from '@/components/students/StudentDrawer';
import { DeleteStudentDialog } from '@/components/students/DeleteStudentDialog';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr, type BadgeTone } from '@/components/ui';

export const statusTone: Record<StudentStatus, BadgeTone> = { ACTIVE: 'success', GRADUATED: 'info', LEFT: 'danger' };
const LIMIT = 20;

export default function Students() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = isManagement(user?.role);
  const seesFinance = user?.role !== 'TEACHER';
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounce(search);
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [drawer, setDrawer] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });
  const [deleting, setDeleting] = useState<Student | null>(null);

  const status = params.get('status') ?? '';
  const groupId = params.get('groupId') ?? '';
  const courseId = params.get('courseId') ?? '';
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

  const filters = { q: params.get('q') ?? '', status, groupId, courseId, debtor, sort };
  const list = useQuery({
    queryKey: ['students', filters, page],
    queryFn: () => schoolApi.students({ ...filters, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const groups = useQuery({ queryKey: ['groups'], queryFn: schoolApi.groups });
  const courses = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses });
  // the group list follows the chosen course
  const groupOptions = (groups.data ?? []).filter((g) => !courseId || g.courseId === courseId);

  const exportCsv = async () => downloadBlob(await schoolApi.exportStudents({ q: filters.q, status, groupId, courseId, sort: sort === 'debt' ? 'name' : sort }), 'students.csv');
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
        <div className="w-[calc(50%-0.375rem)] sm:w-48">
          <Select aria-label={t('students.status')} value={status} onChange={(e) => setParam('status', e.target.value)}>
            <option value="">{t('students.allStatuses')}</option>
            {(['ACTIVE', 'GRADUATED', 'LEFT'] as const).map((s) => (
              <option key={s} value={s}>{t(`students.statuses.${s}`)}</option>
            ))}
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-48">
          <Select
            aria-label={t('students.course')}
            value={courseId}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('courseId', e.target.value);
              else next.delete('courseId');
              next.delete('groupId');
              next.delete('page');
              setParams(next, { replace: true });
            }}
          >
            <option value="">{t('students.allCourses')}</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-36">
          <Select aria-label={t('students.group')} value={groupId} onChange={(e) => setParam('groupId', e.target.value)}>
            <option value="">{t('students.allGroups')}</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </div>
        {seesFinance && (
          <div className="w-[calc(50%-0.375rem)] sm:w-48">
            <Select aria-label={t('students.debtorsFilter')} value={debtor} onChange={(e) => setParam('debtor', e.target.value)}>
              <option value="">{t('students.debtAny')}</option>
              <option value="true">{t('students.debtOnly')}</option>
            </Select>
          </div>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
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
                  <Th>{t('students.group')}</Th>
                  <Th>{t('students.status')}</Th>
                  <Th numeric>{t('students.coursePrice')}</Th>
                  {seesFinance && <Th numeric>{t('students.debt')}</Th>}
                  <Th>{t('students.enrolledAt')}</Th>
                  <Th className="w-24"><span className="sr-only">{t('common.details')}</span></Th>
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
                          <p className="text-[13px] text-text-muted">{s.phone}</p>
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <p>{s.groupName ?? '—'}</p>
                      {s.courseName && <p className="text-[13px] text-text-muted">{s.courseName}</p>}
                    </Td>
                    <Td><Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge></Td>
                    <Td numeric>
                      {formatMoney(s.coursePrice, t('common.currency'))}
                      {s.discountPercent > 0 && <p className="text-[13px] text-text-muted">−{s.discountPercent}%</p>}
                    </Td>
                    {seesFinance && (
                      <Td numeric className={s.debt ? 'font-medium text-danger' : 'text-text-muted'}>{s.debt ? formatMoney(s.debt, t('common.currency')) : '—'}</Td>
                    )}
                    <Td className="whitespace-nowrap text-text-muted">{fmtDay(s.enrolledAt, i18n.language, 'd MMM yyyy')}</Td>
                    <Td>
                      <div className="flex">
                        <Link to={`/students/${s.id}`} aria-label={t('common.details')} className="inline-flex rounded-lg p-2 text-text-muted hover:bg-surface-muted">
                          <Eye className="h-5 w-5" />
                        </Link>
                        {canEdit && (
                          <button type="button" aria-label={t('students.delete')} title={t('students.delete')} onClick={() => setDeleting(s)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-danger">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
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
                      <p className="text-[13px] text-text-muted">{s.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone[s.status]}>{t(`students.statuses.${s.status}`)}</Badge>
                    {s.groupName && <span className="text-sm text-text-muted">{s.groupName} · {s.courseName}</span>}
                  </div>
                  <p className="mt-3 font-medium tabular-nums">{formatMoney(s.coursePrice, t('common.currency'))}</p>
                  {s.debt ? <p className="text-sm font-medium text-danger">{t('students.debt')}: {formatMoney(s.debt, t('common.currency'))}</p> : null}
                </Card>
              </Link>
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={list.data?.total ?? 0} onChange={(p) => setParam('page', String(p))} />
        </>
      )}

      <DeleteStudentDialog student={deleting} onClose={() => setDeleting(null)} />
      <StudentDrawer open={drawer.open} student={drawer.student} onClose={() => setDrawer({ open: false, student: null })} />
    </div>
  );
}
