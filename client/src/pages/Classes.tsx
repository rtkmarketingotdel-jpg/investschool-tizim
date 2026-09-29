import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, Plus, School, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schoolApi, type SchoolClass } from '@/lib/schoolApi';
import { cn } from '@/lib/cn';
import { PageHeader } from '@/components/PageHeader';
import { ClassCard } from '@/components/classes/ClassCard';
import { RosterDrawer } from '@/components/classes/RosterDrawer';
import { fillOf, fillTone, LEVELS, levelOf, levelTone, Ring, type Level } from '@/components/classes/parts';
import { ClassDrawer } from '@/components/students/ClassDrawer';
import { Avatar, Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr } from '@/components/ui';

type Sort = 'grade' | 'fill' | 'free';

function StatTile({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Card className="flex items-center justify-between gap-3 rounded-3xl p-4 sm:p-6">
      <div className="min-w-0">
        <p className="text-sm text-text-muted">{label}</p>
        <p className="mt-1 text-2xl tabular-nums tracking-tight sm:text-3xl">{value}</p>
        {sub && <p className="mt-1 text-sm text-text-muted">{sub}</p>}
      </div>
      {children}
    </Card>
  );
}

export default function Classes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const { data, isLoading, isError } = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });
  const branchName = useMemo(() => new Map((branches.data ?? []).map((b) => [b.id, b.name])), [branches.data]);

  const [q, setQ] = useState('');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [branch, setBranch] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [sort, setSort] = useState<Sort>('grade');
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [editing, setEditing] = useState<{ open: boolean; cls: SchoolClass | null }>({ open: false, cls: null });
  const [roster, setRoster] = useState<SchoolClass | null>(null);

  const all = useMemo(() => data ?? [], [data]);
  const totals = useMemo(() => {
    const students = all.reduce((n, c) => n + c.studentCount, 0);
    const capacity = all.reduce((n, c) => n + c.capacity, 0);
    return { students, capacity, free: all.reduce((n, c) => n + c.freeSeats, 0), pct: capacity ? Math.round((students / capacity) * 100) : 0 };
  }, [all]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all
      .filter((c) => (level === 'all' || levelOf(c.grade) === level) && (!branch || c.branchId === branch) && (!onlyFree || c.freeSeats > 0))
      .filter((c) => !term || c.name.toLowerCase().includes(term) || (c.teacherName ?? '').toLowerCase().includes(term))
      .sort((a, b) =>
        sort === 'fill' ? b.studentCount / b.capacity - a.studentCount / a.capacity
        : sort === 'free' ? b.freeSeats - a.freeSeats
        : a.grade - b.grade || a.name.localeCompare(b.name));
  }, [all, q, level, branch, onlyFree, sort]);

  const groups = useMemo(
    () => (sort === 'grade' ? LEVELS.map((l) => ({ level: l as Level | null, items: shown.filter((c) => levelOf(c.grade) === l) })).filter((g) => g.items.length) : [{ level: null, items: shown }]),
    [shown, sort],
  );
  const bn = (c: SchoolClass) => (c.branchId && branchName.size > 1 ? (branchName.get(c.branchId) ?? null) : null);
  const openEdit = (c: SchoolClass | null) => setEditing({ open: true, cls: c });

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('nav.classes')}
        subtitle={t('classes.subtitleNew', { count: all.length })}
        action={canEdit && <Button onClick={() => openEdit(null)} className="shadow-lg shadow-primary/25"><Plus className="h-5 w-5" /> {t('classes.add')}</Button>}
      />

      {!isLoading && !isError && all.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile label={t('classes.stats.classes')} value={String(all.length)} sub={t('classes.stats.avg', { n: Math.round(totals.students / all.length) })} />
          <StatTile label={t('classes.stats.students')} value={String(totals.students)} sub={t('classes.stats.ofCapacity', { capacity: totals.capacity })} />
          <StatTile label={t('classes.stats.fill')} value={`${totals.pct}%`}>
            <Ring value={totals.students} total={totals.capacity} size={52} fill={totals.pct >= 100 ? 'full' : totals.pct >= 90 ? 'almost' : 'open'}><Users className="h-4 w-4 text-text-muted" /></Ring>
          </StatTile>
          <StatTile label={t('classes.stats.free')} value={String(totals.free)} sub={t('classes.stats.freeClasses', { count: all.filter((c) => c.freeSeats > 0).length })} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1 sm:max-w-sm">
          <Input aria-label={t('common.search')} placeholder={t('classes.search')} value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex flex-wrap rounded-2xl border border-border bg-surface-muted p-1" role="group" aria-label={t('classes.level')}>
          {(['all', ...LEVELS] as const).map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={cn('rounded-xl px-4 py-2 text-sm transition', level === l ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}>
              {t(`classes.levels.${l}`)}
            </button>
          ))}
        </div>
        {branchName.size > 1 && (
          <div className="w-48"><Select aria-label={t('staff.branch')} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">{t('attendance.day.allBranches')}</option>{[...branchName].map(([id, name]) => <option key={id} value={id}>{name}</option>)}</Select></div>
        )}
        <div className="w-44"><Select aria-label={t('students.sort')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="grade">{t('classes.sort.grade')}</option><option value="fill">{t('classes.sort.fill')}</option><option value="free">{t('classes.sort.free')}</option></Select></div>
        <button type="button" aria-pressed={onlyFree} onClick={() => setOnlyFree((v) => !v)} className={cn('rounded-2xl border px-4 py-3 text-sm transition', onlyFree ? 'border-success/40 bg-success/10 text-success' : 'border-border text-text-muted hover:bg-surface-muted')}>
          {t('classes.onlyFree')}
        </button>
        <div className="ml-auto hidden rounded-2xl border border-border bg-surface-muted p-1 md:flex">
          {([['cards', LayoutGrid], ['table', List]] as const).map(([v, Icon]) => (
            <button key={v} type="button" aria-label={t(`students.view.${v}`)} aria-pressed={view === v} onClick={() => setView(v)} className={cn('rounded-xl p-2 transition', view === v ? 'bg-surface text-primary shadow-sm' : 'text-text-muted')}><Icon className="h-5 w-5" /></button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>
      ) : isError ? (
        <EmptyState icon={School} title={t('errors.INTERNAL_ERROR')} />
      ) : all.length === 0 ? (
        <EmptyState icon={School} title={t('classes.empty')} action={canEdit && <Button onClick={() => openEdit(null)}><Plus className="h-5 w-5" /> {t('classes.add')}</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title={t('classes.noMatch')} action={<Button variant="secondary" onClick={() => { setQ(''); setLevel('all'); setBranch(''); setOnlyFree(false); }}>{t('attendance.reset')}</Button>} />
      ) : (
        groups.map((g) => (
          <section key={g.level ?? 'all'} className="space-y-4">
            {g.level && (
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl">{t(`classes.levels.${g.level}`)}</h2>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs', levelTone[g.level].chip)}>{t('classes.groupCount', { classes: g.items.length, students: g.items.reduce((n, c) => n + c.studentCount, 0) })}</span>
              </div>
            )}
            {view === 'cards' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((c) => <ClassCard key={c.id} cls={c} branchName={bn(c)} canEdit={canEdit} onOpen={() => setRoster(c)} onEdit={() => openEdit(c)} />)}
              </div>
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>{t('classes.name')}</Th>
                    <Th>{t('classes.teacher')}</Th>
                    <Th numeric>{t('classes.students')}</Th>
                    <Th className="w-56">{t('classes.stats.fill')}</Th>
                    <Th>{t('attendance.statusCol')}</Th>
                  </tr>
                </Thead>
                <tbody>
                  {g.items.map((c) => {
                    const fill = fillOf(c);
                    const pct = Math.round((c.studentCount / c.capacity) * 100);
                    return (
                      <Tr key={c.id} className="cursor-pointer" onClick={() => setRoster(c)}>
                        <Td><span className={cn('inline-flex min-w-14 justify-center rounded-xl px-3 py-1.5 text-lg', levelTone[levelOf(c.grade)].chip)}>{c.name}</span>{bn(c) && <span className="ml-3 text-xs text-text-muted">{bn(c)}</span>}</Td>
                        <Td><div className="flex items-center gap-3"><Avatar name={c.teacherName ?? '?'} size={32} src={c.teacherPhotoUrl} className={c.teacherName ? '' : 'opacity-40'} /><span className="text-sm">{c.teacherName ?? t('classes.noTeacher')}</span></div></Td>
                        <Td numeric>{c.studentCount} <span className="text-text-muted">/ {c.capacity}</span></Td>
                        <Td><div className="h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className={cn('h-full rounded-full', fill === 'full' ? 'bg-danger' : fill === 'almost' ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} /></div></Td>
                        <Td><span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{c.freeSeats > 0 ? t('classes.free', { count: c.freeSeats }) : t('classes.full')}</span></Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </section>
        ))
      )}

      <RosterDrawer cls={roster} branchName={roster ? bn(roster) : null} canEdit={canEdit} onClose={() => setRoster(null)} onEdit={(c) => { setRoster(null); openEdit(c); }} />
      <ClassDrawer open={editing.open} cls={editing.cls} onClose={() => setEditing((e) => ({ ...e, open: false }))} />
    </div>
  );
}
