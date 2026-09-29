import { useEffect, useRef } from 'react';
import { createMap, DEFAULT_CENTER, L } from './leaflet';
import { branchIcon } from './icons';

interface Props {
  lat: number;
  lng: number;
  radiusM: number;
  onPick: (lat: number, lng: number) => void;
}

/** Small map: click to place the branch; the circle shows the allowed check-in radius. */
export function LocationPicker({ lat, lng, radiusM, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  useEffect(() => {
    if (!el.current) return;
    const m = createMap(el.current, valid ? [lat, lng] : DEFAULT_CENTER, 15);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => pick.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    const m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    if (!valid) return;
    L.circle([lat, lng], { radius: Math.max(radiusM || 0, 1), color: '#2563EB', weight: 1.5, dashArray: '4 4', fillOpacity: 0.08 }).addTo(g);
    L.marker([lat, lng], { icon: branchIcon() }).addTo(g);
    if (!m.getBounds().contains([lat, lng])) m.setView([lat, lng]);
  }, [lat, lng, radiusM, valid]);

  return <div ref={el} className="h-56 w-full overflow-hidden rounded-xl border border-border" role="application" aria-label="Map" />;
}
