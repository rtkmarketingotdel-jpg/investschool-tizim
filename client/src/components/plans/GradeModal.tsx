import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UsersRound } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { cn } from '@/lib/cn';
import { plansApi, type GroupPlanData } from '@/lib/plansApi';
import { Button, EmptyState, Modal, Skeleton, useToast } from '../ui';

const tone = (n: number) => (n >= 4 ? 'border-green-600 bg-green-600 text-white' : n === 3 ? 'border-amber-500 bg-amber-500 text-white' : 'border-red-600 bg-red-600 text-white');

interface Props {
  groupId: string;
  topic: { id: string; title: string } | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (d: Omit<GroupPlanData, 'templateTopics' | 'canEdit'>) => void;
}

/** The lesson is over: the teacher marks each trainee 1-5 (tap the mark again to clear it). */
export function GradeModal({ groupId, topic, canEdit, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const q = useQuery({ queryKey: ['plans', 'grades', groupId, topic?.id], queryFn: () => plansApi.grades(groupId, topic!.id), enabled: !!topic });
  const [marks, setMarks] = useState<Record<string, number | null>>({});
  useEffect(() => {
    if (q.data) setMarks(Object.fromEntries(q.data.map((r) => [r.studentId, r.grade])));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => plansApi.saveGrades(groupId, topic!.id, Object.entries(marks).map(([studentId, grade]) => ({ studentId, grade }))),
    onSuccess: (d) => { toast(t('plans.grades.saved')); onSaved(d); onClose(); },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  const rows = q.data ?? [];
  const given = Object.values(marks).filter((v) => v !== null && v !== undefined) as number[];
  const avg = given.length ? (given.reduce((n, v) => n + v, 0) / given.length).toFixed(1) : '—';

  return (
    <Modal open={!!topic} onClose={onClose} title={`${t('plans.grades.title')}: ${topic?.title ?? ''}`}>
      {q.isLoading ? <Skeleton className="h-60" /> : rows.length === 0 ? (
        <EmptyState icon={UsersRound} title={t('groups.emptyRoster')} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">{canEdit ? t('plans.grades.hint') : t('plans.grades.readOnly')}</p>
          <ul className="max-h-[55vh] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {rows.map((r, i) => {
              const cur = marks[r.studentId] ?? null;
              return (
                <li key={r.studentId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="w-6 text-sm tabular-nums text-text-muted">{i + 1}</span>
                  <span className="min-w-36 flex-1 truncate">{r.fullName}</span>
                  <div className="flex gap-1.5" role="radiogroup" aria-label={r.fullName}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={cur === n}
                        disabled={!canEdit}
                        onClick={() => setMarks((m) => ({ ...m, [r.studentId]: cur === n ? null : n }))}
                        className={cn('h-9 w-9 rounded-lg border text-sm font-semibold tabular-nums transition disabled:cursor-default',
                          cur === n ? tone(n) : 'border-border text-text-muted hover:bg-surface-muted')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-text-muted">{t('plans.grades.summary', { given: given.length, total: rows.length, avg })}</p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onClose}>{canEdit ? t('plans.grades.later') : t('common.close')}</Button>
            {canEdit && <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
