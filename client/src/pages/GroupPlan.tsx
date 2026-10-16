import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Circle, Clock, ListOrdered, NotebookPen, Pencil, RotateCcw, Save } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fmtDay } from '@/lib/dates';
import { plansApi, type GroupPlanData, type ScheduledTopic } from '@/lib/plansApi';
import { PageHeader } from '@/components/PageHeader';
import { scheduleText, statusTone } from '@/components/groups/parts';
import { SharePanel } from '@/components/plans/SharePanel';
import { BotLinksPanel } from '@/components/plans/BotLinksPanel';
import { FeedbackModal } from '@/components/plans/FeedbackModal';
import { GradeModal } from '@/components/plans/GradeModal';
import { draftOf, TopicEditor, type DraftTopic } from '@/components/plans/TopicEditor';
import { Badge, Button, Card, EmptyState, Skeleton, useToast } from '@/components/ui';

type Mode = 'view' | 'order' | 'edit';

/** "15 okt, chor" or "15–17 okt" for a topic spanning several lessons. */
export function topicDate(x: Pick<ScheduledTopic, 'date' | 'lastDate'>, lang: string) {
  if (x.date === x.lastDate) return fmtDay(x.date, lang, 'd MMM, EEE');
  return `${fmtDay(x.date, lang, 'd MMM')} – ${fmtDay(x.lastDate, lang, 'd MMM')}`;
}

