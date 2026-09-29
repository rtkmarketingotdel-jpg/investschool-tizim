import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { attendanceApi, type AttendanceRecord } from '@/lib/attendanceApi';
import { errorCode } from '@/lib/api';
import { fmtDay, fmtTime, todayLocal } from '@/lib/dates';
import { Button, Card, EmptyState, Skeleton, Table, Td, Th, Thead, Tr, useToast } from '../ui';
import { CameraCapture } from './CameraCapture';
import { LocationStep, type Fix } from './LocationStep';
import { PunchCell } from './PunchCell';
import { StatusBadge } from './StatusBadge';
import axios from 'axios';

export function AttendanceSelf() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'in' | 'out' | null>(null);
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState<'in' | 'out' | null>(null);

  const today = useQuery({ queryKey: ['attendance', 'today'], queryFn: attendanceApi.today });
  const month = todayLocal().slice(0, 7);
  const mine = useQuery({ queryKey: ['attendance', 'mine', month], queryFn: () => attendanceApi.mine(month) });

  const punch = useMutation({
    mutationFn: (p: Parameters<typeof attendanceApi.checkIn>[0]) =>
      mode === 'in' ? attendanceApi.checkIn(p) : attendanceApi.checkOut(p),
    onSuccess: (r) => {
      const base = t(mode === 'in' ? 'attendance.checkedInToast' : 'attendance.checkedOutToast');
      toast(r.selfie === 'sent' ? `${base}. ${t('attendance.selfieSent')}` : `${base}. ${t('attendance.selfieNotSent')}`);
      setMode(null);
      void qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (e) => {
      const code = errorCode(e);
      const details = axios.isAxiosError(e) ? (e.response?.data?.details ?? {}) : {};
      toast(String(t(`errors.${code}`, { defaultValue: t('errors.INTERNAL_ERROR'), ...(details as Record<string, string | number>) })), 'error');
      if (code !== 'ATTENDANCE_BAD_TIMESTAMP' && code !== 'ATTENDANCE_INVALID_PHOTO') setMode(null);
    },
  });

  const rec = today.data?.record ?? null;
  const st = today.data?.settings;
  const done = !!rec?.checkOutAt;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-text-muted">{t('attendance.hello', { name: user?.fullName.split(' ')[1] ?? user?.fullName })}</p>
          <p className="mt-1 text-xl font-medium">{fmtDay(todayLocal(), i18n.language, 'd MMMM, EEEE')}</p>
          {st && <p className="mt-1 text-text-muted">{t('attendance.workHours')}: {st.workStart}–{st.workEnd}</p>}
          <div className="mt-4">
            {today.isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : !rec?.checkInAt ? (
              <p className="text-lg font-medium text-text-muted">{t('attendance.notMarked')}</p>
            ) : (
              <div className="space-y-1 text-lg font-medium">
                <p className="flex items-center gap-3">
                  {t('attendance.cameAt', { time: fmtTime(rec.checkInAt) })}
                  <StatusBadge status={rec.status} lateMinutes={rec.lateMinutes} />
                </p>
                {rec.checkOutAt && <p>{t('attendance.leftAt', { time: fmtTime(rec.checkOutAt) })}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 py-4 text-lg md:flex-none md:px-10"
            disabled={!!rec?.checkInAt || today.isLoading}
            onClick={() => setLocating('in')}
          >
            <LogIn className="h-5 w-5" /> {t('attendance.checkIn')}
          </Button>
          <Button
            variant="secondary"
            className="flex-1 py-4 text-lg md:flex-none md:px-10"
            disabled={!rec?.checkInAt || done}
            onClick={() => setLocating('out')}
          >
            <LogOut className="h-5 w-5" /> {t('attendance.checkOut')}
          </Button>
        </div>
      </Card>

      <LocationStep
        open={locating !== null}
        branches={today.data?.branches ?? []}
        geoEnforced={today.data?.settings.geoEnforced ?? false}
        maxAccuracyM={today.data?.settings.maxGpsAccuracyM ?? 100}
        onCancel={() => setLocating(null)}
        onConfirm={(f) => { setFix(f); setMode(locating); setLocating(null); }}
      />
      <CameraCapture
        open={mode !== null}
        submitting={punch.isPending}
        onCancel={() => setMode(null)}
        onSubmit={(photo, capturedAt) => fix && punch.mutate({ photo, capturedAt, ...fix })}
      />

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {(['onTime', 'late', 'absent'] as const).map((k) => (
          <Card key={k} className="p-4 md:p-6">
            <p className="text-sm text-text-muted">{t(`attendance.stats.${k}`)}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums md:text-3xl">{mine.data?.stats[k] ?? '–'}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-xl font-medium">{t('attendance.myHistory')}</h2>
        {mine.isLoading ? (
          <Skeleton className="h-40" />
        ) : mine.data && mine.data.records.length > 0 ? (
          <>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface md:hidden">
            {mine.data.records.map((r: AttendanceRecord) => (
              <li key={r.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{fmtDay(r.date, i18n.language, 'd-MMM, EEE')}</span>
                  <StatusBadge status={r.status} lateMinutes={r.lateMinutes} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-text-muted">{t('attendance.came')}</p>
                    <PunchCell at={r.checkInAt} photo={r.checkInPhotoUrl} lat={r.checkInLat} lng={r.checkInLng} distanceM={r.checkInDistanceM} title={t('attendance.came')} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-text-muted">{t('attendance.left')}</p>
                    <PunchCell at={r.checkOutAt} photo={r.checkOutPhotoUrl} lat={r.checkOutLat} lng={r.checkOutLng} distanceM={r.checkOutDistanceM} title={t('attendance.left')} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
  <Table>
              <Thead>
                <tr>
                  <Th>{t('attendance.date')}</Th>
                  <Th>{t('attendance.came')}</Th>
                  <Th>{t('attendance.left')}</Th>
                  <Th>{t('attendance.statusCol')}</Th>
                </tr>
              </Thead>
              <tbody>
                {mine.data.records.map((r: AttendanceRecord) => (
                  <Tr key={r.id}>
                    <Td>{fmtDay(r.date, i18n.language, 'd-MMM')}</Td>
                    <Td><PunchCell at={r.checkInAt} photo={r.checkInPhotoUrl} lat={r.checkInLat} lng={r.checkInLng} distanceM={r.checkInDistanceM} title={t('attendance.came')} /></Td>
                    <Td><PunchCell at={r.checkOutAt} photo={r.checkOutPhotoUrl} lat={r.checkOutLat} lng={r.checkOutLng} distanceM={r.checkOutDistanceM} title={t('attendance.left')} /></Td>
                    <Td><StatusBadge status={r.status} lateMinutes={r.lateMinutes} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
          </>
        ) : (
          <EmptyState icon={CalendarCheck} title={t('common.empty')} />
        )}
      </div>
    </div>
  );
}
