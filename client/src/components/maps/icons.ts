import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GraduationCap, School } from 'lucide-react';
import { L } from './leaflet';

export const STATUS_COLOR = { ON_TIME: '#16A34A', LATE: '#F59E0B', ABSENT: '#DC2626', EXCUSED: '#64748B' } as const;
export type PointStatus = keyof typeof STATUS_COLOR;

const svg = (icon: typeof School, size: number) =>
  renderToStaticMarkup(createElement(icon, { size, color: '#fff', strokeWidth: 1.75 }));

/** Branch: a school building on a blue rounded square. */
export const branchIcon = () =>
  L.divIcon({
    className: 'map-icon',
    html: `<div style="width:38px;height:38px;border-radius:12px;background:#2563EB;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">${svg(School, 20)}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

/** Employee: a graduation cap (mortarboard) on a circle coloured by status. */
export const staffIcon = (status: PointStatus) =>
  L.divIcon({
    className: 'map-icon',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${STATUS_COLOR[status]};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">${svg(GraduationCap, 19)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
