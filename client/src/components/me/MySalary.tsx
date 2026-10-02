import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, ChevronDown, Minus, Plus } from 'lucide-react';
import { financeApi, type Adjustment, type PayrollCurrent } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { fmtDay } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Badge, Card, EmptyState, Skeleton, type BadgeTone } from '../ui';
import { useReasonText } from '../finance/AdjustmentReason';

const tone: Record<string, BadgeTone> = { ESTIMATE: 'neutral', DRAFT: 'neutral', APPROVED: 'warning', PAID: 'success' };

function Adjustments({ list }: { list: Adjustment[] }) {
  const { t, i18n } = useTranslation();
  const reason = useReasonText();
  const cur = t('common.currency');
  if (list.length === 0) return <p className="py-6 text-center text-sm text-text-muted">{t('me.salary.noAdjustments')}</p>;
  return (
    <ul className="divide-y divide-border">
      {list.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', a.type === 'BONUS' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
            {a.type === 'BONUS' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{reason(a)}</p>
            <p className="text-xs text-text-muted">{fmtDay(a.createdAt.slice(0, 10), i18n.language, 'd MMM')} · {t(a.source === 'ATTENDANCE' ? 'finance.payroll.sourceAuto' : 'finance.payroll.sourceManual')}</p>
          </div>
          <span className={cn('tabular-nums', a.type === 'BONUS' ? 'text-success' : 'text-danger')}>{a.type === 'BONUS' ? '+' : '−'}{formatMoney(a.amount, cur)}</span>
        </li>
      ))}
    </ul>
  );
}

function CurrentMonth({ c }: { c: PayrollCurrent }) {
  const { t, i18n } = useTranslation();
  const cur = t('common.currency');
  const money = (n: number) => formatMoney(n, cur);
  return (
    <Card className="space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-text-muted">{t('me.salary.thisMonth')}</p>
          <p className="text-xl capitalize">{fmtDay(`${c.period}-01`, i18n.language, 'LLLL yyyy')}</p>
        </div>
        <Badge tone={tone[c.status] ?? 'neutral'}>{c.status === 'ESTIMATE' || c.status === 'DRAFT' ? t('me.salary.estimate') : t(`finance.payroll.statuses.${c.status}`)}</Badge>
      </div>
      <div>
        <p className="text-sm text-text-muted">{t('me.salary.toReceive')}</p>
        <p className="mt-1 text-4xl tabular-nums tracking-tight sm:text-5xl">{money(c.total)}</p>
        {c.status === 'ESTIMATE' || c.status === 'DRAFT' ? <p className="mt-2 text-sm text-text-muted">{t('me.salary.estimateNote')}</p> : null}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-surface-muted p-4"><dt className="text-xs text-text-muted">{t('finance.payroll.base')}</dt><dd className="mt-1 text-sm tabular-nums sm:text-base">{money(c.baseSalary)}</dd></div>
        <div className="rounded-2xl bg-success/10 p-4"><dt className="text-xs text-text-muted">{t('finance.payroll.bonus')}</dt><dd className="mt-1 text-sm tabular-nums text-success sm:text-base">+{money(c.bonusTotal)}</dd></div>
        <div className="rounded-2xl bg-danger/10 p-4"><dt className="text-xs text-text-muted">{t('finance.payroll.fine')}</dt><dd className="mt-1 text-sm tabular-nums text-danger sm:text-base">−{money(c.fineTotal)}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
        <span>{t('finance.payroll.workedDays')}: <b className="font-normal text-text">{c.workedDays}</b></span>
        <span>{t('finance.payroll.lateCount')}: <b className="font-normal text-text">{c.lateCount}</b></span>
        <span>{t('finance.payroll.absentCount')}: <b className="font-normal text-text">{c.absentCount}</b></span>
      </div>
    </Card>
  );
}

/** Own salary: this month's live estimate, every fine/bonus with its reason, and the history of past months. */
export function MySalary() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({ queryKey: ['payroll', 'mine'], queryFn: financeApi.payrollMine });
  const [open, setOpen] = useState<string | null>(null);
  const cur = t('common.currency');
  const money = (n: number) => formatMoney(n, cur);

  if (isLoading || !data) return <Skeleton className="h-96 rounded-3xl" />;
  const past = data.items.filter((p) => p.period !== data.current.period);
  return (
    <div className="space-y-6">
      <CurrentMonth c={data.current} />
      <Card className="rounded-3xl">
        <h3 className="mb-1 text-lg">{t('me.salary.adjustments')}</h3>
        <Adjustments list={data.current.adjustments} />
      </Card>
      <div>
        <h3 className="mb-3 text-lg">{t('me.salary.history')}</h3>
        {past.length === 0 ? <EmptyState icon={Banknote} title={t('finance.payroll.noPayslips')} /> : (
          <div className="space-y-3">
            {past.map((p) => {
              const isOpen = open === p.id;
              return (
                <Card key={p.id} className="rounded-2xl p-0">
                  <button type="button" className="flex w-full items-center gap-4 p-5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="capitalize">{fmtDay(`${p.period}-01`, i18n.language, 'LLLL yyyy')}</p>
                      <p className="text-sm text-text-muted">{t('finance.payroll.workedDays')}: {p.workedDays}</p>
                    </div>
                    <Badge tone={tone[p.status] ?? 'neutral'}>{t(`finance.payroll.statuses.${p.status}`)}</Badge>
                    <span className="tabular-nums">{money(p.total)}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-text-muted transition', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-border p-5">
                      <dl className="grid grid-cols-3 gap-3 text-sm">
                        <div><dt className="text-text-muted">{t('finance.payroll.base')}</dt><dd className="tabular-nums">{money(p.baseSalary)}</dd></div>
                        <div><dt className="text-text-muted">{t('finance.payroll.bonus')}</dt><dd className="tabular-nums text-success">+{money(p.bonusTotal)}</dd></div>
                        <div><dt className="text-text-muted">{t('finance.payroll.fine')}</dt><dd className="tabular-nums text-danger">−{money(p.fineTotal)}</dd></div>
                      </dl>
                      {p.adjustments.length > 0 && <Adjustments list={p.adjustments} />}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
