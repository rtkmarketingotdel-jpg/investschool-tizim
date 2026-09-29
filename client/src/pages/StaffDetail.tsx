import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserX } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
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

  const { user, attendance, payrolls, adjustments } = data;
  const byDate = new Map(attendance.map((a) => [a.date, a]));
  const first = new Date(`${month}-01T00:00:00Z`);
  const daysInMonth = new Date(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getDate();
  const offset = ((first.getUTCDay() || 7) - 1); // Monday-first grid
  const weekdays = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-2 text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> {t('nav.staffList')}</Link>
      <Card className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} size={72} />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{user.fullName}</h1>
          <p className="text-text-muted">{user.position} · {user.phone}</p>
          <div className="mt-2 flex gap-2"><Badge>{t(`roles.${user.role}`)}</Badge><Badge tone={user.isActive ? 'success' : 'danger'}>{t(user.isActive ? 'staff.active' : 'staff.inactive')}</Badge></div>
        </div>
        <div className="w-52"><Input type="month" aria-label={t('finance.payments.period')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t('staff.calendar')}</h2>
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
          <h2 className="mb-4 text-lg font-semibold">{t('attendance.logTitle')}</h2>
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
            <h2 className="mb-4 text-lg font-semibold">{t('staff.payrollHistory')}</h2>
            {payrolls.length === 0 ? <p className="py-8 text-center text-text-muted">{t('common.empty')}</p> : (
              <ul className="divide-y divide-border">
                {payrolls.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="flex-1 font-medium">{fmtDay(`${p.period}-01`, i18n.language, 'LLLL yyyy')}</span>
                    <Badge tone={payrollTone[p.status]}>{t(`finance.payroll.statuses.${p.status}`)}</Badge>
                    <span className="w-32 text-right font-semibold tabular-nums">{formatMoney(p.total, cur)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t('finance.payroll.adjustments')}</h2>
            {adjustments.length === 0 ? <p className="py-8 text-center text-text-muted">{t('common.empty')}</p> : (
              <ul className="divide-y divide-border">
                {adjustments.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 py-3 text-sm">
                    <span>{reasonText(a)}</span>
                    <span className={a.type === 'BONUS' ? 'font-semibold tabular-nums text-green-600' : 'font-semibold tabular-nums text-red-600'}>{a.type === 'BONUS' ? '+' : '−'}{formatMoney(a.amount, cur)}</span>
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
