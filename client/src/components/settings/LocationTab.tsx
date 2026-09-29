import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, LocateFixed } from 'lucide-react';
import type { Settings } from '@/lib/financeApi';
import { Button, Card, Input, useToast } from '../ui';
import { Checkbox } from '../FormBits';
import { numOrNaN, useSaveSettings } from './shared';

export function LocationTab({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const toast = useToast();
  const save = useSaveSettings();
  const [lat, setLat] = useState(String(settings.schoolLat));
  const [lng, setLng] = useState(String(settings.schoolLng));
  const [radius, setRadius] = useState(String(settings.radiusM));
  const [acc, setAcc] = useState(String(settings.maxGpsAccuracyM));
  const [enforced, setEnforced] = useState(settings.geoEnforced);
  const [locating, setLocating] = useState(false);

  const valid = numOrNaN(lat) >= -90 && numOrNaN(lat) <= 90 && numOrNaN(lng) >= -180 && numOrNaN(lng) <= 180 && numOrNaN(radius) >= 10 && numOrNaN(acc) >= 10;

  const locate = () => {
    if (!navigator.geolocation) return toast(t('errors.GEO_UNSUPPORTED'), 'error');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setLocating(false); },
      (e) => { setLocating(false); toast(t(e.code === e.PERMISSION_DENIED ? 'errors.GEO_DENIED' : 'errors.GEO_FAILED'), 'error'); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <Card className="max-w-2xl space-y-5">
      <p className="text-text-muted">{t('settings.location.hint')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input type="number" step="any" label={t('settings.location.lat')} value={lat} onChange={(e) => setLat(e.target.value)} />
        <Input type="number" step="any" label={t('settings.location.lng')} value={lng} onChange={(e) => setLng(e.target.value)} />
        <Input type="number" min={10} label={t('settings.location.radius')} value={radius} onChange={(e) => setRadius(e.target.value)} />
        <Input type="number" min={10} label={t('settings.location.accuracy')} value={acc} onChange={(e) => setAcc(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={locate} loading={locating}><LocateFixed className="h-5 w-5" /> {t('settings.location.useMine')}</Button>
        <a className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium hover:bg-surface-muted" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
          <ExternalLink className="h-5 w-5" /> {t('settings.location.openMap')}
        </a>
      </div>
      <div>
        <Checkbox label={t('settings.location.enforce')} checked={enforced} onChange={setEnforced} />
        <p className="ml-8 mt-1 text-sm text-text-muted">{t('settings.location.enforceHint')}</p>
      </div>
      <Button
        disabled={!valid}
        loading={save.isPending}
        onClick={() => save.mutate({ schoolLat: Number(lat), schoolLng: Number(lng), radiusM: Number(radius), maxGpsAccuracyM: Number(acc), geoEnforced: enforced })}
      >
        {t('common.save')}
      </Button>
    </Card>
  );
}
