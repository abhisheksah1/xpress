const VISITOR_KEY = 'kx_vid';
let lastTrackedKey = '';
let lastTrackedAt = 0;

function createVisitorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable anonymous visitor id (localStorage). */
export function getOrCreateVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || id.length < 8) {
      id = createVisitorId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return createVisitorId();
  }
}

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
}

/**
 * Fire-and-forget storefront pageview. Safe to call on every route change.
 * Skips admin paths and ignores network errors.
 */
export function trackPageView(pathname) {
  if (typeof window === 'undefined') return;

  const path = String(pathname || window.location.pathname || '/').slice(0, 200);
  if (path.startsWith('/admin') || path.startsWith('/api')) return;

  // Dedupe React Strict Mode double-invoke and rapid remounts
  const now = Date.now();
  if (path === lastTrackedKey && now - lastTrackedAt < 800) return;
  lastTrackedKey = path;
  lastTrackedAt = now;

  const visitorId = getOrCreateVisitorId();
  const payload = JSON.stringify({ visitorId, path });
  const url = `${apiBase()}/store/analytics/pageview`;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {});
}
