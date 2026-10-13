import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, FileSignature, GraduationCap, Pencil, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { schoolApi, type Group } from '@/lib/schoolApi';
import { cn } from '@/lib/cn';
import { Avatar, Badge, Button, Drawer, EmptyState, Skeleton } from '../ui';
import { CourseProgress, fillOf, fillTone, Ring, scheduleText, statusTone } from './parts';

interface Props {
  group: Group | null;
  branchName: string | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (g: Group) => void;
}

/** Quick look inside a group: who studies there, who teaches it, its schedule and how full it is. */
export function RosterDrawer({ group: g, branchName, canEdit, onClose, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const seesFinance = user?.role !== 'TEACHER';
  const list = useQuery({
    queryKey: ['students', 'roster', g?.id],
    queryFn: () => schoolApi.students({ groupId: g!.id, page: 1, limit: 100, sort: 'name' }),
    enabled: !!g,
  });
  const fill = g ? fillOf(g) : 'open';
  const items = (list.data?.items ?? []).filter((s) => s.status !== 'LEFT');

  return (
    <Drawer open={!!g} onClose={onClose} title={g ? `${g.name} · ${g.courseName}` : ''} width={560}>
      {g && (
        <div className="space-y-6">
          <div className="flex items-center gap-5 rounded-xl bg-surface-muted p-5">
            <Ring value={g.studentCount} total={g.capacity} fill={fill} size={96}>
              <span className="text-2xl tabular-nums">{g.studentCount}</span>
            </Ring>
            <div className="min-w-0 flex-1 space-y-2">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', statusTone[g.status].chip)}>{t(`groups.statuses.${g.status}`)}</span>
              <p className="tabular-nums"><span className="text-2xl">{g.studentCount}</span><span className="text-text-muted"> / {g.capacity}</span></p>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>
                {g.freeSeats > 0 ? t('groups.free', { count: g.freeSeats }) : t('groups.full')}
              </span>
              {branchName && <p className="text-sm text-text-muted">{branchName}</p>}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-surface-muted p-4 text-sm">
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-text-muted" /> {fmtDay(g.startDate, i18n.language, 'd MMMM yyyy')} – {fmtDay(g.endDate, i18n.language, 'd MMMM yyyy')}</p>
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-text-muted" /> {scheduleText(g, t)}{g.room ? ` · ${g.room}` : ''}</p>
            <CourseProgress group={g} />
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4">
            <Avatar name={g.teacherName ?? '?'} size={48} src={g.teacherPhotoUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-muted">{t('groups.teacher')}</p>
              <p className="truncate">{g.teacherName ?? t('groups.noTeacher')}</p>
              {g.teacherPhone && <a href={`tel:${g.teacherPhone}`} className="flex items-center gap-1.5 text-sm text-primary"><Phone className="h-3.5 w-3.5" /> {g.teacherPhone}</a>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/students?groupId=${g.id}`}><Button variant="secondary" className="px-4 py-2.5 text-sm"><GraduationCap className="h-4 w-4" /> {t('groups.openStudents')}</Button></Link>
            <Link to={`/finance/contracts/group/${g.id}`}><Button variant="secondary" className="px-4 py-2.5 text-sm"><FileSignature className="h-4 w-4" /> {t('nav.contracts')}</Button></Link>
            {canEdit && <Button variant="secondary" className="px-4 py-2.5 text-sm" onClick={() => onEdit(g)}><Pencil className="h-4 w-4" /> {t('groups.edit')}</Button>}
          </div>

          <div>
            <h3 className="mb-3 text-lg">{t('groups.students')} <span className="text-text-muted">({items.length})</span></h3>
            {list.isLoading ? <Skeleton className="h-48" /> : items.length === 0 ? (
              <EmptyState icon={GraduationCap} title={t('groups.emptyRoster')} />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {items.map((s, i) => (
                  <li key={s.id}>
                    <Link to={`/students/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted">
                      <span className="w-6 text-sm text-text-muted tabular-nums">{i + 1}</span>
                      <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{s.fullName}</p>
                        <p className="text-xs text-text-muted">{s.phone}</p>
                      </div>
                      {s.status === 'GRADUATED' && <Badge tone="info">{t('students.statuses.GRADUATED')}</Badge>}
                      {seesFinance && s.debt ? <span className="text-xs tabular-nums text-danger">−{formatMoney(s.debt, t('common.currency'))}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
