import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { downloadCsv, financeApi } from '@/lib/financeApi';
import { todayLocal } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Button, Card, EmptyState, Input, Skeleton } from '../ui';

const cell: Record<string, string> = {
  ON_TIME: 'bg-green-500',
  LATE: 'bg-amber-400',
  ABSENT: 'bg-red-500',
  EXCUSED: 'bg-slate-400',
};

const isoWeekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay() || 7;

export function AttendanceMatrix() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(todayLocal().slice(0, 7));
  const { data, isLoading, isError } = useQuery({ queryKey: ['attendance', 'matrix', month], queryFn: () => financeApi.matrix(month) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-52"><Input type="month" aria-label={t('finance.payments.period')} value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
        <Button variant="secondary" onClick={() => void downloadCsv('/attendance/matrix/export', `attendance-${month}.csv`, { month })}><Download className="h-5 w-5" /> CSV</Button>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-text-muted">
        {(['ON_TIME', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((s) => <span key={s} className="flex items-center gap-2"><i className={cn('h-3 w-3 rounded', cell[s])} />{t(`attendance.status.${s}`)}</span>)}
      </div>
      {isLoading ? <Skeleton className="h-72" /> : isError || !data ? <EmptyState icon={Download} title={t('errors.INTERNAL_ERROR')} /> : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-surface-muted text-text-muted">
              <tr>
                <th className="sticky left-0 z-10 bg-surface-muted px-4 py-3 text-left font-medium">{t('attendance.employee')}</th>
                {data.days.map((d) => <th key={d} className="px-0.5 py-3 text-center font-medium tabular-nums">{d.slice(8)}</th>)}
                <th className="px-3 py-3 text-center font-medium">{t('attendance.stats.onTime')}</th>
                <th className="px-3 py-3 text-center font-medium">{t('attendance.stats.late')}</th>
                <th className="px-3 py-3 text-center font-medium">{t('attendance.stats.absent')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.user.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-4 py-2 font-medium">{r.user.fullName}</td>
                  {data.days.map((d) => {
                    const st = r.days[d];
                    const off = !data.workDays.includes(isoWeekday(d));
                    return (
                      <td key={d} className="px-0.5 py-2 text-center">
                        <span
                          role="img"
                          aria-label={st ? t(`attendance.status.${st}`) : off ? t('attendance.dayOff') : '—'}
                          title={`${d}${st ? ` · ${t(`attendance.status.${st}`)}` : ''}`}
                          className={cn('inline-block h-5 w-5 rounded', st ? cell[st] : off ? 'bg-surface-muted' : 'border border-border')}
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 text-center tabular-nums">{r.totals.onTime}</td>
                  <td className="px-3 text-center tabular-nums text-amber-600">{r.totals.late}</td>
                  <td className="px-3 text-center tabular-nums text-red-600">{r.totals.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
