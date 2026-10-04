import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { InstallBanner } from '@/components/InstallApp';
import { AttendanceSelf } from '@/components/attendance/AttendanceSelf';
import { MySalary } from '@/components/me/MySalary';
import { TeacherClass } from '@/components/me/TeacherClass';
import { TeacherClubs } from '@/components/me/TeacherClubs';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { meApi } from '@/lib/meApi';

type Tab = 'attendance' | 'class' | 'clubs' | 'salary';

/** Employee cabinet. Teachers also get their class (full roster + parent contacts) and the clubs they lead. */
export default function Me() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teaching = useQuery({ queryKey: ['me', 'teaching'], queryFn: meApi.teaching });
  const [tab, setTab] = useState<Tab>('attendance');
  const tr = teaching.data;
  const showClass = !!tr && (tr.isTeacher || tr.classes.length > 0);
  const showClubs = !!tr && tr.clubs.length > 0;
  if (user?.role === 'DIRECTOR') return <Navigate to="/" replace />; // the director supervises and is not tracked

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'attendance', label: t('me.tabs.attendance') },
    ...(showClass ? [{ id: 'class' as const, label: tr!.classes.length > 1 ? t('me.tabs.classes', { count: tr!.classes.length }) : t('me.tabs.class') }] : []),
    ...(showClubs ? [{ id: 'clubs' as const, label: t('me.tabs.clubs') }] : []),
    { id: 'salary', label: t('me.tabs.salary') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.me')} subtitle={tr?.subject ? `${user?.fullName ?? ''} · ${tr.position}` : (user?.fullName ?? '')} />
      <InstallBanner />
      <div className="overflow-x-auto"><Tabs value={tab} onChange={setTab} tabs={tabs} /></div>
      {tab === 'attendance' && <AttendanceSelf />}
      {tab === 'class' && (teaching.isLoading ? <Skeleton className="h-96 rounded-xl" /> : <TeacherClass classes={tr?.classes ?? []} />)}
      {tab === 'clubs' && <TeacherClubs clubs={tr?.clubs ?? []} />}
      {tab === 'salary' && <MySalary />}
    </div>
  );
}
