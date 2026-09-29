import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorCode } from '@/lib/api';
import { financeApi } from '@/lib/financeApi';
import { Button, Input, Modal, Select, useToast } from '../ui';

interface Props {
  target: { userId: string; name: string } | null;
  period: string;
  onClose: () => void;
  onDone: () => void;
}

export function AdjustmentDialog({ target, period, onClose, onDone }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [type, setType] = useState<'BONUS' | 'FINE'>('BONUS');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (target) { setType('BONUS'); setAmount(''); setReason(''); setError(''); } }, [target]);

  const save = useMutation({
    mutationFn: () => financeApi.addAdjustment({ userId: target!.userId, period, type, amount: Number(amount), reason: reason.trim() }),
    onSuccess: () => { toast(t('finance.payroll.adjustmentAdded')); onDone(); onClose(); },
    onError: (e) => setError(t(`errors.${errorCode(e)}`, { defaultValue: t('errors.INTERNAL_ERROR') })),
  });
  const valid = Number(amount) >= 1000 && reason.trim().length >= 3;

  return (
    <Modal open={!!target} onClose={onClose} title={`${t('finance.payroll.addAdjustment')} · ${target?.name ?? ''}`}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(''); if (valid) save.mutate(); }}>
        <Select label={t('finance.payroll.type')} value={type} onChange={(e) => setType(e.target.value as 'BONUS' | 'FINE')}>
          <option value="BONUS">{t('finance.payroll.bonus')}</option>
          <option value="FINE">{t('finance.payroll.fine')}</option>
        </Select>
        <Input type="number" min={1000} step={1000} label={`${t('finance.payments.amount')} (${t('common.currency')})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label={t('finance.payroll.reason')} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" className="flex-1" disabled={!valid} loading={save.isPending}>{t('common.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
