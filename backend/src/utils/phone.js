export const DEFAULT_COUNTRY_CODE = '+977';

export const validatePhoneForCountry = (phone, countryCode = DEFAULT_COUNTRY_CODE) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (countryCode === '+977') {
    if (!/^\d{10}$/.test(digits)) return 'Contact number must be exactly 10 digits for Nepal';
  } else if (!/^\d{6,15}$/.test(digits)) {
    return 'Enter a valid contact number (6–15 digits)';
  }
  return null;
};

export const toE164Digits = (countryCode, phone) => {
  const cc = String(countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, '');
  const local = String(phone || '').replace(/\D/g, '');
  return `${cc}${local}`;
};

export const formatDisplayPhone = (countryCode, phone) => {
  if (!phone) return '';
  return `${countryCode || DEFAULT_COUNTRY_CODE} ${phone}`;
};
