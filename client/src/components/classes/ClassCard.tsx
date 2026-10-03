import { useTranslation } from 'react-i18next';
import { Building2, ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { SchoolClass } from '@/lib/schoolApi';
import { Avatar } from '../ui';
import { fillOf, fillTone, levelOf, levelTone, Ring, SplitBar } from './parts';

interface Props {
  cls: SchoolClass;
  branchName: string | null;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
}

export function ClassCard({ cls: c, branchName, canEdit, onOpen, onEdit }: Props) {
  const { t } = useTranslation();
  const fill = fillOf(c);
  const tone = levelTone[levelOf(c.grade)];
  return (
    <article
      className="group relative overflow-hidden rounded-xl bg-surface transition duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* soft wash in the level colour */}
      <div aria-hidden className={cn('pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-60 blur-2xl', tone.chip)} />
      <button type="button" onClick={onOpen} className="relative block w-full p-6 text-left focus-visible:rounded-xl" aria-label={`${c.name} · ${t('classes.roster')}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl tracking-tight', tone.chip)}>{c.name}</span>
            <div className="min-w-0">
              <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs', fillTone[fill])}>{t(`classes.fill.${fill}`)}</span>
              {branchName && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted"><Building2 className="h-3.5 w-3.5" /> {branchName}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-5">
          <Ring value={c.studentCount} total={c.capacity} fill={fill}>
            <span className="text-xl tabular-nums">{c.studentCount}</span>
          </Ring>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm text-text-muted">{t('classes.students')}</p>
              <p className="tabular-nums"><span className="text-2xl">{c.studentCount}</span><span className="text-text-muted"> / {c.capacity}</span></p>
            </div>
            <div className="space-y-1.5">
              <SplitBar boys={c.boys ?? 0} girls={c.girls ?? 0} />
              <p className="flex justify-between text-xs text-text-muted"><span>{t('classes.boys', { count: c.boys ?? 0 })}</span><span>{t('classes.girls', { count: c.girls ?? 0 })}</span></p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
          <Avatar name={c.teacherName ?? '?'} size={36} src={c.teacherPhotoUrl} className={c.teacherName ? '' : 'opacity-40'} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-muted">{t('classes.teacher')}</p>
            <p className="truncate text-sm" title={c.teacherName ?? undefined}>{c.teacherName ? c.teacherName.split(' ').slice(0, 2).join(' ') : t('classes.noTeacher')}</p>
          </div>
          <span className="flex items-center gap-1 text-sm text-text-muted transition group-hover:text-primary">
            {c.freeSeats > 0 ? t('classes.freeShort', { count: c.freeSeats }) : t('classes.roster')}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
      {canEdit && (
        <button
          type="button"
          aria-label={t('classes.edit')}
          title={t('classes.edit')}
          onClick={onEdit}
          className="absolute right-4 top-4 z-10 rounded-xl border border-transparent p-2 text-text-muted opacity-0 transition hover:border-border hover:bg-surface hover:text-text focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}
