export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export interface GeoBranch {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

export function nearestBranch(branches: GeoBranch[], lat: number, lng: number) {
  let best: { branch: GeoBranch; distanceM: number } | null = null;
  for (const b of branches) {
    const d = haversineM(lat, lng, b.lat, b.lng);
    if (!best || d < best.distanceM) best = { branch: b, distanceM: d };
  }
  return best;
}
