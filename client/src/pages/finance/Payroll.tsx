import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, Calculator, CheckCircle2, Download, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorCode } from '@/lib/api';
import { downloadCsv, financeApi, type PayrollRow, type PayrollStatus } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { todayLocal, fmtDay } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { AdjustmentDialog } from '@/components/finance/AdjustmentDialog';
import { useReasonText } from '@/components/finance/AdjustmentReason';
import { Avatar, Badge, Button, Card, Drawer, EmptyState, Input, Skeleton, Table, Td, Th, Thead, Tr, useToast, type BadgeTone } from '@/components/ui';

export const payrollTone: Record<PayrollStatus, BadgeTone> = { DRAFT: 'neutral', APPROVED: 'warning', PAID: 'success' };

export default function Payroll() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const reasonText = useReasonText();
  const [period, setPeriod] = useState(todayLocal().slice(0, 7));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<{ userId: string; name: string } | null>(null);

  const list = useQuery({ queryKey: ['payroll', period], queryFn: () => financeApi.payroll(period) });
  const detail = useQuery({ queryKey: ['payroll-detail', detailId], queryFn: () => financeApi.payrollDetail(detailId!), enabled: !!detailId });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['payroll'] }); void qc.invalidateQueries({ queryKey: ['payroll-detail'] }); void qc.invalidateQueries({ queryKey: ['notifications'] }); };
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');

  const calc = useMutation({ mutationFn: () => financeApi.calculatePayroll(period), onSuccess: (r) => { toast(t('finance.payroll.calculated', r)); refresh(); }, onError: fail });
  const approve = useMutation({ mutationFn: financeApi.approvePayroll, onSuccess: () => { toast(t('finance.payroll.approvedToast')); refresh(); }, onError: fail });
  const pay = useMutation({ mutationFn: financeApi.payPayroll, onSuccess: () => { toast(t('finance.payroll.paidToast')); refresh(); }, onError: fail });

  const cur = t('common.currency');
  const rows = list.data?.items ?? [];
  const isDirector = user?.role === 'DIRECTOR';
  const money = (n: number) => formatMoney(n, cur);
  const dr = detail.data;
  const locked = dr ? dr.status !== 'DRAFT' : true;

  const actions = (r: PayrollRow) => (
    <>
      {isDirector && r.status === 'DRAFT' && <Button className="px-3 py-1.5 text-sm" onClick={(e) => { e.stopPropagation(); approve.mutate(r.id); }} loading={approve.isPending && approve.variables === r.id}>{t('finance.payroll.approve')}</Button>}
      {r.status === 'APPROVED' && <Button variant="secondary" className="px-3 py-1.5 text-sm" onClick={(e) => { e.stopPropagation(); pay.mutate(r.id); }} loading={pay.isPending && pay.variables === r.id}><CheckCircle2 className="h-4 w-4" /> {t('finance.payroll.markPaid')}</Button>}
    </>
  );

  return (
    <div>
      <PageHeader
        title={t('nav.payroll')}
        subtitle={t('finance.payroll.subtitle')}
        action={
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-52"><Input type="month" aria-label={t('finance.payments.period')} value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></div>
            <Button variant="secondary" onClick={() => void downloadCsv('/payroll/export', `payroll-${period}.csv`, { period })}><Download className="h-5 w-5" /> CSV</Button>
            <Button onClick={() => calc.mutate()} loading={calc.isPending}><Calculator className="h-5 w-5" /> {t('finance.payroll.calculate')}</Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-text-muted">{t('finance.payroll.total')}</p><p className="mt-1 text-2xl font-medium tabular-nums">{money(list.data?.summary.total ?? 0)}</p></Card>
        <Card><p className="text-text-muted">{t('finance.payroll.bonus')}</p><p className="mt-1 text-2xl font-medium tabular-nums text-green-600">{money(list.data?.summary.bonus ?? 0)}</p></Card>
        <Card><p className="text-text-muted">{t('finance.payroll.fine')}</p><p className="mt-1 text-2xl font-medium tabular-nums text-red-600">{money(list.data?.summary.fine ?? 0)}</p></Card>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-96" />
      ) : list.isError ? (
        <EmptyState icon={Banknote} title={t('errors.INTERNAL_ERROR')} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Banknote} title={t('finance.payroll.empty')} text={t('finance.payroll.emptyHint')} action={<Button onClick={() => calc.mutate()} loading={calc.isPending}><Calculator className="h-5 w-5" /> {t('finance.payroll.calculate')}</Button>} />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{t('attendance.employee')}</Th>
              <Th numeric>{t('finance.payroll.base')}</Th>
              <Th numeric>{t('finance.payroll.bonus')}</Th>
              <Th numeric>{t('finance.payroll.fine')}</Th>
              <Th numeric>{t('finance.payroll.totalCol')}</Th>
              <Th>{t('attendance.statusCol')}</Th>
              <Th><span className="sr-only">{t('common.actions')}</span></Th>
            </tr>
          </Thead>
          <tbody>
            {rows.map((r) => (
              <Tr key={r.id} className="cursor-pointer" onClick={() => setDetailId(r.id)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={r.fullName} size={40} />
                    <div><p className="font-medium">{r.fullName}</p><p className="text-[13px] text-text-muted">{r.position}</p></div>
                  </div>
                </Td>
                <Td numeric>{money(r.baseSalary)}</Td>
                <Td numeric className="text-green-600">{r.bonusTotal ? `+${money(r.bonusTotal)}` : '—'}</Td>
                <Td numeric className="text-red-600">{r.fineTotal ? `−${money(r.fineTotal)}` : '—'}</Td>
                <Td numeric className="font-medium">{money(r.total)}</Td>
                <Td><Badge tone={payrollTone[r.status]}>{t(`finance.payroll.statuses.${r.status}`)}</Badge></Td>
                <Td><div className="flex justify-end gap-2">{actions(r)}</div></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Drawer open={!!detailId} onClose={() => setDetailId(null)} title={dr?.fullName ?? t('finance.payroll.details')}>
        {!dr ? <Skeleton className="h-40" /> : (
          <div className="space-y-6">
            <div className="flex items-center gap-3"><Avatar name={dr.fullName} size={48} /><div><p className="font-medium">{dr.fullName}</p><p className="text-sm text-text-muted">{dr.position} · {dr.period}</p></div><Badge tone={payrollTone[dr.status]}>{t(`finance.payroll.statuses.${dr.status}`)}</Badge></div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
              {([['base', money(dr.baseSalary)], ['bonus', money(dr.bonusTotal)], ['fine', money(dr.fineTotal)], ['totalCol', money(dr.total)], ['worked', String(dr.workedDays)], ['late', String(dr.lateCount)], ['absent', String(dr.absentCount)]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-sm text-text-muted">{t(k === 'worked' ? 'finance.payroll.workedDays' : k === 'late' ? 'finance.payroll.lateCount' : k === 'absent' ? 'finance.payroll.absentCount' : `finance.payroll.${k}`)}</dt><dd className="font-medium tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{t('finance.payroll.adjustments')}</h3>
                <Button variant="secondary" className="px-3 py-1.5 text-sm" disabled={locked} onClick={() => setAdjust({ userId: dr.userId, name: dr.fullName })}><Plus className="h-4 w-4" /> {t('finance.payroll.addAdjustment')}</Button>
              </div>
              {locked && <p className="mb-2 text-sm text-text-muted">{t('finance.payroll.lockedHint')}</p>}
              {dr.adjustments.length === 0 ? <p className="py-6 text-center text-text-muted">{t('common.empty')}</p> : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {dr.adjustments.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 p-3">
                      <div><p className="text-sm font-medium">{reasonText(a)}</p><p className="text-xs text-text-muted">{fmtDay(a.createdAt.slice(0, 10), i18n.language, 'd MMM')} · {t(a.source === 'ATTENDANCE' ? 'finance.payroll.sourceAuto' : 'finance.payroll.sourceManual')}</p></div>
                      <span className={a.type === 'BONUS' ? 'font-medium tabular-nums text-green-600' : 'font-medium tabular-nums text-red-600'}>{a.type === 'BONUS' ? '+' : '−'}{money(a.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Drawer>
      <AdjustmentDialog target={adjust} period={period} onClose={() => setAdjust(null)} onDone={refresh} />
    </div>
  );
}
