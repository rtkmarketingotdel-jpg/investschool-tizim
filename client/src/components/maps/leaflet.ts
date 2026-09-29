import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };
export const DEFAULT_CENTER: [number, number] = [39.6542, 66.9597];

export type BaseKind = 'satellite' | 'street';

const bases = new WeakMap<L.Map, { satellite: L.LayerGroup; street: L.TileLayer; current: BaseKind }>();

/** Satellite imagery (Esri World Imagery + place labels) or OpenStreetMap streets. Both work without an API key. */
export function setBase(map: L.Map, kind: BaseKind) {
  const b = bases.get(map);
  if (!b || b.current === kind) return;
  (kind === 'satellite' ? b.street : b.satellite).remove();
  (kind === 'satellite' ? b.satellite : b.street).addTo(map);
  b.current = kind;
}

export function createMap(el: HTMLElement, center: [number, number] = DEFAULT_CENTER, zoom = 13, kind: BaseKind = 'satellite'): L.Map {
  const map = L.map(el, { zoomControl: true, maxZoom: 19 }).setView(center, zoom);
  const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  });
  const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
  const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    className: 'osm-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  const satellite = L.layerGroup([imagery, labels]);
  bases.set(map, { satellite, street, current: kind === 'satellite' ? 'street' : 'satellite' });
  setBase(map, kind);
  return map;
}
