const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';
const UPLOADS_PREFIX = `/api/${API_VERSION}/uploads/`;

/** Encode path segments that break in some browsers (e.g. parentheses in CDN filenames). */
function safeAbsoluteUrl(url) {
  try {
    const parsed = new URL(url);
    if (!/[()]/.test(parsed.pathname)) return url;
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => {
        if (!segment) return segment;
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Resolve stored media URLs for display (handles legacy absolute localhost API URLs,
 * bare filenames, and same-origin upload paths).
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('//')) {
    return safeAbsoluteUrl(`${window.location.protocol}${trimmed}`);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/api/') && parsed.pathname.includes('/uploads/')) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return safeAbsoluteUrl(trimmed);
  }

  if (trimmed.startsWith('/api/')) return trimmed;

  if (trimmed.startsWith('/uploads/')) {
    return `/api/${API_VERSION}${trimmed}`;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/api/${API_VERSION}/${trimmed}`;
  }

  if (/^[\w.-]+\.(jpg|jpeg|png|webp|gif|svg)$/i.test(trimmed)) {
    return `${UPLOADS_PREFIX}${trimmed}`;
  }

  if (trimmed.startsWith('/')) return trimmed;

  return trimmed;
}

export function resolveProductImageUrl(product) {
  if (!product) return '';
  const raw =
    product.images?.find((i) => i.isPrimary)?.url
    || product.images?.[0]?.url
    || product.image
    || '';
  return resolveMediaUrl(raw);
}
