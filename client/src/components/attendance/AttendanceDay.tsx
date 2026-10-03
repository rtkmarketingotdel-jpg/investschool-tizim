import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { attendanceApi, type AttendanceRecord } from '@/lib/attendanceApi';
import { schoolApi } from '@/lib/schoolApi';
import { todayLocal } from '@/lib/dates';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Skeleton, Table, Td, Th, Thead, Tr } from '../ui';
import { PunchCell } from './PunchCell';
import { StatusBadge } from './StatusBadge';
import { StatusDialog } from './StatusDialog';

/** Director's overview: every active employee for a chosen day, including those who have not checked in. */
export function AttendanceDay() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canEdit = user?.role !== 'TEACHER';
  const [date, setDate] = useState(todayLocal());
  const [branchId, setBranchId] = useState('');
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);
  const branches = useQuery({ queryKey: ['branches'], queryFn: schoolApi.branches });
  const { data, isLoading, isError } = useQuery({ queryKey: ['attendance', 'day', date, branchId], queryFn: () => attendanceApi.day(date, branchId), refetchInterval: 30_000 });

  const chips = data
    ? [
        [t('attendance.stats.came'), data.summary.came, ''],
        [t('attendance.status.LATE'), data.summary.late, 'text-warning'],
        [t('attendance.stats.absent'), data.summary.absent, 'text-danger'],
        [t('attendance.status.EXCUSED'), data.summary.excused, ''],
        [t('attendance.day.notYet'), data.summary.notYet, 'text-text-muted'],
        [t('attendance.day.left'), data.summary.left, ''],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52"><Input type="date" aria-label={t('attendance.date')} value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
        <div className="w-56">
          <Select aria-label={t('attendance.day.branch')} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">{t('attendance.day.allBranches')}</option>
            {branches.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>
        {date !== todayLocal() && <Button variant="ghost" onClick={() => setDate(todayLocal())}>{t('attendance.today')}</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {isLoading ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />) : chips.map(([label, value, cls]) => (
          <Card key={label as string} className="p-4">
            <p className="text-sm text-text-muted">{label}</p>
            <p className={`mt-1 text-2xl tabular-nums ${cls}`}>{value}<span className="text-sm text-text-muted"> / {data?.summary.total}</span></p>
          </Card>
        ))}
      </div>
      {data && !data.isWorkday && <p className="text-sm text-text-muted">{t('dashboard.dayOff')}</p>}

      {isLoading ? <Skeleton className="h-96" /> : isError || !data ? <EmptyState icon={Users} title={t('errors.INTERNAL_ERROR')} /> : data.rows.length === 0 ? (
        <EmptyState icon={Users} title={t('common.empty')} />
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>{t('attendance.employee')}</Th>
              <Th>{t('attendance.day.branch')}</Th>
              <Th>{t('attendance.came')}</Th>
              <Th>{t('attendance.left')}</Th>
              <Th>{t('attendance.statusCol')}</Th>
              {canEdit && <Th className="w-14"><span className="sr-only">{t('common.actions')}</span></Th>}
            </tr>
          </Thead>
          <tbody>
            {data.rows.map((r) => {
              const rec = r.record;
              return (
                <Tr key={r.user.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.user.fullName} size={40} />
                      <div className="leading-tight"><p>{r.user.fullName}</p><p className="text-[13px] text-text-muted">{r.user.position}</p></div>
                    </div>
                  </Td>
                  <Td className="text-text-muted">{r.branchName ?? '—'}</Td>
                  <Td>{rec ? <PunchCell at={rec.checkInAt} photo={rec.checkInPhotoUrl} lat={rec.checkInLat} lng={rec.checkInLng} distanceM={rec.checkInDistanceM} title={`${r.user.fullName} · ${t('attendance.came')}`} /> : <span className="text-text-muted">—</span>}</Td>
                  <Td>{rec ? <PunchCell at={rec.checkOutAt} photo={rec.checkOutPhotoUrl} lat={rec.checkOutLat} lng={rec.checkOutLng} distanceM={rec.checkOutDistanceM} title={`${r.user.fullName} · ${t('attendance.left')}`} /> : <span className="text-text-muted">—</span>}</Td>
                  <Td>
                    {rec ? <StatusBadge status={rec.status} lateMinutes={rec.lateMinutes} /> : <Badge>{t('attendance.day.notYet')}</Badge>}
                    {rec?.checkInAt && !rec.selfieSent && <p className="mt-1 text-xs text-warning">{t('attendance.selfieMissing')}</p>}
                    {rec?.note && <p className="mt-1 max-w-40 truncate text-xs text-text-muted" title={rec.note}>{rec.note}</p>}
                  </Td>
                  {canEdit && (
                    <Td>
                      {rec && <button aria-label={t('attendance.edit')} title={t('attendance.edit')} onClick={() => setEditing({ ...rec, user: { id: r.user.id, fullName: r.user.fullName, position: r.user.position } })} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>}
                    </Td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <StatusDialog record={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
