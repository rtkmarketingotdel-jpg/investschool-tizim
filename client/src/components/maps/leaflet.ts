import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };
export const DEFAULT_CENTER: [number, number] = [39.6542, 66.9597];

/** OpenStreetMap base map (no API key needed). */
export function createMap(el: HTMLElement, center: [number, number] = DEFAULT_CENTER, zoom = 13): L.Map {
  const map = L.map(el, { zoomControl: true }).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  return map;
}
