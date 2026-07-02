import config from '../config/index.js';

const apiUploadsPrefix = () => `/api/${config.apiVersion}/uploads/`;

/** Store local uploads as site-relative paths so admin + storefront can load via the same origin/proxy. */
export const toStoredMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/api/')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith(apiUploadsPrefix())) {
      return parsed.pathname;
    }
  } catch {
    /* relative or invalid — return as-is */
  }

  return trimmed;
};

export const normalizeItemPersonalization = (personalization) => {
  if (!personalization || typeof personalization !== 'object') return undefined;

  const cakeMessage = personalization.cakeMessage?.trim() || undefined;
  const giftMessage = personalization.giftMessage?.trim() || undefined;
  const printImageUrl = toStoredMediaUrl(personalization.printImageUrl);
  const printImageName = personalization.printImageName?.trim() || undefined;

  if (!cakeMessage && !giftMessage && !printImageUrl) return undefined;

  return { cakeMessage, giftMessage, printImageUrl, printImageName };
};
