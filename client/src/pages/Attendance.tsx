import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, isManagement } from '@/context/AuthContext';
import { AttendanceDay } from '@/components/attendance/AttendanceDay';
import { AttendanceLog } from '@/components/attendance/AttendanceLog';
import { AttendanceMap } from '@/components/attendance/AttendanceMap';
import { AttendanceMatrix } from '@/components/attendance/AttendanceMatrix';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';
import { Tabs } from '@/components/ui';

type Tab = 'day' | 'map' | 'log' | 'matrix';

export default function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('day');
  const isManager = isManagement(user?.role);
  // The director supervises everyone else and does not check in himself.
  const tracked = user?.role !== 'DIRECTOR';
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px]">{t('nav.attendance')}</h1>
        <p className="mt-1 text-text-muted">{t('attendance.subtitle')}</p>
      </div>
      {isManager && (
        <div className="space-y-6">
          <Tabs value={tab} onChange={setTab} tabs={(['day', 'map', 'log', 'matrix'] as Tab[]).map((id) => ({ id, label: t(`attendance.tabs.${id}`) }))} />
          {tab === 'day' && <AttendanceDay />}
          {tab === 'map' && <AttendanceMap />}
          {tab === 'log' && <AttendanceLog />}
          {tab === 'matrix' && <AttendanceMatrix />}
        </div>
      )}
      {tracked && (
        <div className="space-y-4">
          {isManager && <h2 className="text-xl">{t('attendance.mine')}</h2>}
          <AttendanceSelf />
        </div>
      )}
    </div>
  );
}
