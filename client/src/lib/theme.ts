/** Reads an RGB theme token (e.g. "--primary") as a CSS colour, for libraries that cannot use CSS variables (charts, maps). */
export function themeColor(token: string, alpha = 1): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw ? `rgb(${raw} / ${alpha})` : '#2563EB';
}
