import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadUrl } from '@/lib/api';
import { fmtTime } from '@/lib/dates';
import { createMap, DEFAULT_CENTER, L } from './leaflet';

export interface MapBranch { id: string; name: string; lat: number; lng: number; radiusM: number }
export interface MapPoint {
  userId: string;
  fullName: string;
  position: string;
  lat: number;
  lng: number;
  checkInAt: string;
  status: 'ON_TIME' | 'LATE' | 'ABSENT' | 'EXCUSED';
  lateMinutes: number;
  distanceM: number | null;
  photoUrl: string | null;
  branchName: string | null;
}

const COLOR = { ON_TIME: '#16A34A', LATE: '#F59E0B', ABSENT: '#DC2626', EXCUSED: '#64748B' } as const;

interface Props {
  branches: MapBranch[];
  points: MapPoint[];
}

/** Live view of today: one dot per employee who has checked in and not yet left. */
export function LiveMap({ branches, points }: Props) {
  const { t } = useTranslation();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);
  const [focus, setFocus] = useState('all');

  useEffect(() => {
    if (!el.current) return;
    const m = createMap(el.current, DEFAULT_CENTER, 12);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    for (const b of branches) {
      L.circle([b.lat, b.lng], { radius: b.radiusM, color: '#2563EB', weight: 1.5, dashArray: '5 5', fillOpacity: 0.06 })
        .bindTooltip(b.name, { permanent: true, direction: 'top', className: 'leaflet-tooltip' })
        .addTo(g);
      bounds.push([b.lat, b.lng]);
    }

    for (const p of points) {
      const dot = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: COLOR[p.status], fillOpacity: 1 }).addTo(g);
      // Built with DOM nodes (not HTML strings) so names cannot inject markup.
      const box = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = p.fullName;
      const line = document.createElement('div');
      line.textContent = `${p.position} · ${t('attendance.cameAt', { time: fmtTime(p.checkInAt) })}${p.status === 'LATE' ? ` (${p.lateMinutes} ${t('attendance.min')})` : ''}`;
      box.append(name, line);
      if (p.branchName || p.distanceM != null) {
        const meta = document.createElement('div');
        meta.textContent = [p.branchName, p.distanceM != null ? `${p.distanceM} m` : null].filter(Boolean).join(' · ');
        box.append(meta);
      }
      const photo = uploadUrl(p.photoUrl);
      if (photo) {
        const img = document.createElement('img');
        img.src = photo;
        img.alt = '';
        img.style.cssText = 'width:96px;height:96px;object-fit:cover;border-radius:8px;margin-top:6px';
        box.append(img);
      }
      dot.bindPopup(box);
      dot.bindTooltip(p.fullName);
      bounds.push([p.lat, p.lng]);
    }

    if (!fitted.current && bounds.length) {
      m.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 16 });
      fitted.current = true;
    }
  }, [branches, points, t]);

  // Quick zoom: a chip per branch (fits the branch circle and the dots around it).
  useEffect(() => {
    const m = map.current;
    if (!m || !fitted.current) return;
    if (focus === 'all') {
      const all: L.LatLngExpression[] = [...branches.map((b) => [b.lat, b.lng] as [number, number]), ...points.map((p) => [p.lat, p.lng] as [number, number])];
      if (all.length) m.fitBounds(L.latLngBounds(all), { padding: [60, 60], maxZoom: 16 });
      return;
    }
    const b = branches.find((x) => x.id === focus);
    if (!b) return;
    const box = L.latLng(b.lat, b.lng).toBounds(b.radiusM * 2);
    for (const p of points) if (Math.abs(p.lat - b.lat) < 0.02 && Math.abs(p.lng - b.lng) < 0.02) box.extend([p.lat, p.lng]);
    m.fitBounds(box, { padding: [50, 50], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  return (
    <div className="relative space-y-3">
      {branches.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('attendance.day.branch')}>
          {[{ id: 'all', name: t('attendance.day.allBranches') }, ...branches].map((b) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={focus === b.id}
              onClick={() => setFocus(b.id)}
              className={`rounded-full border px-4 py-1.5 text-sm ${focus === b.id ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted hover:bg-surface-muted'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
      <div ref={el} className="h-[520px] w-full overflow-hidden rounded-2xl border border-border" role="application" aria-label={t('attendance.map.title')} />
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-col gap-1 rounded-xl bg-surface/95 px-3 py-2 text-sm shadow">
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: COLOR.ON_TIME }} />{t('attendance.status.ON_TIME')}</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: COLOR.LATE }} />{t('attendance.status.LATE')}</span>
      </div>
      {points.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-xl bg-surface/95 px-4 py-2 text-sm text-text-muted shadow">
          {t('attendance.map.empty')}
        </div>
      )}
    </div>
  );
}
