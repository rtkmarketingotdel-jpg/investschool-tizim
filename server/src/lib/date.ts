/** Returns "YYYY-MM-DD" for the given instant in Asia/Tashkent. */
export function toLocalDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