/** A group's lesson plan: dates follow the group schedule; the order is agreed with the trainees. */
export default function GroupPlan() {
  const { groupId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['plans', 'group', groupId], queryFn: () => plansApi.group(groupId) });
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState<DraftTopic[]>([]);
  /** order mode: topic ids in the order they were tapped */
  const [picked, setPicked] = useState<string[]>([]);
  const [feedbackOf, setFeedbackOf] = useState<{ id: string; title: string } | null>(null);
  const [gradesOf, setGradesOf] = useState<{ id: string; title: string } | null>(null);

  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const apply = (d: Omit<GroupPlanData, 'templateTopics' | 'canEdit'>) => {
    qc.setQueryData<GroupPlanData>(['plans', 'group', groupId], (old) => (old ? { ...old, ...d } : old));
    void qc.invalidateQueries({ queryKey: ['plans', 'courses'] });
  };
  const create = useMutation({ mutationFn: (fromTemplate: boolean) => plansApi.createGroup(groupId, fromTemplate), onSuccess: (d) => { apply(d); if (!d.plan?.topics.length) startEdit(d); }, onError: fail });
  const save = useMutation({
    mutationFn: (topics: DraftTopic[]) => plansApi.saveGroup(groupId, topics),
    onSuccess: (d) => { apply(d); setMode('view'); toast(t('plans.saved')); },
    onError: fail,
  });
  const tick = useMutation({
    mutationFn: (v: { id: string; done: boolean }) => plansApi.setDone(groupId, v.id, v.done),
    onSuccess: (d, v) => {
      apply(d);
      // the lesson is over: the teacher marks the trainees right away
      if (v.done) {
        const topic = d.plan?.topics.find((x) => x.id === v.id);
        if (topic) setGradesOf({ id: topic.id, title: topic.title });
      }
      // the trainees of this group were asked on Telegram to rate the lesson
      if (d.feedbackRequested) toast(t('plans.feedback.requested', { count: d.feedbackRequested }));
      void qc.invalidateQueries({ queryKey: ['plans', 'bot', groupId] });
    },
    onError: fail,
  });
  const renew = useMutation({ mutationFn: () => plansApi.renewToken(groupId), onSuccess: (d) => { apply(d); toast(t('plans.share.renewed')); }, onError: fail });

  const data = q.data;
  const topics = useMemo(() => data?.plan?.topics ?? [], [data]);
  const byId = useMemo(() => new Map(topics.map((x) => [x.id, x])), [topics]);

  function startEdit(d = data) {
    setDraft((d?.plan?.topics ?? []).map(draftOf));
    setMode('edit');
  }
  const startOrder = () => { setPicked([]); setMode('order'); };
  const tap = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  /** topics not tapped yet keep their current relative order after the tapped ones */
  const orderResult = () => [...picked.map((id) => byId.get(id)!), ...topics.filter((x) => !picked.includes(x.id))];

  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.isError || !data) return <EmptyState icon={NotebookPen} title={t('errors.NOT_FOUND')} action={<Link to="/plans" className="text-primary">{t('common.back')}</Link>} />;
  const { group: g, plan } = data;
  const doneCount = plan?.done.length ?? 0;
  const next = topics.find((x) => !x.done);
  const overflow = topics.some((x) => x.overflow);

  return (
    <div className="space-y-6">
      <Link to={`/plans/course/${g.courseId}`} className="inline-flex items-center gap-2 text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> {g.courseName}</Link>
      <PageHeader
        title={`${g.name} · ${t('plans.groupPlan')}`}
        subtitle={`${g.courseName}${g.teacherName ? ` · ${g.teacherName}` : ''}`}
        action={plan && data.canEdit && mode === 'view' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => startEdit()}><Pencil className="h-4 w-4" /> {t('plans.edit')}</Button>
            <Button onClick={startOrder} disabled={topics.length < 2}><ListOrdered className="h-4 w-4" /> {t('plans.order')}</Button>
          </div>
        )}
      />

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs', statusTone[g.status].chip)}>{t(`groups.statuses.${g.status}`)}</span>
        <span className="flex items-center gap-2 text-text-muted"><CalendarDays className="h-4 w-4" /> {fmtDay(g.startDate, i18n.language, 'd MMM yyyy')} – {fmtDay(g.endDate, i18n.language, 'd MMM yyyy')}</span>
        <span className="flex items-center gap-2 text-text-muted"><Clock className="h-4 w-4" /> {scheduleText(g, t)}{g.room ? ` · ${g.room}` : ''}</span>
        {plan && <span className="text-text-muted">{t('plans.lessonsOfCapacity', { lessons: plan.lessons, capacity: g.lessonCapacity })}</span>}
      </Card>

      {!plan ? (
        <Card className="space-y-4 py-10 text-center">
          <NotebookPen className="mx-auto h-10 w-10 text-text-muted" />
          <h2 className="text-xl">{t('plans.noPlanTitle')}</h2>
          <p className="mx-auto max-w-lg text-text-muted">{t('plans.noPlanHint')}</p>
          {data.canEdit ? (
            <div className="flex flex-wrap justify-center gap-3">
              {data.templateTopics > 0 && <Button loading={create.isPending && create.variables === true} onClick={() => create.mutate(true)}>{t('plans.fromTemplate', { count: data.templateTopics })}</Button>}
              <Button variant="secondary" loading={create.isPending && create.variables === false} onClick={() => create.mutate(false)}>{t('plans.createEmpty')}</Button>
            </div>
          ) : <p className="text-sm text-text-muted">{t('plans.askTeacher')}</p>}
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {mode === 'edit' ? (
              <Card className="space-y-4">
                <TopicEditor topics={draft} onChange={setDraft} />
                <div className="flex gap-3 border-t border-border pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setMode('view')}>{t('common.cancel')}</Button>
                  <Button className="flex-1" loading={save.isPending} onClick={() => save.mutate(draft.filter((x) => x.title.trim()))}><Save className="h-4 w-4" /> {t('common.save')}</Button>
                </div>
              </Card>
            ) : mode === 'order' ? (
              <Card className="space-y-4">
                <div className="rounded-xl bg-primary-soft p-4 text-sm text-primary">
                  <p className="font-medium">{t('plans.orderTitle')}</p>
                  <p>{t('plans.orderHint')}</p>
                </div>
                <p className="text-sm tabular-nums text-text-muted">{t('plans.orderProgress', { picked: picked.length, total: topics.length })}</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {topics.map((x) => {
                    const n = picked.indexOf(x.id) + 1;
                    return (
                      <li key={x.id}>
                        <button type="button" onClick={() => tap(x.id)} aria-pressed={n > 0}
                          className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', n ? 'border-primary bg-primary-soft' : 'border-border hover:bg-surface-muted')}>
                          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums', n ? 'bg-primary text-white' : 'border border-dashed border-border text-text-muted')}>{n || '·'}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{x.title}</span>
                            <span className="text-xs text-text-muted">{t(`plans.kind.${x.kind}`)} · {t('plans.lessons', { count: x.lessons })}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                  <Button variant="secondary" onClick={() => setMode('view')}>{t('common.cancel')}</Button>
                  <Button variant="secondary" disabled={!picked.length} onClick={() => setPicked([])}><RotateCcw className="h-4 w-4" /> {t('plans.orderReset')}</Button>
                  <Button className="ml-auto" disabled={!picked.length} loading={save.isPending} onClick={() => save.mutate(orderResult().map(draftOf))}>
                    <Save className="h-4 w-4" /> {picked.length === topics.length ? t('plans.orderSave') : t('plans.orderSaveRest')}
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <Card className="space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{t('plans.progress')}</span>
                    <span className="tabular-nums text-text-muted">{t('plans.doneOf', { done: doneCount, total: topics.length })}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${topics.length ? Math.round((doneCount / topics.length) * 100) : 0}%` }} /></div>
                  {overflow && <p className="flex items-center gap-2 pt-1 text-sm text-warning"><AlertTriangle className="h-4 w-4" /> {t('plans.overflow', { lessons: plan.lessons, capacity: g.lessonCapacity })}</p>}
                </Card>
                {topics.length === 0 ? (
                  <EmptyState icon={NotebookPen} title={t('plans.emptyPlan')} action={data.canEdit && <Button onClick={() => startEdit()}><Pencil className="h-4 w-4" /> {t('plans.edit')}</Button>} />
                ) : (
                  <ol className="space-y-2">
                    {topics.map((x, i) => (
                      <li key={x.id} className={cn('flex items-start gap-4 rounded-xl bg-surface p-4', x.id === next?.id && 'ring-2 ring-primary/40')}>
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums', x.done ? 'bg-success/15 text-success' : 'bg-surface-muted text-text-muted')}>{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className={cn('font-medium', x.done && 'text-text-muted line-through decoration-1')}>{x.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                            <span className={cn(x.overflow && 'text-warning')}>{topicDate(x, i18n.language)}</span>
                            <Badge tone={x.kind === 'THEORY' ? 'info' : 'success'}>{t(`plans.kind.${x.kind}`)}</Badge>
                            {x.lessons > 1 && <span>{t('plans.lessons', { count: x.lessons })}</span>}
                            {x.id === next?.id && <span className="text-primary">{t('plans.next')}</span>}
                            {x.done && (
                              <button type="button" onClick={() => setGradesOf({ id: x.id, title: x.title })}
                                className={cn('rounded-full px-2.5 py-0.5 text-xs', x.grades ? 'bg-primary-soft text-primary hover:bg-primary/15' : 'border border-dashed border-primary/50 text-primary hover:bg-primary-soft')}>
                                {x.grades ? t('plans.grades.chip', { avg: x.grades.avg, count: x.grades.count }) : t('plans.grades.give')}
                              </button>
                            )}
                            {x.rating && (
                              <button type="button" onClick={() => setFeedbackOf({ id: x.id, title: x.title })} className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs text-warning hover:bg-warning/20" title={t('plans.feedback.open')}>
                                ★ {x.rating.avg ?? '—'} · {t('plans.feedback.short', { rated: x.rating.count, asked: x.rating.asked })}{x.rating.comments ? ` · 💬 ${x.rating.comments}` : ''}
                              </button>
                            )}
                          </p>
                          {x.description && <p className="mt-1.5 text-sm text-text-muted">{x.description}</p>}
                          {x.materials && <p className="mt-1 text-sm text-text-muted">📎 {x.materials}</p>}
                        </div>
                        {data.canEdit && (
                          <button type="button" aria-pressed={x.done} title={t(x.done ? 'plans.markUndone' : 'plans.markDone')}
                            onClick={() => tick.mutate({ id: x.id, done: !x.done })}
                            className={cn('flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition', x.done ? 'text-success hover:bg-surface-muted' : 'text-text-muted hover:bg-surface-muted')}>
                            {x.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                            <span className="hidden sm:inline">{t(x.done ? 'plans.taught' : 'plans.markDone')}</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </div>
          <div className="space-y-4">
            {data.canEdit && <BotLinksPanel groupId={groupId} />}
            <SharePanel token={plan.publicToken} title={`${g.name} · ${g.courseName}`} canRenew={data.canEdit} renewing={renew.isPending} onRenew={() => renew.mutate()} />
          </div>
        </div>
      )}
      <FeedbackModal groupId={groupId} topic={feedbackOf} onClose={() => setFeedbackOf(null)} />
      <GradeModal groupId={groupId} topic={gradesOf} canEdit={!!data?.canEdit} onClose={() => setGradesOf(null)} onSaved={apply} />
    </div>
  );
}
