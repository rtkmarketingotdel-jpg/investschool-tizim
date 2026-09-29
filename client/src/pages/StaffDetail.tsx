import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, Trophy, UserX } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
import { uploadUrl } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { fmtDay, fmtTime, todayLocal } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { StatusBadge } from '@/components/attendance/StatusBadge';
import { useReasonText } from '@/components/finance/AdjustmentReason';
import { Avatar, Badge, Card, EmptyState, Input, Skeleton } from '@/components/ui';
import { payrollTone } from '@/pages/finance/Payroll';

const dot: Record<string, string> = { ON_TIME: 'bg-green-500', LATE: 'bg-amber-400', ABSENT: 'bg-red-500', EXCUSED: 'bg-slate-400' };

export default function StaffDetail() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const reasonText = useReasonText();
  const [month, setMonth] = useState(todayLocal().slice(0, 7));
  const { data, isLoading, isError } = useQuery({ queryKey: ['staff-overview', id, month], queryFn: () => financeApi.staffOverview(id, month) });
  const cur = t('common.currency');

  if (isLoading) return <Skeleton className="h-72" />;
  if (isError || !data) return <EmptyState icon={UserX} title={t('errors.NOT_FOUND')} action={<Link to="/staff" className="text-primary">{t('common.back')}</Link>} />;

  const { user, attendance, payrolls, adjustments, profile } = data;
  const byDate = new Map(attendance.map((a) => [a.date, a]));
  const first = new Date(`${month}-01T00:00:00Z`);
  const daysInMonth = new Date(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getDate();
  const offset = ((first.getUTCDay() || 7) - 1); // Monday-first grid
  const weekdays = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> {t('nav.staffList')}</Link>
      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} size={96} src={user.photoUrl} />
        <div className="flex-1">
          <h1 className="text-2xl font-medium">{user.fullName}</h1>
          <p className="text-text-muted">{user.position} · {user.phone}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{t(`roles.${user.role}`)}</Badge>
            <Badge tone={user.isActive ? 'success' : 'danger'}>{t(user.isActive ? 'staff.active' : 'staff.inactive')}</Badge>
            {user.isTeacher && <Badge>{t('staff.kind.teacher')}</Badge>}
            {user.isTutor && <Badge>{t('staff.kind.tutor')}</Badge>}
            {!profile.completed && <Badge tone="warning">{t('staff.profileIncomplete')}</Badge>}
          </div>
        </div>
        <div className="w-52"><Input type="month" aria-label={t('finance.payments.period')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h2 className="mb-4 text-lg font-medium">{t('staff.about')}</h2>
          <dl className="space-y-3 text-sm">
            {([
              [t('staff.phone'), user.phone],
              [t('staff.position'), user.position],
              [t('staff.subject'), user.subject ?? '—'],
              [t('staff.branch'), profile.branchName ?? t('staff.anyBranch')],
              [t('staff.hiredAt'), fmtDay(profile.hiredAt.slice(0, 10), i18n.language, 'd MMMM yyyy')],
              [t('staff.homeroomOf'), profile.classesLed.length ? profile.classesLed.join(', ') : '—'],
              [t('staff.clubsLed'), profile.clubsLed.length ? profile.clubsLed.join(', ') : '—'],
            ] as Array<[string, string]>).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <Card className="xl:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium"><Trophy className="h-5 w-5 text-text-muted" /> {t('profile.steps.achievements')}</h2>
          {profile.achievements.length === 0 ? <p className="py-6 text-center text-text-muted">{t('staff.nothingYet')}</p> : (
            <ul className="space-y-3">
              {profile.achievements.map((a) => (
                <li key={a.id} className="border-l-2 border-primary pl-3">
                  <p>{a.title}{a.year ? <span className="text-text-muted"> · {a.year}</span> : null}</p>
                  {a.description && <p className="text-sm text-text-muted">{a.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="xl:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-medium"><FileText className="h-5 w-5 text-text-muted" /> {t('profile.steps.documents')}</h2>
          {profile.documents.length === 0 ? <p className="py-6 text-center text-text-muted">{t('staff.nothingYet')}</p> : (
            <ul className="space-y-3">
              {profile.documents.map((d) => (
                <li key={d.id}>
                  <a href={uploadUrl(d.fileUrl) ?? '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-border p-2 hover:bg-surface-muted">
                    {d.mime.startsWith('image/') ? <img src={uploadUrl(d.fileUrl) ?? ''} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><FileText className="h-5 w-5" /></span>}
                    <span className="min-w-0"><span className="block truncate text-sm">{d.title}</span><span className="block truncate text-xs text-text-muted">{t(`profile.kinds.${d.kind}`)}{d.issuer ? ` · ${d.issuer}` : ''}{d.year ? ` · ${d.year}` : ''}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-medium">{t('staff.calendar')}</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
            {weekdays.map((d) => <span key={d} className="py-1">{t(`settings.work.day.${d}`)}</span>)}
            {Array.from({ length: offset }, (_, i) => <span key={`o${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, '0')}`;
              const rec = byDate.get(date);
              return (
                <div key={date} className="flex flex-col items-center gap-1 rounded-lg py-1.5" title={rec ? `${date} · ${t(`attendance.status.${rec.status}`)}` : date}>
                  <span className="text-sm text-text">{i + 1}</span>
                  <span role="img" aria-label={rec ? t(`attendance.status.${rec.status}`) : '—'} className={cn('h-2.5 w-2.5 rounded-full', rec ? dot[rec.status] : 'bg-transparent')} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-medium">{t('attendance.logTitle')}</h2>
          {attendance.length === 0 ? <p className="py-8 text-center text-text-muted">{t('common.empty')}</p> : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {attendance.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-16 text-text-muted">{fmtDay(a.date, i18n.language, 'd-MMM')}</span>
                  <span className="flex-1 tabular-nums">{fmtTime(a.checkInAt) ?? '—'} → {fmtTime(a.checkOutAt) ?? '—'}</span>
                  <StatusBadge status={a.status} lateMinutes={a.lateMinutes} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.seesPay && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-lg font-medium">{t('staff.payrollHistory')}</h2>
            {payrolls.length === 0 ? <p className="py-8 text-center text-text-muted">{t('common.empty')}</p> : (
              <ul className="divide-y divide-border">
                {payrolls.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="flex-1 font-medium">{fmtDay(`${p.period}-01`, i18n.language, 'LLLL yyyy')}</span>
                    <Badge tone={payrollTone[p.status]}>{t(`finance.payroll.statuses.${p.status}`)}</Badge>
                    <span className="w-32 text-right font-medium tabular-nums">{formatMoney(p.total, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-medium">{t('finance.payroll.adjustments')}</h2>
            {adjustments.length === 0 ? <p className="py-8 text-center text-text-muted">{t('common.empty')}</p> : (
              <ul className="divide-y divide-border">
                {adjustments.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 py-3 text-sm">
                    <span>{reasonText(a)}</span>
                    <span className={a.type === 'BONUS' ? 'font-medium tabular-nums text-green-600' : 'font-medium tabular-nums text-red-600'}>{a.type === 'BONUS' ? '+' : '−'}{formatMoney(a.amount, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
