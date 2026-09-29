import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CalendarCheck, GraduationCap, LayoutDashboard, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { financeApi } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { fmtDay } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { Avatar, Badge, Card, EmptyState, Skeleton, type BadgeTone } from '@/components/ui';

function Kpi({ icon: Icon, title, value, sub, children }: { icon: LucideIcon; title: string; value: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-text-muted">{title}</p>
      </div>
      <p className="mt-4 whitespace-nowrap text-xl font-semibold tabular-nums 2xl:text-2xl">{value}</p>
      {sub && <div className="mt-1 text-sm text-text-muted">{sub}</div>}
      {children}
    </Card>
  );
}

const problemTone: Record<string, BadgeTone> = { LATE: 'warning', ABSENT: 'danger', NOT_ARRIVED: 'neutral' };

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: financeApi.dashboard, refetchInterval: 60_000 });
  const cur = t('common.currency');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      </div>
    );
  }
  if (isError || !data) return <EmptyState icon={LayoutDashboard} title={t('errors.INTERNAL_ERROR')} />;

  const axis = theme === 'dark' ? '#94A3B8' : '#64748B';
  const grid = theme === 'dark' ? '#1F2937' : '#E5E7EB';
  const monthLabel = (p: string) => fmtDay(`${p}-01`, i18n.language, 'LLL');
  const pct = data.revenue && data.revenue.plan > 0 ? Math.min(100, Math.round((data.revenue.fact / data.revenue.plan) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.dashboard')} subtitle={t('dashboard.welcome', { name: user?.fullName.split(' ')[1] ?? user?.fullName })} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={GraduationCap} title={t('dashboard.activeStudents')} value={String(data.students.active)} sub={t('dashboard.newThisMonth', { count: data.students.newThisMonth })} />
        {data.attendance && (
          <Kpi
            icon={CalendarCheck}
            title={t('dashboard.todayAttendance')}
            value={`${data.attendance.came} / ${data.attendance.total}`}
            sub={data.attendance.isWorkday ? t('dashboard.lateCount', { count: data.attendance.late }) : t('dashboard.dayOff')}
          />
        )}
        {data.revenue && (
          <Kpi
            icon={Wallet}
            title={t('dashboard.monthRevenue')}
            value={formatMoney(data.revenue.fact, cur)}
            sub={
              <>
                <p>{t('dashboard.ofPlan', { plan: formatMoney(data.revenue.plan, cur) })}</p>
                {data.revenue.changePct !== null && (
                  <p className={data.revenue.changePct >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {data.revenue.changePct >= 0 ? '+' : ''}{data.revenue.changePct}% {t('dashboard.vsLastMonth')}
                  </p>
                )}
              </>
            }
          >
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </Kpi>
        )}
        {data.debt && (
          <Kpi icon={AlertCircle} title={t('dashboard.totalDebt')} value={formatMoney(data.debt.total, cur)} sub={t('dashboard.debtorsCount', { count: data.debt.count })} />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {data.chart && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold">{t('dashboard.revenueChart')}</h2>
            <div className="h-72" role="img" aria-label={t('dashboard.revenueChart')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart.map((c) => ({ ...c, name: monthLabel(c.period) }))} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="name" stroke={axis} tickLine={false} axisLine={false} />
                  <YAxis stroke={axis} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatMoney(v, cur), t(`dashboard.${name}`)]}
                    contentStyle={{ background: theme === 'dark' ? '#111827' : '#fff', border: `1px solid ${grid}`, borderRadius: 12 }}
                  />
                  <Bar dataKey="plan" isAnimationActive={false} fill={theme === 'dark' ? '#475569' : '#CBD5E1'} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="fact" isAnimationActive={false} fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-text-muted">
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-[#CBD5E1] dark:bg-slate-600" />{t('dashboard.plan')}</span>
              <span className="flex items-center gap-2"><i className="h-3 w-3 rounded bg-[#2563EB]" />{t('dashboard.fact')}</span>
            </div>
          </Card>
        )}
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{t('dashboard.classFill')}</h2>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">{t('dashboard.freeSeats', { count: data.classFill.freeSeats })}</span>
          </div>
          <ul className="space-y-3">
            {data.classFill.items.map((c) => {
              const pctC = Math.round((c.count / c.capacity) * 100);
              return (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <Link to={`/students?classId=${c.id}`} className="font-medium hover:text-primary">{c.name} · {c.count}/{c.capacity}</Link>
                    {c.capacity - c.count > 0 && <span className="text-green-600 dark:text-green-400">+{c.capacity - c.count}</span>}
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className={pctC >= 100 ? 'h-full bg-red-500' : 'h-full bg-primary'} style={{ width: `${Math.min(100, pctC)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {(data.attendance || data.topDebtors) && (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.attendance && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t('dashboard.problems')}</h2>
              {data.attendance.problems.length === 0 ? (
                <p className="py-8 text-center text-text-muted">{t('dashboard.allPresent')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.attendance.problems.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <Avatar name={p.fullName} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.fullName}</p>
                        <p className="truncate text-[13px] text-text-muted">{p.position}</p>
                      </div>
                      <Badge tone={problemTone[p.status]}>
                        {t(`dashboard.problem.${p.status}`)}{p.status === 'LATE' ? ` · ${p.lateMinutes} ${t('attendance.min')}` : ''}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {data.topDebtors && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">{t('dashboard.topDebtors')}</h2>
              {data.topDebtors.length === 0 ? (
                <p className="py-8 text-center text-text-muted">{t('dashboard.noDebtors')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.topDebtors.map((d) => (
                    <li key={d.studentId} className="flex items-center gap-3 py-3">
                      <Avatar name={d.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <Link to={`/students/${d.studentId}`} className="block truncate font-medium hover:text-primary">{d.name}</Link>
                        <p className="text-[13px] text-text-muted">{d.className ?? '—'} · {t('dashboard.days', { count: d.overdueDays })}</p>
                      </div>
                      <span className="font-semibold tabular-nums text-red-600">{formatMoney(d.debt, cur)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
