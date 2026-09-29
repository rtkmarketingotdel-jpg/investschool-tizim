import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { AttendanceLog } from '@/components/attendance/AttendanceLog';
import { AttendanceMatrix } from '@/components/attendance/AttendanceMatrix';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';
import { Tabs } from '@/components/ui';

export default function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<'log' | 'matrix'>('log');
  const isManager = user?.role !== 'STAFF';
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px] font-semibold">{t('nav.attendance')}</h1>
        <p className="mt-1 text-text-muted">{t('attendance.subtitle')}</p>
      </div>
      <AttendanceSelf />
      {isManager && (
        <div className="space-y-6">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'log', label: t('attendance.tabs.log') }, { id: 'matrix', label: t('attendance.tabs.matrix') }]} />
          {tab === 'log' ? <AttendanceLog /> : <AttendanceMatrix />}
        </div>
      )}
    </div>
  );
}
