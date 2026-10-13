import './env.js';
export const brand = {
  name: process.env.BRAND_NAME || 'RTK Maktab',
  legalName: process.env.BRAND_LEGAL_NAME || '"RTK Maktab" MChJ',
  inn: process.env.BRAND_INN || '000000000',
  address: process.env.BRAND_ADDRESS || 'Samarqand viloyati',
  director: process.env.BRAND_DIRECTOR || 'Direktor F.I.Sh.',
  phone: process.env.BRAND_PHONE || '+998 00 000 00 00',
};
