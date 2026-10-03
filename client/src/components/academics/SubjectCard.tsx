import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Subject } from '@/lib/schoolApi';
import { AvatarStack, cardShell, subjectIcon, tintFor } from './parts';

interface Props {
  subject: Subject;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SubjectCard({ subject, onOpen, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  // `people` comes from a newer API; tolerate an older server during a rolling deploy instead of crashing the page
  const s = { ...subject, people: subject.people ?? [] };
  const Icon = subjectIcon(s.name);
  const teachers = s.people.filter((p) => p.kind === 'teacher').length;
  const tutors = s.people.length - teachers;
  return (
    <article className={cardShell}>
      <button type="button" onClick={onOpen} className="block w-full p-6 text-left focus-visible:rounded-xl" aria-label={`${s.name} · ${t('academics.whoTeaches')}`}>
        <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', tintFor(s.name))}><Icon className="h-7 w-7" /></span>
        <h3 className="mt-5 text-xl leading-snug">{s.name}</h3>
        <div className="mt-4 flex min-h-8 items-center gap-3">
          {s.people.length > 0 ? (
            <>
              <AvatarStack people={s.people} />
              <p className="text-sm text-text-muted">
                {[teachers ? t('academics.teachersCount', { count: teachers }) : '', tutors ? t('academics.tutorsCount', { count: tutors }) : ''].filter(Boolean).join(' · ')}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-warning"><TriangleAlert className="h-4 w-4" /> {t('academics.noTeacher')}</p>
          )}
        </div>
      </button>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <button type="button" aria-label={t('common.edit')} title={t('common.edit')} onClick={onEdit} className="rounded-xl p-2 text-text-muted hover:bg-surface-muted hover:text-text"><Pencil className="h-4 w-4" /></button>
        <button type="button" aria-label={t('common.delete')} title={t('common.delete')} onClick={onDelete} className="rounded-xl p-2 text-danger hover:bg-surface-muted"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}
