import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin.js';
import { resolveProductImageUrl } from '../../utils/mediaUrl.js';

const MAX_FOCUS = 10;

/**
 * Admin-only picker: up to 10 products pinned at the top of a category page.
 * Storefront shows them as normal cards (no badge).
 */
export default function CategoryFocusProductsPicker({
  categoryId,
  value = [],
  onChange,
}) {
  const focusIds = useMemo(() => (value || []).map(String), [value]);
  const [metaById, setMetaById] = useState({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedIdSet = useMemo(() => new Set(focusIds), [focusIds]);

  useEffect(() => {
    if (!focusIds.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await adminApi.getProducts({
          ids: focusIds.join(','),
          limit: focusIds.length,
          isActive: 'true',
        });
        const products = data.data?.products || [];
        if (cancelled) return;
        setMetaById((prev) => {
          const next = { ...prev };
          products.forEach((p) => {
            next[String(p._id)] = {
              _id: String(p._id),
              name: p.name,
              sku: p.sku || '',
              price: p.price,
              image: resolveProductImageUrl(p) || '',
            };
          });
          return next;
        });
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [focusIds.join(',')]);

  const fetchResults = useCallback(async (term) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = { search: q, limit: 20, isActive: 'true' };
      if (categoryId) params.category = categoryId;
      const { data } = await adminApi.getProducts(params);
      setResults(data.data?.products || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [categoryId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), query.trim().length >= 2 ? 280 : 0);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const emit = (ids) => onChange?.(ids.slice(0, MAX_FOCUS));

  const addProduct = (product) => {
    const id = String(product._id);
    if (selectedIdSet.has(id) || focusIds.length >= MAX_FOCUS) return;
    setMetaById((prev) => ({
      ...prev,
      [id]: {
        _id: id,
        name: product.name,
        sku: product.sku || '',
        price: product.price,
        image: resolveProductImageUrl(product) || '',
      },
    }));
    emit([...focusIds, id]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const removeProduct = (id) => {
    emit(focusIds.filter((x) => x !== String(id)));
  };

  const moveProduct = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= focusIds.length) return;
    const next = [...focusIds];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  };

  return (
    <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <div>
        <h4 className="text-sm font-semibold text-violet-900">Focus products (top of category page)</h4>
        <p className="text-xs text-violet-800/80 mt-1">
          Pick up to {MAX_FOCUS} products to show first on this category. Customers see normal product cards — no “featured” label.
        </p>
      </div>

      <div className="relative">
        <input
          className="input-field text-sm"
          placeholder={focusIds.length >= MAX_FOCUS ? `Maximum ${MAX_FOCUS} products` : 'Search products to pin…'}
          value={query}
          disabled={focusIds.length >= MAX_FOCUS}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.map((p) => {
              const id = String(p._id);
              const disabled = selectedIdSet.has(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addProduct(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {resolveProductImageUrl(p) ? (
                      <img src={resolveProductImageUrl(p)} alt="" className="w-8 h-8 object-cover rounded" />
                    ) : (
                      <span className="w-8 h-8 bg-gray-100 rounded" />
                    )}
                    <span className="min-w-0 truncate">{p.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {focusIds.length === 0 ? (
        <p className="text-xs text-gray-500">No focus products yet — category lists use normal sort.</p>
      ) : (
        <ul className="space-y-2">
          {focusIds.map((id, index) => {
            const meta = metaById[id] || { name: id, sku: '' };
            return (
              <li key={id} className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-2 py-1.5">
                <span className="text-xs font-mono text-gray-400 w-5">{index + 1}</span>
                {meta.image ? (
                  <img src={meta.image} alt="" className="w-8 h-8 object-cover rounded" />
                ) : (
                  <span className="w-8 h-8 bg-gray-100 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{meta.name}</p>
                  {meta.sku && <p className="text-[10px] text-gray-400 font-mono">{meta.sku}</p>}
                </div>
                <div className="flex gap-1">
                  <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => moveProduct(index, -1)} disabled={index === 0}>↑</button>
                  <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => moveProduct(index, 1)} disabled={index === focusIds.length - 1}>↓</button>
                  <button type="button" className="text-xs text-red-600 px-2" onClick={() => removeProduct(id)}>Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-gray-500">{focusIds.length}/{MAX_FOCUS} selected</p>
    </div>
  );
}
