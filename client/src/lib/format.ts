export const formatMoney = (n: number, suffix: string) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${suffix}`;

/** Formats digits typed by the user as "+998 90 123 45 67". */
export function maskPhone(input: string): string {
  const digits = input.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return '+998' + parts.filter(Boolean).map((p) => ' ' + p).join('');
}

export const phoneToApi = (masked: string) => '+' + masked.replace(/\D/g, '');
