const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Returns "YYYY-MM-DD" for the given instant in Asia/Tashkent. */
export function toLocalDate(date: Date = new Date()): string {
  return PARTS.format(date);
}

/** Minutes since local midnight (Asia/Tashkent). */
export function localMinutes(date: Date): number {
  const [h, m] = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .split(':')
    .map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export const parseHHMM = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday: 1=Mon ... 7=Sun */
export function isoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export const atLocal = (dateStr: string, hhmm: string) => new Date(`${dateStr}T${hhmm}:00+05:00`);
