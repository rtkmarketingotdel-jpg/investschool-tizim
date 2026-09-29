import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { AttendanceLog } from '@/components/attendance/AttendanceLog';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';

export default function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isManager = user?.role !== 'STAFF';
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px] font-semibold">{t('nav.attendance')}</h1>
        <p className="mt-1 text-text-muted">{t('attendance.subtitle')}</p>
      </div>
      <AttendanceSelf />
      {isManager && <AttendanceLog />}
    </div>
  );
}
