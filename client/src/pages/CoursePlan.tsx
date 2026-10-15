import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, NotebookPen, Save } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { cn } from '@/lib/cn';
import { plansApi } from '@/lib/plansApi';
import { PageHeader } from '@/components/PageHeader';
import { draftOf, TopicEditor, type DraftTopic } from '@/components/plans/TopicEditor';
import { statusTone } from '@/components/groups/parts';
import { Badge, Button, Card, EmptyState, Skeleton, useToast } from '@/components/ui';

/** A course's master plan (copied by its groups) and the list of its groups' plans. */
export default function CoursePlan() {
  const { courseId = '' } = useParams();
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['plans', 'course', courseId], queryFn: () => plansApi.course(courseId) });
  const courses = useQuery({ queryKey: ['plans', 'courses'], queryFn: plansApi.courses });
  const [topics, setTopics] = useState<DraftTopic[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (q.data) { setTopics(q.data.topics.map(draftOf)); setDirty(false); }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => plansApi.saveCourse(courseId, topics.filter((x) => x.title.trim())),
    onSuccess: () => {
      toast(t('plans.saved'));
      void qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (e) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error'),
  });

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) return <EmptyState icon={NotebookPen} title={t('errors.NOT_FOUND')} action={<Link to="/plans" className="text-primary">{t('common.back')}</Link>} />;
  const groups = courses.data?.find((c) => c.id === courseId)?.groups ?? [];
  const lessons = topics.reduce((n, x) => n + x.lessons, 0);

  return (
    <div className="space-y-6">
      <Link to="/plans" className="inline-flex items-center gap-2 text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> {t('nav.plans')}</Link>
      <PageHeader
        title={q.data.course.name}
        subtitle={t('plans.courseSubtitle', { months: q.data.course.durationMonths })}
        action={q.data.canEdit && <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}><Save className="h-4 w-4" /> {t('common.save')}</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg">{t('plans.template')}</h2>
            <span className="text-sm text-text-muted">{t('plans.templateSummary', { topics: topics.length, lessons })}</span>
          </div>
          <p className="text-sm text-text-muted">{t('plans.templateHint')}</p>
          {q.data.canEdit ? (
            <TopicEditor topics={topics} onChange={(v) => { setTopics(v); setDirty(true); }} />
          ) : topics.length === 0 ? (
            <p className="py-6 text-center text-text-muted">{t('plans.noTemplate')}</p>
          ) : (
            <ol className="divide-y divide-border rounded-xl border border-border">
              {topics.map((x, i) => (
                <li key={x.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-7 text-sm tabular-nums text-text-muted">{i + 1}</span>
                  <span className="flex-1">{x.title}</span>
                  <Badge tone={x.kind === 'THEORY' ? 'info' : 'success'}>{t(`plans.kind.${x.kind}`)}</Badge>
                  <span className="text-sm text-text-muted">{t('plans.lessons', { count: x.lessons })}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="h-fit space-y-3">
          <h2 className="text-lg">{t('plans.groupPlans')}</h2>
          {groups.length === 0 && <p className="text-sm text-text-muted">{t('plans.noGroups')}</p>}
          {groups.map((g) => (
            <Link key={g.id} to={`/plans/group/${g.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition hover:bg-surface-muted">
              <span className={cn('inline-flex min-w-14 justify-center rounded-lg px-2 py-1 text-sm', statusTone[g.status].chip)}>{g.name}</span>
              <span className={cn('text-sm', g.hasPlan ? 'text-text-muted' : 'text-warning')}>{g.hasPlan ? t('plans.doneOf', { done: g.done, total: g.topics }) : t('plans.noPlan')}</span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  );
}
