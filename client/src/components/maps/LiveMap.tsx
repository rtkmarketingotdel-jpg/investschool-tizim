import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadUrl } from '@/lib/api';
import { fmtTime } from '@/lib/dates';
import { GraduationCap, Maximize2, Minimize2 } from 'lucide-react';
import { branchIcon, staffIcon, STATUS_COLOR } from './icons';
import { themeColor } from '@/lib/theme';
import { createMap, DEFAULT_CENTER, L, setBase, type BaseKind } from './leaflet';

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
  const [base, setBaseKind] = useState<BaseKind>('satellite');
  const wrap = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (map.current) setBase(map.current, base);
  }, [base]);

  // Full screen: the real Fullscreen API when available, otherwise a fixed overlay (e.g. iOS Safari).
  const toggleFull = () => {
    if (expanded) {
      if (document.fullscreenElement) void document.exitFullscreen();
      setExpanded(false);
    } else {
      setExpanded(true);
      void wrap.current?.requestFullscreen?.().catch(() => undefined);
    }
  };
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setExpanded(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  useEffect(() => {
    const id = setTimeout(() => map.current?.invalidateSize(), 150);
    return () => clearTimeout(id);
  }, [expanded]);

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
      L.circle([b.lat, b.lng], { radius: b.radiusM, color: themeColor('--primary'), weight: 1.5, dashArray: '5 5', fillOpacity: 0.06 })
        .addTo(g);
      L.marker([b.lat, b.lng], { icon: branchIcon(), zIndexOffset: 500 })
        .bindTooltip(b.name, { permanent: true, direction: 'top', offset: [0, -20] })
        .addTo(g);
      bounds.push([b.lat, b.lng]);
    }

    for (const p of points) {
      const dot = L.marker([p.lat, p.lng], { icon: staffIcon(p.status), zIndexOffset: 1000 }).addTo(g);
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
      dot.bindPopup(box, { autoPanPaddingTopLeft: [20, 70], autoPanPaddingBottomRight: [20, 20] });
      dot.bindTooltip(p.fullName, { direction: 'top', offset: [0, -18] });
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
    <div ref={wrap} className={expanded ? 'fixed inset-0 z-[80] flex flex-col gap-3 bg-canvas p-3' : 'relative isolate space-y-3'}>
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
      {/* the map element keeps a constant className: React would otherwise wipe the classes Leaflet adds to it */}
      <div className={expanded ? 'relative min-h-0 flex-1' : 'relative h-[520px]'}>
      <div ref={el} className="h-full w-full overflow-hidden rounded-2xl border border-border" role="application" aria-label={t('attendance.map.title')} />
      <div className="absolute right-3 top-3 z-[500] flex gap-2">
        <div className="flex rounded-xl bg-surface/95 p-1 shadow" role="group" aria-label={t('attendance.map.layer')}>
          {(['satellite', 'street'] as BaseKind[]).map((k) => (
            <button key={k} type="button" aria-pressed={base === k} onClick={() => setBaseKind(k)} className={`rounded-lg px-3 py-1.5 text-sm ${base === k ? 'bg-primary-soft text-primary' : 'text-text-muted'}`}>
              {t(`attendance.map.${k}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={toggleFull} aria-label={t(expanded ? 'attendance.map.exitFull' : 'attendance.map.fullscreen')} title={t(expanded ? 'attendance.map.exitFull' : 'attendance.map.fullscreen')} className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/95 text-text shadow">
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex flex-col gap-1 rounded-xl bg-surface/95 px-3 py-2 text-sm shadow">
        <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" style={{ color: STATUS_COLOR.ON_TIME }} />{t('attendance.status.ON_TIME')}</span>
        <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" style={{ color: STATUS_COLOR.LATE }} />{t('attendance.status.LATE')}</span>
      </div>
      {points.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-xl bg-surface/95 px-4 py-2 text-sm text-text-muted shadow">
          {t('attendance.map.empty')}
        </div>
      )}
      </div>
    </div>
  );
}
