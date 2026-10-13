import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Plus, Search, Users, UsersRound } from 'lucide-react';
import { useAuth, isManagement } from '@/context/AuthContext';
import { fmtDay } from '@/lib/dates';
import { schoolApi, type Group, type GroupStatus } from '@/lib/schoolApi';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/PageHeader';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupDrawer } from '@/components/groups/GroupDrawer';
import { RosterDrawer } from '@/components/groups/RosterDrawer';
import { fillOf, fillTone, Ring, scheduleText, STATUSES, statusTone } from '@/components/groups/parts';
import { Avatar, Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr } from '@/components/ui';

type Sort = 'start' | 'fill' | 'free';

function StatTile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Card className="flex items-center justify-between gap-3 rounded-xl p-4 sm:p-6">
      <div className="min-w-0">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-1 text-xl tabular-nums tracking-tight sm:text-2xl">{value}</p>
        {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
      </div>
      {children}
    </Card>
  );
}

export default function Groups() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const canEdit = isManagement(user?.role);
  const { data, isLoading, isError } = useQuery({ queryKey: ['groups'], queryFn: schoolApi.groups });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });
  const courses = useQuery({ queryKey: ['courses'], queryFn: schoolApi.courses });
  const branchName = useMemo(() => new Map((branches.data ?? []).map((b) => [b.id, b.name])), [branches.data]);

  const [params, setParams] = useSearchParams();
  const course = params.get('courseId') ?? '';
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<GroupStatus | 'all'>('all');
  const [branch, setBranch] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [sort, setSort] = useState<Sort>('start');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [editing, setEditing] = useState<{ open: boolean; group: Group | null }>({ open: false, group: null });
  const [roster, setRoster] = useState<Group | null>(null);
  const setCourse = (id: string) => setParams(id ? { courseId: id } : {}, { replace: true });

  const all = useMemo(() => data ?? [], [data]);
  // the figures describe groups that take or teach trainees now (finished groups would skew them)
  const totals = useMemo(() => {
    const open = all.filter((g) => g.status !== 'FINISHED');
    const students = open.reduce((n, g) => n + g.studentCount, 0);
    const capacity = open.reduce((n, g) => n + g.capacity, 0);
    return {
      active: all.filter((g) => g.status === 'ACTIVE').length, planned: all.filter((g) => g.status === 'PLANNED').length,
      students, capacity, free: open.reduce((n, g) => n + g.freeSeats, 0), pct: capacity ? Math.round((students / capacity) * 100) : 0,
    };
  }, [all]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all
      .filter((g) => (status === 'all' || g.status === status) && (!course || g.courseId === course) && (!branch || g.branchId === branch) && (!onlyFree || (g.freeSeats > 0 && g.status !== 'FINISHED')))
      .filter((g) => !term || [g.name, g.courseName, g.teacherName ?? ''].some((v) => v.toLowerCase().includes(term)))
      .sort((a, b) =>
        sort === 'fill' ? b.studentCount / b.capacity - a.studentCount / a.capacity
        : sort === 'free' ? b.freeSeats - a.freeSeats
        : a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
  }, [all, q, status, course, branch, onlyFree, sort]);

  const sections = useMemo(
    () => STATUSES.map((s) => ({ status: s, items: shown.filter((g) => g.status === s) })).filter((x) => x.items.length),
    [shown],
  );
  const bn = (g: Group) => (g.branchId && branchName.size > 1 ? (branchName.get(g.branchId) ?? null) : null);
  const openEdit = (g: Group | null) => setEditing({ open: true, group: g });
  const reset = () => { setQ(''); setStatus('all'); setCourse(''); setBranch(''); setOnlyFree(false); };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('nav.groups')}
        subtitle={t('groups.subtitle', { count: all.length })}
        action={canEdit && <Button onClick={() => openEdit(null)} className="shadow-lg shadow-primary/25"><Plus className="h-5 w-5" /> {t('groups.add')}</Button>}
      />

      {!isLoading && !isError && all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile label={t('groups.stats.active')} value={String(totals.active)} sub={t('groups.stats.planned', { count: totals.planned })} />
          <StatTile label={t('groups.stats.students')} value={String(totals.students)} sub={t('groups.stats.ofCapacity', { capacity: totals.capacity })} />
          <StatTile label={t('groups.stats.fill')} value={`${totals.pct}%`}>
            <Ring value={totals.students} total={totals.capacity} size={52} fill={totals.pct >= 100 ? 'full' : totals.pct >= 90 ? 'almost' : 'open'}><Users className="h-4 w-4 text-text-muted" /></Ring>
          </StatTile>
          <StatTile label={t('groups.stats.free')} value={String(totals.free)} sub={t('groups.stats.freeHint')} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm">
          <Input aria-label={t('common.search')} placeholder={t('groups.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex flex-wrap rounded-2xl border border-border bg-surface-muted p-1" role="group" aria-label={t('groups.status')}>
          {(['all', ...STATUSES] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={cn('rounded-xl px-4 py-2 text-sm transition', status === s ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}>
              {s === 'all' ? t('groups.allStatuses') : t(`groups.statusesPlural.${s}`)}
            </button>
          ))}
        </div>
        <div className="w-[calc(50%-0.375rem)] sm:w-52">
          <Select aria-label={t('groups.course')} value={course} onChange={(e) => setCourse(e.target.value)}>
            <option value="">{t('students.allCourses')}</option>
            {courses.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        {branchName.size > 1 && (
          <div className="w-[calc(50%-0.375rem)] sm:w-48"><Select aria-label={t('staff.branch')} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">{t('attendance.day.allBranches')}</option>{[...branchName].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></div>
        )}
        <div className="w-[calc(50%-0.375rem)] sm:w-44"><Select aria-label={t('students.sort')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="start">{t('groups.sort.start')}</option><option value="fill">{t('groups.sort.fill')}</option><option value="free">{t('groups.sort.free')}</option></Select></div>
        <button type="button" aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)} className={cn('rounded-2xl border px-4 py-3 text-sm transition', onlyFree ? 'border-success/40 bg-success/10 text-success' : 'border-border text-text-muted hover:bg-surface-muted')}>
          {t('groups.onlyFree')}
        </button>
        <div className="ml-auto hidden rounded-2xl border border-border bg-surface-muted p-1 md:flex">
          {([['cards', LayoutGrid], ['table', List]] as const).map(([v, Icon]) => (
            <button key={v} type="button" aria-label={t(`students.view.${v}`)} aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded-xl p-2 transition', view === v ? 'bg-surface text-primary shadow-sm' : 'text-text-muted')}><Icon className="h-5 w-5" /></button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
      ) : isError ? (
        <EmptyState icon={UsersRound} title={t('errors.INTERNAL_ERROR')} />
      ) : all.length === 0 ? (
        <EmptyState icon={UsersRound} title={t('groups.empty')} action={canEdit && <Button onClick={() => openEdit(null)}><Plus className="h-5 w-5" /> {t('groups.add')}</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title={t('groups.noMatch')} action={<Button variant="secondary" onClick={reset}>{t('attendance.reset')}</Button>} />
      ) : (
        sections.map((sec) => (
          <section key={sec.status} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl">{t(`groups.statusesPlural.${sec.status}`)}</h2>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs', statusTone[sec.status].chip)}>
                {t('groups.sectionCount', { groups: sec.items.length, students: sec.items.reduce((n, g) => n + g.studentCount, 0) })}
              </span>
            </div>
            {view === 'cards' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {sec.items.map((g) => <GroupCard key={g.id} group={g} branchName={bn(g)} canEdit={canEdit} onOpen={() => setRoster(g)} onEdit={() => openEdit(g)} />)}
              </div>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>{t('groups.name')}</Th>
                    <Th>{t('groups.course')}</Th>
                    <Th>{t('groups.period')}</Th>
                    <Th>{t('groups.teacher')}</Th>
                    <Th numeric>{t('groups.students')}</Th>
                    <Th>{t('attendance.statusCol')}</Th>
                  </tr>
                </Thead>
                <tbody>
                  {sec.items.map((g) => {
                    const fill = fillOf(g);
                    return (
                      <Tr key={g.id} className="cursor-pointer" onClick={() => setRoster(g)}>
                        <Td><span className={cn('inline-flex min-w-14 justify-center rounded-xl px-3 py-1.5', statusTone[g.status].chip)}>{g.name}</span>{bn(g) && <span className="ml-3 text-xs text-text-muted">{bn(g)}</span>}</Td>
                        <Td>{g.courseName}<p className="text-[13px] text-text-muted">{scheduleText(g, t)}</p></Td>
                        <Td className="whitespace-nowrap text-sm text-text-muted">{fmtDay(g.startDate, i18n.language, 'dd.MM.yy')} – {fmtDay(g.endDate, i18n.language, 'dd.MM.yy')}</Td>
                        <Td><div className="flex items-center gap-3"><Avatar name={g.teacherName ?? '?'} size={32} src={g.teacherPhotoUrl} className={g.teacherName ? '' : 'opacity-40'} /><span className="text-sm">{g.teacherName ?? t('groups.noTeacher')}</span></div></Td>
                        <Td numeric>{g.studentCount} <span className="text-text-muted">/ {g.capacity}</span></Td>
                        <Td>
                          {g.status === 'FINISHED'
                            ? <span className="text-sm text-text-muted">{t('groups.graduatedShort', { count: g.graduated })}</span>
                            : <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{g.freeSeats > 0 ? t('groups.free', { count: g.freeSeats }) : t('groups.full')}</span>}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </section>
        ))
      )}

      <RosterDrawer group={roster} branchName={roster ? bn(roster) : null} canEdit={canEdit} onClose={() => setRoster(null)} onEdit={(g) => { setRoster(null); openEdit(g); }} />
      <GroupDrawer open={editing.open} group={editing.group} onClose={() => setEditing((e) => ({ ...e, open: false }))} />
    </div>
  );
}
