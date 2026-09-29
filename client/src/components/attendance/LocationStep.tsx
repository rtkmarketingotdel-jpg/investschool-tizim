import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink, LocateFixed, MapPinOff, RefreshCw, TriangleAlert } from 'lucide-react';
import { nearestBranch, type GeoBranch } from '@/lib/geo';
import { Button, Modal } from '../ui';

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
}

type Phase = 'locating' | 'denied' | 'failed' | 'done';

interface Props {
  open: boolean;
  branches: GeoBranch[];
  geoEnforced: boolean;
  maxAccuracyM: number;
  onCancel: () => void;
  onConfirm: (fix: Fix) => void;
}

/** Step 1 of check-in: ask for location permission, detect the position and show where the employee is. */
export function LocationStep({ open, branches, geoEnforced, maxAccuracyM, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('locating');
  const [fix, setFix] = useState<Fix | null>(null);

  const locate = useCallback(() => {
    setPhase('locating');
    if (!navigator.geolocation) return setPhase('failed');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setPhase('done');
      },
      (e) => setPhase(e.code === e.PERMISSION_DENIED ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (open) locate();
  }, [open, locate]);

  const near = fix ? nearestBranch(branches, fix.lat, fix.lng) : null;
  const lowAccuracy = !!fix && fix.accuracy > maxAccuracyM;
  const outOfRange = !!near && geoEnforced && near.distanceM > near.branch.radiusM;
  const canContinue = phase === 'done' && !!fix && !lowAccuracy && !outOfRange;

  return (
    <Modal open={open} onClose={onCancel} title={t('attendance.location.title')}>
      {phase === 'locating' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
          <LocateFixed className="h-10 w-10 animate-pulse text-primary" />
          <p>{t('attendance.location.locating')}</p>
          <p className="text-sm text-text-muted">{t('attendance.location.allowHint')}</p>
        </div>
      )}

      {(phase === 'denied' || phase === 'failed') && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <MapPinOff className="h-10 w-10 text-red-600" />
            <p role="alert">{t(phase === 'denied' ? 'attendance.location.denied' : 'attendance.location.failed')}</p>
          </div>
          {phase === 'denied' && (
            <ol className="list-decimal space-y-1 rounded-xl bg-surface-muted p-4 pl-8 text-sm text-text-muted">
              <li>{t('attendance.location.step1')}</li>
              <li>{t('attendance.location.step2')}</li>
              <li>{t('attendance.location.step3')}</li>
            </ol>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button className="flex-1" onClick={locate}><RefreshCw className="h-4 w-4" /> {t('attendance.retry')}</Button>
          </div>
        </div>
      )}

      {phase === 'done' && fix && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-border p-4">
            {canContinue ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" /> : <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />}
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="text-base">{canContinue ? t('attendance.location.detected') : t('attendance.location.problem')}</p>
              <p className="text-text-muted">{t('attendance.location.accuracy', { m: Math.round(fix.accuracy) })}</p>
              {near && <p>{t('attendance.location.nearest', { name: near.branch.name, distance: near.distanceM })}</p>}
              {near && geoEnforced && !outOfRange && <p className="text-green-600">{t('attendance.location.inRange', { radius: near.branch.radiusM })}</p>}
              {outOfRange && near && <p role="alert" className="text-red-600">{t('attendance.location.outOfRange', { distance: near.distanceM, radius: near.branch.radiusM })}</p>}
              {lowAccuracy && <p role="alert" className="text-amber-700 dark:text-amber-400">{t('attendance.location.lowAccuracy', { max: maxAccuracyM })}</p>}
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`https://www.google.com/maps?q=${fix.lat},${fix.lng}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={locate}><RefreshCw className="h-4 w-4" /> {t('attendance.location.refresh')}</Button>
            <Button className="flex-1" disabled={!canContinue} onClick={() => fix && onConfirm(fix)}>{t('attendance.location.continue')}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
