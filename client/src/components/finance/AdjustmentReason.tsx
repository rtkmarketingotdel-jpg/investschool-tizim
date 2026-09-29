import { useTranslation } from 'react-i18next';
import type { Adjustment } from '@/lib/financeApi';

/** ATTENDANCE adjustments store codes ("LATE:12", "ABSENT"); MANUAL ones are free text. */
export function useReasonText() {
  const { t } = useTranslation();
  return (a: Pick<Adjustment, 'source' | 'reason'>) => {
    if (a.source !== 'ATTENDANCE') return a.reason;
    if (a.reason.startsWith('LATE:')) return t('finance.payroll.reasonLate', { minutes: a.reason.slice(5) });
    if (a.reason === 'ABSENT') return t('finance.payroll.reasonAbsent');
    return a.reason;
  };
}
