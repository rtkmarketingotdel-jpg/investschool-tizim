import { useTranslation } from 'react-i18next';
import { Building2, CalendarDays, ChevronRight, Clock, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDay } from '@/lib/dates';
import type { Group } from '@/lib/schoolApi';
import { Avatar } from '../ui';
import { CourseProgress, fillOf, fillTone, Ring, scheduleText, SplitBar, statusTone } from './parts';

interface Props {
  group: Group;
  branchName: string | null;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
}

export function GroupCard({ group: g, branchName, canEdit, onOpen, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const fill = fillOf(g);
  const tone = statusTone[g.status];
  return (
    <article className="group relative overflow-hidden rounded-xl bg-surface transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* soft wash in the status colour */}
      <div aria-hidden className={cn('pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-60 blur-2xl', tone.chip)} />
      <button type="button" onClick={onOpen} className="relative block w-full p-6 text-left focus-visible:rounded-xl" aria-label={`${g.name} · ${t('groups.roster')}`}>
        <div className="flex items-start gap-4 pr-8">
          <span className={cn('flex h-14 min-w-14 shrink-0 items-center justify-center rounded-2xl px-2 text-lg tracking-tight', tone.chip)}>{g.name}</span>
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight">{g.courseName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', tone.chip)}>{t(`groups.statuses.${g.status}`)}</span>
              {g.status !== 'FINISHED' && <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{t(`groups.fill.${fill}`)}</span>}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-1.5 text-sm text-text-muted">
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /> {fmtDay(g.startDate, i18n.language, 'd MMM')} – {fmtDay(g.endDate, i18n.language, 'd MMM yyyy')}</p>
          <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> {scheduleText(g, t)}{g.room ? ` · ${g.room}` : ''}</p>
          {branchName && <p className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0" /> {branchName}</p>}
        </div>
        <div className="mt-3"><CourseProgress group={g} /></div>

        <div className="mt-5 flex items-center gap-5">
          <Ring value={g.studentCount} total={g.capacity} fill={fill} size={72}>
            <span className="text-lg tabular-nums">{g.studentCount}</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="tabular-nums"><span className="text-2xl">{g.studentCount}</span><span className="text-text-muted"> / {g.capacity} {t('groups.studentsShort')}</span></p>
            <div className="space-y-1.5">
              <SplitBar men={g.men} women={g.women} />
              <p className="flex justify-between text-xs text-text-muted"><span>{t('groups.men', { count: g.men })}</span><span>{t('groups.women', { count: g.women })}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
          <Avatar name={g.teacherName ?? '?'} size={36} src={g.teacherPhotoUrl} className={g.teacherName ? '' : 'opacity-40'} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-muted">{t('groups.teacher')}</p>
            <p className="truncate text-sm" title={g.teacherName ?? undefined}>{g.teacherName ? g.teacherName.split(' ').slice(0, 2).join(' ') : t('groups.noTeacher')}</p>
          </div>
          <span className="flex items-center gap-1 text-sm text-text-muted transition group-hover:text-primary">
            {g.status === 'FINISHED' ? t('groups.graduatedShort', { count: g.graduated }) : g.freeSeats > 0 ? t('groups.freeShort', { count: g.freeSeats }) : t('groups.roster')}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
      {canEdit && (
        <button
          type="button"
          aria-label={t('groups.edit')}
          title={t('groups.edit')}
          onClick={onEdit}
          className="absolute right-4 top-4 z-10 rounded-xl border border-transparent p-2 text-text-muted opacity-0 transition hover:border-border hover:bg-surface hover:text-text focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}
