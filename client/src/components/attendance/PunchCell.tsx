import { fmtTime } from '@/lib/dates';
import { PhotoThumb } from './PhotoThumb';

interface Props {
  at: string | null;
  photo: string | null;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  title: string;
  tone?: 'in' | 'out';
}

/** Time + selfie thumbnail (+ distance from school) for one check-in/out. */
export function PunchCell({ at, photo, lat, lng, distanceM, title }: Props) {
  if (!at) return <span className="text-text-muted">—</span>;
  return (
    <div className="flex items-center gap-3">
      <PhotoThumb url={photo} title={title} lat={lat} lng={lng} />
      <div className="leading-tight">
        <p className="text-lg font-semibold tabular-nums text-green-700 dark:text-green-400">{fmtTime(at)}</p>
        {distanceM != null && <p className="text-xs text-text-muted tabular-nums">{distanceM} m</p>}
      </div>
    </div>
  );
}
