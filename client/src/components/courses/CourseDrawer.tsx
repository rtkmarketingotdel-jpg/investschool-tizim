import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, UserPlus, UsersRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fmtDay } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import type { Course } from '@/lib/schoolApi';
import { statusTone } from '../groups/parts';
import { Avatar, Button, Drawer, EmptyState } from '../ui';
import { courseIcon, tintFor } from './parts';

/** A course at a glance: price, length, who teaches it and its groups. */
export function CourseDrawer({ course: c, onClose }: { course: Course | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const Icon = c ? courseIcon(c.name) : GraduationCap;
  return (
    <Drawer open={!!c} onClose={onClose} title={c?.name ?? ''} width={520}>
      {c && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl bg-surface-muted p-5">
            <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', tintFor(c.name))}><Icon className="h-7 w-7" /></span>
            <div className="min-w-0">
              <p className="text-2xl tabular-nums">{formatMoney(c.price, t('common.currency'))}</p>
              <p className="text-sm text-text-muted">{t('courses.months', { count: c.durationMonths })} · {t('courses.graduatesCount', { count: c.graduates })}</p>
            </div>
          </div>
          {c.description && <p className="text-text-muted">{c.description}</p>}

          <section>
            <h3 className="mb-3 text-lg">{t('courses.teachers')}</h3>
            {c.teachers.length === 0 ? (
              <EmptyState icon={GraduationCap} title={t('courses.noTeacher')} text={t('courses.noTeacherHint')} action={<Link to="/staff?add=teacher"><Button><UserPlus className="h-5 w-5" /> {t('staff.addTeacher')}</Button></Link>} />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {c.teachers.map((p) => (
                  <li key={p.id}>
                    <Link to={`/staff/${p.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-muted">
                      <Avatar name={p.fullName} size={44} src={p.photoUrl} />
                      <div className="min-w-0 flex-1"><p className="truncate">{p.fullName}</p><p className="truncate text-xs text-text-muted">{p.position}</p></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg">{t('nav.groups')} <span className="text-text-muted">({c.groups.length})</span></h3>
              <Link to={`/groups?courseId=${c.id}`} className="text-sm text-primary hover:underline">{t('courses.openGroups')}</Link>
            </div>
            {c.groups.length === 0 ? (
              <EmptyState icon={UsersRound} title={t('courses.noGroups')} />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {c.groups.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn('inline-flex min-w-14 justify-center rounded-xl px-2 py-1 text-sm', statusTone[g.status].chip)}>{g.name}</span>
                    <span className="flex-1 text-sm text-text-muted">{fmtDay(g.startDate, i18n.language, 'd MMM yyyy')} – {fmtDay(g.endDate, i18n.language, 'd MMM yyyy')}</span>
                    <span className="text-xs text-text-muted">{t(`groups.statuses.${g.status}`)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
