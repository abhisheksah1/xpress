import config from '../config/index.js';

const apiUploadsPrefix = () => `/api/${config.apiVersion}/uploads/`;

/** Store local uploads as site-relative paths so admin + storefront can load via the same origin/proxy. */
export const toStoredMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/api/')) return trimmed;

  if (trimmed.startsWith('/uploads/')) {
    return `${apiUploadsPrefix()}${trimmed.replace(/^\/uploads\//, '')}`;
  }

  if (trimmed.startsWith('uploads/')) {
    return `${apiUploadsPrefix()}${trimmed.replace(/^uploads\//, '')}`;
  }

  if (/^[\w.-]+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(trimmed)) {
    return `${apiUploadsPrefix()}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/api/') && parsed.pathname.includes('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    /* relative or invalid — return as-is */
  }

  return trimmed;
};

export const enrichProductMedia = (product) => {
  if (!product) return product;
  const doc = typeof product.toObject === 'function' ? product.toObject() : { ...product };

  if (Array.isArray(doc.images)) {
    doc.images = doc.images.map((img) => ({
      ...img,
      url: toStoredMediaUrl(img?.url) || img?.url,
    }));
  }

  if (Array.isArray(doc.comboItems)) {
    doc.comboItems = doc.comboItems.map((item) => {
      if (!item?.product || typeof item.product !== 'object') return item;
      return { ...item, product: enrichProductMedia(item.product) };
    });
  }

  return doc;
};

/** Resolve a stored media path to an absolute URL for API clients (admin, tracking, etc.). */
export const forClientMediaUrl = (url, baseUrl = '') => {
  const stored = toStoredMediaUrl(url);
  if (!stored || typeof stored !== 'string') return stored;
  if (/^https?:\/\//i.test(stored)) return stored;
  if (!stored.startsWith('/')) return stored;
  const base = String(baseUrl || '').replace(/\/$/, '');
  return base ? `${base}${stored}` : stored;
};

export const normalizeItemPersonalization = (personalization) => {
  if (!personalization || typeof personalization !== 'object') return undefined;

  const cakeMessage = personalization.cakeMessage?.trim() || undefined;
  const giftMessage = personalization.giftMessage?.trim() || undefined;
  const printImageName = personalization.printImageName?.trim() || undefined;
  const rawPrintUrl = typeof personalization.printImageUrl === 'string'
    ? personalization.printImageUrl.trim()
    : '';
  const printImageUrl = rawPrintUrl ? toStoredMediaUrl(rawPrintUrl) : undefined;

  if (!cakeMessage && !giftMessage && !printImageUrl && !printImageName) return undefined;

  const safeName = printImageUrl ? printImageName : undefined;
  return { cakeMessage, giftMessage, printImageUrl, printImageName: safeName };
};

export const enrichPersonalizationForClient = (personalization, baseUrl = '') => {
  const normalized = normalizeItemPersonalization(personalization);
  if (!normalized) return normalized;
  if (!normalized.printImageUrl) return normalized;
  return {
    ...normalized,
    printImageUrl: forClientMediaUrl(normalized.printImageUrl, baseUrl),
  };
};

export const requestBaseUrl = (req) => {
  if (!req) return '';
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return '';
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${protocol}://${host}`;
};
