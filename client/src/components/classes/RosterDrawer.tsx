import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileSignature, GraduationCap, Pencil, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatMoney } from '@/lib/format';
import { schoolApi, type SchoolClass } from '@/lib/schoolApi';
import { Avatar, Badge, Button, Drawer, EmptyState, Skeleton } from '../ui';
import { fillOf, fillTone, levelOf, levelTone, Ring } from './parts';
import { cn } from '@/lib/cn';

interface Props {
  cls: SchoolClass | null;
  branchName: string | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (c: SchoolClass) => void;
}

/** Quick look inside a class: who studies there, who leads it and how full it is. */
export function RosterDrawer({ cls, branchName, canEdit, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const seesFinance = user?.role !== 'TEACHER';
  const list = useQuery({
    queryKey: ['students', 'roster', cls?.id],
    queryFn: () => schoolApi.students({ classId: cls!.id, page: 1, limit: 100, sort: 'name' }),
    enabled: !!cls,
  });
  const fill = cls ? fillOf(cls) : 'open';
  const items = (list.data?.items ?? []).filter((s) => s.status !== 'LEFT');

  return (
    <Drawer open={!!cls} onClose={onClose} title={cls ? `${cls.name} · ${t('classes.roster')}` : ''} width={560}>
      {cls && (
        <div className="space-y-6">
          <div className="flex items-center gap-5 rounded-2xl border border-border p-5">
            <Ring value={cls.studentCount} total={cls.capacity} fill={fill} size={96}>
              <span className="text-2xl tabular-nums">{cls.studentCount}</span>
            </Ring>
            <div className="min-w-0 flex-1 space-y-2">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', levelTone[levelOf(cls.grade)].chip)}>{t(`classes.levels.${levelOf(cls.grade)}`)}</span>
              <p className="tabular-nums"><span className="text-2xl">{cls.studentCount}</span><span className="text-text-muted"> / {cls.capacity}</span></p>
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>
                {cls.freeSeats > 0 ? t('classes.free', { count: cls.freeSeats }) : t('classes.full')}
              </span>
              {branchName && <p className="text-sm text-text-muted">{branchName}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4">
            <Avatar name={cls.teacherName ?? '?'} size={48} src={cls.teacherPhotoUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-muted">{t('classes.teacher')}</p>
              <p className="truncate">{cls.teacherName ?? t('classes.noTeacher')}</p>
              {cls.teacherPhone && <a href={`tel:${cls.teacherPhone}`} className="flex items-center gap-1.5 text-sm text-primary"><Phone className="h-3.5 w-3.5" /> {cls.teacherPhone}</a>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/students?classId=${cls.id}`}><Button variant="secondary" className="px-4 py-2.5 text-sm"><GraduationCap className="h-4 w-4" /> {t('classes.openStudents')}</Button></Link>
            <Link to={`/finance/contracts/class/${cls.id}`}><Button variant="secondary" className="px-4 py-2.5 text-sm"><FileSignature className="h-4 w-4" /> {t('nav.contracts')}</Button></Link>
            {canEdit && <Button variant="secondary" className="px-4 py-2.5 text-sm" onClick={() => onEdit(cls)}><Pencil className="h-4 w-4" /> {t('classes.edit')}</Button>}
          </div>

          <div>
            <h3 className="mb-3 text-lg">{t('classes.students')} <span className="text-text-muted">({items.length})</span></h3>
            {list.isLoading ? <Skeleton className="h-48" /> : items.length === 0 ? (
              <EmptyState icon={GraduationCap} title={t('classes.emptyRoster')} />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {items.map((s, i) => (
                  <li key={s.id}>
                    <Link to={`/students/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted">
                      <span className="w-6 text-sm text-text-muted tabular-nums">{i + 1}</span>
                      <Avatar name={`${s.firstName} ${s.lastName}`} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{s.fullName}</p>
                        <p className="text-xs text-text-muted">{s.parentPhone}</p>
                      </div>
                      {s.status === 'TRIAL' && <Badge tone="warning">{t('students.statuses.TRIAL')}</Badge>}
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
