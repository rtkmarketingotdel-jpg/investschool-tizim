import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote } from 'lucide-react';
import { financeApi } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { fmtDay } from '@/lib/dates';
import { cn } from '@/lib/cn';
import { Badge, Card, EmptyState, Skeleton } from '../ui';
import { useReasonText } from '../finance/AdjustmentReason';

export function MyPayslips() {
  const { t, i18n } = useTranslation();
  const reasonText = useReasonText();
  const { data, isLoading } = useQuery({ queryKey: ['payroll', 'mine'], queryFn: financeApi.payrollMine });
  const [open, setOpen] = useState<string | null>(null);
  const cur = t('common.currency');
  const money = (n: number) => formatMoney(n, cur);
  const tone = { DRAFT: 'neutral', APPROVED: 'warning', PAID: 'success' } as const;

  return (
    <div>
      <h2 className="mb-3 text-xl font-medium">{t('finance.payroll.mine')}</h2>
      {isLoading ? <Skeleton className="h-40" /> : !data?.length ? <EmptyState icon={Banknote} title={t('finance.payroll.noPayslips')} /> : (
        <div className="space-y-3">
          {data.map((p) => {
            const isOpen = open === p.id;
            return (
              <Card key={p.id} className="p-0">
                <button className="flex w-full items-center gap-4 p-5 text-left" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
                  <div className="flex-1">
                    <p className="font-medium">{fmtDay(`${p.period}-01`, i18n.language, 'LLLL yyyy')}</p>
                    <p className="text-sm text-text-muted">{t('finance.payroll.workedDays')}: {p.workedDays}</p>
                  </div>
                  <Badge tone={tone[p.status]}>{t(`finance.payroll.statuses.${p.status}`)}</Badge>
                  <span className="text-lg font-medium tabular-nums">{money(p.total)}</span>
                </button>
                {isOpen && (
                  <div className={cn('space-y-3 border-t border-border p-5')}>
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                      <div><dt className="text-text-muted">{t('finance.payroll.base')}</dt><dd className="font-medium tabular-nums">{money(p.baseSalary)}</dd></div>
                      <div><dt className="text-text-muted">{t('finance.payroll.bonus')}</dt><dd className="font-medium tabular-nums text-green-600">{money(p.bonusTotal)}</dd></div>
                      <div><dt className="text-text-muted">{t('finance.payroll.fine')}</dt><dd className="font-medium tabular-nums text-red-600">{money(p.fineTotal)}</dd></div>
                    </dl>
                    {p.adjustments.length > 0 && (
                      <ul className="divide-y divide-border rounded-xl border border-border">
                        {p.adjustments.map((a) => (
                          <li key={a.id} className="flex justify-between gap-3 p-3 text-sm">
                            <span>{reasonText(a)}</span>
                            <span className={a.type === 'BONUS' ? 'font-medium tabular-nums text-green-600' : 'font-medium tabular-nums text-red-600'}>{a.type === 'BONUS' ? '+' : '−'}{money(a.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
