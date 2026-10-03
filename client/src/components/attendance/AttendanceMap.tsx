import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { attendanceApi } from '@/lib/attendanceApi';
import { Card, EmptyState, Skeleton } from '../ui';
import { LiveMap } from '../maps/LiveMap';
import { MapPinOff } from 'lucide-react';

export function AttendanceMap() {
  const { t } = useTranslation();
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({ queryKey: ['attendance', 'map'], queryFn: attendanceApi.map, refetchInterval: 20_000 });
  if (isLoading) return <Skeleton className="h-[520px]" />;
  if (isError || !data) return <EmptyState icon={MapPinOff} title={t('errors.INTERNAL_ERROR')} />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4"><p className="text-sm text-text-muted">{t('attendance.map.onSite')}</p><p className="mt-1 text-2xl tabular-nums">{data.counts.onSite}</p></Card>
        <Card className="p-4"><p className="text-sm text-text-muted">{t('attendance.map.left')}</p><p className="mt-1 text-2xl tabular-nums">{data.counts.left}</p></Card>
      </div>
      <LiveMap branches={data.branches} points={data.points} />
      <p className="text-xs text-text-muted">
        {t('attendance.map.hint')} · {t('attendance.map.updated', { time: new Date(dataUpdatedAt).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', second: '2-digit' }) })}
      </p>
    </div>
  );
}
