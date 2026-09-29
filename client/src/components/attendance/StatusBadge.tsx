import { useTranslation } from 'react-i18next';
import type { AttendanceStatus } from '@/lib/attendanceApi';
import { Badge, type BadgeTone } from '../ui';

const tone: Record<AttendanceStatus, BadgeTone> = {
  ON_TIME: 'success',
  LATE: 'warning',
  ABSENT: 'danger',
  EXCUSED: 'neutral',
};

export function StatusBadge({ status, lateMinutes }: { status: AttendanceStatus; lateMinutes?: number }) {
  const { t } = useTranslation();
  return (
    <Badge tone={tone[status]}>
      {t(`attendance.status.${status}`)}
      {status === 'LATE' && lateMinutes ? ` · ${lateMinutes} ${t('attendance.min')}` : ''}
    </Badge>
  );
}
