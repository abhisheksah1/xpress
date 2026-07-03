import { DEFAULT_COUNTRY_CODE } from './countryCodes.js';

export const formatDisplayPhone = (countryCode = DEFAULT_COUNTRY_CODE, phone) => {
  if (!phone) return '—';
  return `${countryCode || DEFAULT_COUNTRY_CODE} ${phone}`;
};

export const buildWhatsAppUrl = (countryCode, phone, message) => {
  const cc = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
  const local = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${cc}${local}?text=${encodeURIComponent(message || '')}`;
};
