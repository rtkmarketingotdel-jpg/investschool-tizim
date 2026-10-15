import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronRight, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { plansApi } from '@/lib/plansApi';
import { PageHeader } from '@/components/PageHeader';
import { courseIcon, tintFor } from '@/components/courses/parts';
import { statusTone } from '@/components/groups/parts';
import { EmptyState, Skeleton } from '@/components/ui';

/** Sidebar → Lesson plans: every course with its master plan and the plan state of its groups. */
export default function Plans() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({ queryKey: ['plans', 'courses'], queryFn: plansApi.courses });

  return (
    <div className="space-y-8">
      <PageHeader title={t('nav.plans')} subtitle={t('plans.subtitle')} />
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : isError ? (
        <EmptyState icon={NotebookPen} title={t('errors.INTERNAL_ERROR')} />
      ) : !data?.length ? (
        <EmptyState icon={NotebookPen} title={t('plans.noCourses')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const Icon = courseIcon(c.name);
            return (
              <article key={c.id} className="flex flex-col rounded-xl bg-surface p-6">
                <Link to={`/plans/course/${c.id}`} className="group flex items-start gap-4">
                  <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tintFor(c.name))}><Icon className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg group-hover:text-primary">{c.name}</h2>
                    <p className="text-sm text-text-muted">
                      {c.templateTopics ? t('plans.templateSummary', { topics: c.templateTopics, lessons: c.templateLessons }) : t('plans.noTemplate')}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
                <div className="mt-5 flex-1 space-y-2 border-t border-border pt-4">
                  {c.groups.length === 0 && <p className="text-sm text-text-muted">{t('plans.noGroups')}</p>}
                  {c.groups.map((g) => (
                    <Link key={g.id} to={`/plans/group/${g.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-muted">
                      <span className={cn('inline-flex min-w-14 justify-center rounded-lg px-2 py-1 text-sm', statusTone[g.status].chip)}>{g.name}</span>
                      {g.hasPlan ? (
                        <>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                            <div className="h-full rounded-full bg-success" style={{ width: `${g.topics ? Math.round((g.done / g.topics) * 100) : 0}%` }} />
                          </div>
                          <span className="flex items-center gap-1 text-xs tabular-nums text-text-muted">{g.done === g.topics && g.topics > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}{g.done}/{g.topics}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-sm text-warning">{t('plans.noPlan')}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
