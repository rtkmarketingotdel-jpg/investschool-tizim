import { useTranslation } from 'react-i18next';
import { Clock, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import type { Course } from '@/lib/schoolApi';
import { AvatarStack, cardShell, courseIcon, tintFor } from './parts';

interface Props {
  course: Course;
  canEdit: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CourseCard({ course: c, canEdit, onOpen, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const Icon = courseIcon(c.name);
  const running = c.groups.filter((g) => g.status !== 'FINISHED').length;
  return (
    <article className={cardShell}>
      <button type="button" onClick={onOpen} className="block w-full p-6 text-left focus-visible:rounded-xl" aria-label={`${c.name} · ${t('courses.details')}`}>
        <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', tintFor(c.name))}><Icon className="h-7 w-7" /></span>
        <h3 className="mt-5 text-xl leading-snug">{c.name}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-text-muted"><Clock className="h-4 w-4" /> {t('courses.months', { count: c.durationMonths })}</p>
        <p className="mt-3 text-2xl tabular-nums tracking-tight">{formatMoney(c.price, t('common.currency'))}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div><dt className="text-text-muted">{t('courses.groupsRunning')}</dt><dd className="tabular-nums">{running}</dd></div>
          <div><dt className="text-text-muted">{t('courses.studying')}</dt><dd className="tabular-nums">{c.activeStudents}</dd></div>
          <div><dt className="text-text-muted">{t('courses.graduates')}</dt><dd className="tabular-nums">{c.graduates}</dd></div>
        </dl>
        <div className="mt-4 flex min-h-8 items-center gap-3 border-t border-border pt-4">
          {c.teachers.length > 0 ? (
            <>
              <AvatarStack people={c.teachers} />
              <p className="text-sm text-text-muted">{t('courses.teachersCount', { count: c.teachers.length })}</p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-warning"><TriangleAlert className="h-4 w-4" /> {t('courses.noTeacher')}</p>
          )}
        </div>
      </button>
      {canEdit && (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
          <button type="button" aria-label={t('common.edit')} title={t('common.edit')} onClick={onEdit} className="rounded-xl p-2 text-text-muted hover:bg-surface-muted hover:text-text"><Pencil className="h-4 w-4" /></button>
          <button type="button" aria-label={t('common.delete')} title={t('common.delete')} onClick={onDelete} className="rounded-xl p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
        </div>
      )}
    </article>
  );
}
