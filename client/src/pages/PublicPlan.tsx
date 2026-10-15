import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, Clock, MapPin, NotebookPen, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDay, todayLocal } from '@/lib/dates';
import { plansApi } from '@/lib/plansApi';
import { scheduleText } from '@/components/groups/parts';
import { EmptyState, Skeleton } from '@/components/ui';
import { topicDate } from './GroupPlan';

/** Public lesson plan (/p/:token): opens for anyone with the link, no sign-in; shows the plan only. */
export default function PublicPlan() {
  const { token = '' } = useParams();
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ['public-plan', token], queryFn: () => plansApi.publicPlan(token), retry: false });
  useEffect(() => {
    if (q.data) document.title = `${q.data.group.name} · ${q.data.group.courseName}`;
  }, [q.data]);

  if (q.isLoading) return <div className="mx-auto max-w-2xl space-y-4 p-4"><Skeleton className="h-40" /><Skeleton className="h-96" /></div>;
  if (q.isError || !q.data) return <div className="mx-auto max-w-2xl p-4 pt-16"><EmptyState icon={NotebookPen} title={t('plans.public.notFound')} /></div>;
  const { school, group: g, plan } = q.data;
  const total = plan.topics.length;
  const done = plan.topics.filter((x) => x.done).length;
  const next = plan.topics.find((x) => !x.done);
  const today = todayLocal();

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <span className="flex-1 text-lg font-semibold text-primary">{school}</span>
          <div className="flex rounded-xl border border-border p-0.5 text-sm">
            {(['uz', 'ru'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={i18n.language === l} onClick={() => void i18n.changeLanguage(l)}
                className={cn('rounded-lg px-2.5 py-1 uppercase', i18n.language === l ? 'bg-primary-soft text-primary' : 'text-text-muted')}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <section className="rounded-2xl bg-primary p-6 text-white">
          <p className="text-sm text-white/75">{t('plans.public.title')}</p>
          <h1 className="mt-1 text-2xl font-semibold">{g.courseName}</h1>
          <p className="text-white/85">{t('plans.public.group', { name: g.name })}</p>
          <div className="mt-4 grid gap-1.5 text-sm text-white/85">
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {fmtDay(g.startDate, i18n.language, 'd MMM yyyy')} – {fmtDay(g.endDate, i18n.language, 'd MMM yyyy')}</p>
            <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {scheduleText(g, t)}</p>
            {(g.room || g.branchName) && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {[g.branchName, g.room].filter(Boolean).join(' · ')}</p>}
            {g.teacherName && <p className="flex items-center gap-2"><UserRound className="h-4 w-4" /> {g.teacherName}</p>}
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-sm"><span>{t('plans.progress')}</span><span className="tabular-nums">{t('plans.doneOf', { done, total })}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></div>
          </div>
        </section>

        {total === 0 ? (
          <EmptyState icon={NotebookPen} title={t('plans.emptyPlan')} />
        ) : (
          <ol className="relative space-y-3">
            {plan.topics.map((x, i) => {
              const isNext = x.id === next?.id;
              const isToday = !x.done && x.date <= today && today <= x.lastDate;
              return (
                <li key={x.id} className={cn('flex gap-4 rounded-2xl bg-surface p-4', isNext && 'ring-2 ring-primary/50', x.done && 'opacity-70')}>
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                    x.done ? 'bg-success/15 text-success' : isNext ? 'bg-primary text-white' : 'bg-surface-muted text-text-muted')}>
                    {x.done ? <Check className="h-5 w-5" /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium text-primary">{topicDate(x, i18n.language)}</span>
                      {isToday && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">{t('plans.public.today')}</span>}
                      {isNext && !isToday && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{t('plans.next')}</span>}
                    </div>
                    <p className={cn('mt-1 text-[17px] leading-snug', x.done && 'line-through decoration-1')}>{x.title}</p>
                    <p className="mt-1 text-xs text-text-muted">{t(`plans.kind.${x.kind}`)}{x.lessons > 1 ? ` · ${t('plans.lessons', { count: x.lessons })}` : ''}</p>
                    {x.description && <p className="mt-2 text-sm text-text-muted">{x.description}</p>}
                    {x.materials && <p className="mt-1 break-words text-sm text-text-muted">📎 {x.materials}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <p className="pb-6 text-center text-xs text-text-muted">{t('plans.public.updated', { date: fmtDay(plan.updatedAt.slice(0, 10), i18n.language, 'd MMM yyyy') })}</p>
      </main>
    </div>
  );
}
