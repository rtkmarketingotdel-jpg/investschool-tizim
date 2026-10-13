import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Settings } from '@/lib/financeApi';
import { Button, Card, Input } from '../ui';
import { numOrNaN, useSaveSettings } from './shared';

export function PaymentsTab({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const save = useSaveSettings();
  const [days, setDays] = useState(String(settings.paymentDueDays));
  const [prefix, setPrefix] = useState(settings.contractPrefix);
  const valid = Number.isInteger(numOrNaN(days)) && numOrNaN(days) >= 0 && numOrNaN(days) <= 365 && /^[A-Za-z0-9]{1,6}$/.test(prefix);
  return (
    <Card className="max-w-2xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" min={0} max={365} label={t('settings.payments.dueDays')} value={days} onChange={(e) => setDays(e.target.value)} />
        <Input label={t('settings.payments.prefix')} maxLength={6} value={prefix} onChange={(e) => setPrefix(e.target.value)} />
      </div>
      <p className="text-sm text-text-muted">{t('settings.payments.hint')}</p>
      <Button disabled={!valid} loading={save.isPending} onClick={() => save.mutate({ paymentDueDays: Number(days), contractPrefix: prefix })}>{t('common.save')}</Button>
    </Card>
  );
}
