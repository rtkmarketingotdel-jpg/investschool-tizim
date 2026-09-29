import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, School } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { schoolApi, type SchoolClass } from '@/lib/schoolApi';
import { PageHeader } from '@/components/PageHeader';
import { ClassDrawer } from '@/components/students/ClassDrawer';
import { Button, Card, EmptyState, Skeleton } from '@/components/ui';

export default function Classes() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const [drawer, setDrawer] = useState<{ open: boolean; cls: SchoolClass | null }>({ open: false, cls: null });
  const { data, isLoading, isError } = useQuery({ queryKey: ['classes'], queryFn: schoolApi.classes });
  const free = data?.reduce((n, c) => n + c.freeSeats, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={t('nav.classes')}
        subtitle={t('classes.subtitle', { free })}
        action={canEdit && <Button onClick={() => setDrawer({ open: true, cls: null })}><Plus className="h-5 w-5" /> {t('classes.add')}</Button>}
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : isError ? (
        <EmptyState icon={School} title={t('errors.INTERNAL_ERROR')} />
      ) : !data?.length ? (
        <EmptyState icon={School} title={t('classes.empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const pct = Math.min(100, Math.round((c.studentCount / c.capacity) * 100));
            return (
              <Card key={c.id} className="relative transition hover:bg-surface-muted/60">
                <Link to={`/students?classId=${c.id}`} className="block after:absolute after:inset-0 after:content-['']">
                  <h2 className="text-xl font-semibold">{c.name}</h2>
                  <p className="mt-1 text-sm text-text-muted">{c.teacherName ?? t('classes.noTeacher')}</p>
                </Link>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tabular-nums">{c.studentCount}/{c.capacity}</span>
                  <span className={c.freeSeats > 0 ? 'text-sm font-medium text-green-600 dark:text-green-400' : 'text-sm font-medium text-red-600'}>
                    {c.freeSeats > 0 ? t('classes.free', { count: c.freeSeats }) : t('classes.full')}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={c.freeSeats > 0 ? 'h-full bg-primary' : 'h-full bg-red-500'} style={{ width: `${pct}%` }} />
                </div>
                {canEdit && (
                  <button
                    aria-label={t('classes.edit')}
                    onClick={() => setDrawer({ open: true, cls: c })}
                    className="absolute right-4 top-4 z-10 rounded-lg p-2 text-text-muted hover:bg-surface-muted"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <ClassDrawer open={drawer.open} cls={drawer.cls} onClose={() => setDrawer({ open: false, cls: null })} />
    </div>
  );
}
