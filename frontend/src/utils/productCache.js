import { storeApi } from '../api/store.js';

const cache = new Map();
const inflight = new Map();

export function getCachedProduct(slug) {
  if (!slug) return null;
  return cache.get(String(slug)) || null;
}

export function setCachedProduct(slug, product) {
  if (!slug || !product) return;
  cache.set(String(slug), product);
}

/** Warm the product cache (hover/focus). Safe to call repeatedly. */
export function prefetchProduct(slug) {
  const key = String(slug || '');
  if (!key) return Promise.resolve(null);
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const req = storeApi
    .getProduct(key)
    .then((res) => {
      const product = res.data?.data || null;
      if (product) cache.set(key, product);
      return product;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, req);
  return req;
}

export function fetchProduct(slug) {
  const key = String(slug || '');
  if (!key) return Promise.reject(new Error('Missing slug'));

  return storeApi.getProduct(key).then((res) => {
    const product = res.data?.data;
    if (product) cache.set(key, product);
    return product;
  });
}

/** Best-effort title for instant H1 while the product request is in flight. */
export function resolveLoadingProductTitle(slug) {
  if (typeof document === 'undefined') return 'Product';
  const prerender = document.querySelector('#seo-prerender h1')?.textContent?.trim();
  if (prerender) return prerender;
  const title = String(document.title || '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s*[-–—]\s*.*$/, '')
    .trim();
  if (title && !/koselixpress/i.test(title)) return title;
  if (slug) {
    return String(slug)
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return 'Product';
}
