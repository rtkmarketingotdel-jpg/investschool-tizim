import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ClipboardList, Pencil } from 'lucide-react';
import { attendanceApi, type AttendanceRecord } from '@/lib/attendanceApi';
import { StatusDialog } from './StatusDialog';
import { fmtDay } from '@/lib/dates';
import { Avatar, Button, Card, EmptyState, Input, Skeleton, Table, Td, Th, Thead, Tr } from '../ui';
import { PunchCell } from './PunchCell';
import { StatusBadge } from './StatusBadge';

const LIMIT = 20;

/** Monitoring view for managers: every check-in/out with time, selfie and distance. */
export function AttendanceLog() {
  const { t, i18n } = useTranslation();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance', 'log', from, to, page],
    queryFn: () => attendanceApi.list({ from: from || undefined, to: to || undefined, page, limit: LIMIT }),
    refetchInterval: 60_000,
  });

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;
  const cards = data
    ? [
        { label: t('attendance.stats.came'), value: data.today.workers },
        { label: t('attendance.stats.late'), value: data.today.late },
        { label: t('attendance.stats.absent'), value: data.today.absent },
        { label: t('attendance.stats.excused'), value: data.today.excused },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('attendance.logTitle')}</h2>
        <p className="text-text-muted">{t('attendance.logSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
          : cards.map((c) => (
              <Card key={c.label} className="p-5">
                <p className="text-sm text-text-muted">{t('attendance.today')} · {c.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{c.value}</p>
              </Card>
            ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Input type="date" label={t('attendance.from')} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="w-44">
          <Input type="date" label={t('attendance.to')} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        {(from || to) && (
          <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>
            {t('attendance.reset')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : isError ? (
        <EmptyState icon={ClipboardList} title={t('errors.INTERNAL_ERROR')} />
      ) : data && data.items.length > 0 ? (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>{t('attendance.date')}</Th>
                <Th>{t('attendance.employee')}</Th>
                <Th>{t('attendance.came')}</Th>
                <Th>{t('attendance.left')}</Th>
                <Th>{t('attendance.statusCol')}</Th>
                <Th className="w-16"><span className="sr-only">{t('common.actions')}</span></Th>
              </tr>
            </Thead>
            <tbody>
              {data.items.map((r) => (
                <Tr key={r.id}>
                  <Td>{fmtDay(r.date, i18n.language, 'd-MMM')}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={r.user?.fullName ?? '?'} size={40} />
                      <div className="leading-tight">
                        <p className="font-medium">{r.user?.fullName}</p>
                        <p className="text-[13px] text-text-muted">{r.user?.position}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><PunchCell at={r.checkInAt} photo={r.checkInPhotoUrl} lat={r.checkInLat} lng={r.checkInLng} distanceM={r.checkInDistanceM} title={`${r.user?.fullName} · ${t('attendance.came')}`} /></Td>
                  <Td><PunchCell at={r.checkOutAt} photo={r.checkOutPhotoUrl} lat={r.checkOutLat} lng={r.checkOutLng} distanceM={r.checkOutDistanceM} title={`${r.user?.fullName} · ${t('attendance.left')}`} /></Td>
                  <Td>
                    <StatusBadge status={r.status} lateMinutes={r.lateMinutes} />
                    {r.note && <p className="mt-1 max-w-40 truncate text-xs text-text-muted" title={r.note}>{r.note}</p>}
                  </Td>
                  <Td>
                    <button aria-label={t('attendance.edit')} title={t('attendance.edit')} onClick={() => setEditing(r)} className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"><Pencil className="h-4 w-4" /></button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">{t('attendance.total', { count: data.total })}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="px-3 py-2" aria-label={t('attendance.prev')} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm tabular-nums">{page} / {pages}</span>
              <Button variant="secondary" className="px-3 py-2" aria-label={t('attendance.next')} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={ClipboardList} title={t('common.empty')} />
      )}
      <StatusDialog record={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
