/** Tiny in-process TTL cache for hot storefront reads. */
const store = new Map();

export function cacheGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs = 30_000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function cacheDel(prefixOrKey) {
  if (!prefixOrKey) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) store.delete(key);
  }
}
