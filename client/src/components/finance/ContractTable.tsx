import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ban, Copy, Eye, Send } from 'lucide-react';
import { errorCode } from '@/lib/api';
import { financeApi, openPdf, type ContractRow, type ContractStatus } from '@/lib/financeApi';
import { formatMoney } from '@/lib/format';
import { fmtDay } from '@/lib/dates';
import { Badge, Table, Td, Th, Thead, Tr, useToast, type BadgeTone } from '../ui';

export const contractTone: Record<ContractStatus, BadgeTone> = { DRAFT: 'neutral', SENT: 'warning', SIGNED: 'success', CANCELLED: 'danger' };

export function ContractTable({ rows }: { rows: ContractRow[] }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['contracts'] });
  const fail = (e: unknown) => toast(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') }), 'error');
  const send = useMutation({ mutationFn: financeApi.sendContract, onSuccess: (c) => { void done(); void copyLink(c.publicToken, true); }, onError: fail });
  const cancel = useMutation({ mutationFn: financeApi.cancelContract, onSuccess: () => { void done(); toast(t('finance.contracts.cancelled')); }, onError: fail });

  async function copyLink(token: string, afterSend = false) {
    await navigator.clipboard.writeText(`${location.origin}/c/${token}`);
    toast(t(afterSend ? 'finance.contracts.sentCopied' : 'finance.contracts.linkCopied'));
  }
  const cur = t('common.currency');

  return (
    <Table>
      <Thead>
        <tr>
          <Th>{t('finance.contracts.number')}</Th>
          <Th>{t('finance.payments.student')}</Th>
          <Th>{t('students.parentName')}</Th>
          <Th numeric>{t('students.monthlyFee')}</Th>
          <Th>{t('finance.contracts.term')}</Th>
          <Th>{t('attendance.statusCol')}</Th>
          <Th>{t('finance.contracts.actions')}</Th>
        </tr>
      </Thead>
      <tbody>
        {rows.map((c) => (
          <Tr key={c.id}>
            <Td className="whitespace-nowrap font-medium">{c.number}</Td>
            <Td>{c.studentName}</Td>
            <Td className="text-text-muted">{c.parentName}</Td>
            <Td numeric>{formatMoney(c.monthlyFee, cur)}</Td>
            <Td className="whitespace-nowrap text-sm text-text-muted">{fmtDay(c.startDate, i18n.language, 'dd.MM.yy')} – {fmtDay(c.endDate, i18n.language, 'dd.MM.yy')}</Td>
            <Td>
              <Badge tone={contractTone[c.status]}>{t(`finance.contracts.statuses.${c.status}`)}</Badge>
              {c.demoCode && <p className="mt-1 text-xs text-text-muted">{t('finance.contracts.demoCode')}: <b className="tracking-widest">{c.demoCode}</b></p>}
            </Td>
            <Td>
              <div className="flex gap-1">
                <button aria-label={t('finance.contracts.viewPdf')} title={t('finance.contracts.viewPdf')} onClick={() => void openPdf(`/contracts/${c.id}/pdf`).catch(fail)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Eye className="h-4 w-4" /></button>
                {c.status === 'DRAFT' && <button aria-label={t('finance.contracts.send')} title={t('finance.contracts.send')} onClick={() => send.mutate(c.id)} className="rounded-lg p-2 text-primary hover:bg-surface-muted"><Send className="h-4 w-4" /></button>}
                {(c.status === 'SENT' || c.status === 'SIGNED') && <button aria-label={t('finance.contracts.copyLink')} title={t('finance.contracts.copyLink')} onClick={() => void copyLink(c.publicToken)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Copy className="h-4 w-4" /></button>}
                {c.status !== 'CANCELLED' && <button aria-label={t('finance.contracts.cancel')} title={t('finance.contracts.cancel')} onClick={() => window.confirm(t('finance.contracts.cancelConfirm', { number: c.number })) && cancel.mutate(c.id)} className="rounded-lg p-2 text-red-600 hover:bg-surface-muted"><Ban className="h-4 w-4" /></button>}
              </div>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
