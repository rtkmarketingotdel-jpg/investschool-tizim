import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck, FlaskConical } from 'lucide-react';
import { smsApi } from '@/lib/smsApi';
import { Card } from '../ui';

/** Shows whether messages are really sent (Eskiz connected) or only simulated (demo mode). */
export function StatusBanner() {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ['sms', 'status'], queryFn: smsApi.status, refetchInterval: 120_000 });
  if (!data) return null;
  if (data.simulated) {
    return (
      <Card className="flex items-start gap-3 border-warning/40 bg-warning/10 p-4">
        <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="text-warning">{t('sms.status.demoTitle')}</p>
          <p className="text-text-muted">{t('sms.status.demoText')}</p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="flex items-center gap-3 border-success/40 bg-success/10 p-4">
      <CircleCheck className="h-5 w-5 shrink-0 text-success" />
      <p className="text-sm text-success">
        {t('sms.status.connected', { from: data.from })}
        {data.balance != null && <span className="text-text-muted"> · {t('sms.status.balance', { count: data.balance })}</span>}
      </p>
    </Card>
  );
}
