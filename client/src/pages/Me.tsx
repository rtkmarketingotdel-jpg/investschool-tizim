import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { InstallBanner } from '@/components/InstallApp';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';
import { MySalary } from '@/components/me/MySalary';
import { TeacherGroups } from '@/components/me/TeacherGroups';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { meApi } from '@/lib/meApi';

type Tab = 'attendance' | 'groups' | 'salary';

/** Employee cabinet. Teachers also get the groups they lead (schedule, full roster and contacts). */
export default function Me() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teaching = useQuery({ queryKey: ['me', 'teaching'], queryFn: meApi.teaching });
  const [tab, setTab] = useState<Tab>('attendance');
  const tr = teaching.data;
  const showGroups = !!tr && (tr.isTeacher || tr.groups.length > 0);
  if (user?.role === 'DIRECTOR') return <Navigate to="/" replace />; // the director supervises and is not tracked

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'attendance', label: t('me.tabs.attendance') },
    ...(showGroups ? [{ id: 'groups' as const, label: t('me.tabs.groups', { count: tr!.groups.length }) }] : []),
    { id: 'salary', label: t('me.tabs.salary') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.me')} subtitle={tr?.specialty ? `${user?.fullName ?? ''} · ${tr.position}` : (user?.fullName ?? '')} />
      <InstallBanner />
      <div className="overflow-x-auto"><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>
      {tab === 'attendance' && <AttendanceSelf />}
      {tab === 'groups' && (teaching.isLoading ? <Skeleton className="h-96 rounded-xl" /> : <TeacherGroups groups={tr?.groups ?? []} />)}
      {tab === 'salary' && <MySalary />}
    </div>
  );
}
