export const periodOf = (dateStr: string) => dateStr.slice(0, 7);

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const daysBetween = (fromDate: string, toDate: string) =>
  Math.floor((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);

export const dueDateFor = (period: string, dueDay: number) => `${period}-${String(dueDay).padStart(2, '0')}`;
