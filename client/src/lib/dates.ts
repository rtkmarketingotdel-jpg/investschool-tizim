import { format } from 'date-fns';
import { ru, uz } from 'date-fns/locale';

const TZ = 'Asia/Tashkent';
export const dateLocale = (lang: string) => (lang === 'ru' ? ru : uz);

/** "HH:mm" in Asia/Tashkent from an ISO timestamp. */
export const fmtTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
    : null;

/** Formats a "YYYY-MM-DD" string. */
export const fmtDay = (dateStr: string, lang: string, pattern = 'd-MMM') =>
  format(new Date(`${dateStr}T00:00:00`), pattern, { locale: dateLocale(lang) });

export const todayLocal = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
