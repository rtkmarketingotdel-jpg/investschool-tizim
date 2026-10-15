import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react';
import { fmtDay } from '@/lib/dates';
import { plansApi } from '@/lib/plansApi';
import { EmptyState, Modal, Skeleton } from '../ui';

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

/** Trainees' ratings and comments for one topic. */
export function FeedbackModal({ groupId, topic, onClose }: { groupId: string; topic: { id: string; title: string } | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ['plans', 'feedback', groupId, topic?.id], queryFn: () => plansApi.feedback(groupId, topic!.id), enabled: !!topic });
  const rows = q.data ?? [];
  const rated = rows.filter((r) => r.rating);
  const avg = rated.length ? rated.reduce((n, r) => n + r.rating!, 0) / rated.length : null;
  return (
    <Modal open={!!topic} onClose={onClose} title={topic?.title ?? ''}>
      {q.isLoading ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <EmptyState icon={MessageSquareText} title={t('plans.feedback.none')} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between rounded-xl bg-surface-muted p-3">
            <span className="text-2xl tabular-nums">{avg ? avg.toFixed(1) : '—'} <span className="text-base text-warning">{avg ? stars(Math.round(avg)) : ''}</span></span>
            <span className="text-sm text-text-muted">{t('plans.feedback.summary', { rated: rated.length, asked: rows.length })}</span>
          </div>
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.studentName}</span>
                  {r.rating ? <span className="text-warning" aria-label={`${r.rating}/5`}>{stars(r.rating)}</span> : <span className="text-sm text-text-muted">{t('plans.feedback.notRated')}</span>}
                </div>
                {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
                <p className="mt-1 text-xs text-text-muted">{fmtDay((r.ratedAt ?? r.askedAt).slice(0, 10), i18n.language, 'd MMM yyyy')}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
