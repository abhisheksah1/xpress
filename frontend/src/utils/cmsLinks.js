/** True for http(s) URLs and protocol-relative links. */
export function isExternalCmsLink(url) {
  const trimmed = String(url || '').trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//');
}

/** Normalize admin-entered paths like `shop?x=1` → `/shop?x=1`. */
export function normalizeCmsPath(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed || isExternalCmsLink(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\/+/, '')}`;
}

/** Rewrite legacy localhost dev URLs to the current storefront origin. */
export function resolveCmsHref(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';

  if (isExternalCmsLink(trimmed)) {
    if (typeof window === 'undefined') return trimmed;
    try {
      const parsed = new URL(trimmed);
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
      if (isLocalHost && parsed.port && parsed.port !== window.location.port) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  return normalizeCmsPath(trimmed);
}
