import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin.js';
import { resolveProductImageUrl } from '../../utils/mediaUrl.js';

export default function ProductGridBlockEditor({
  settings = {},
  categories = [],
  onSettingChange,
}) {
  const productIds = useMemo(
    () => (settings.productIds || []).map(String),
    [settings.productIds]
  );
  const selectedMeta = settings.selectedProducts || [];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const selectedIdSet = useMemo(() => new Set(productIds), [productIds]);

  const fetchResults = useCallback(async (term) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await adminApi.getProducts({ search: q, limit: 20, isActive: 'true' });
      setResults(data.data?.products || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), query.trim().length >= 2 ? 280 : 0);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const syncSelection = (ids, metas) => {
    onSettingChange('productIds', ids);
    onSettingChange('selectedProducts', metas);
    // Clear keyword filter when manually picking products
    if (ids.length && settings.search) onSettingChange('search', '');
  };

  const addProduct = (product) => {
    const id = String(product._id);
    if (selectedIdSet.has(id)) return;
    const nextIds = [...productIds, id];
    const nextMeta = [
      ...selectedMeta.filter((p) => String(p._id) !== id),
      {
        _id: id,
        name: product.name,
        sku: product.sku || '',
        price: product.price,
        image: resolveProductImageUrl(product) || '',
      },
    ];
    syncSelection(nextIds, nextMeta);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const removeProduct = (id) => {
    const sid = String(id);
    syncSelection(
      productIds.filter((x) => x !== sid),
      selectedMeta.filter((p) => String(p._id) !== sid)
    );
  };

  const moveProduct = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= productIds.length) return;
    const nextIds = [...productIds];
    [nextIds[index], nextIds[target]] = [nextIds[target], nextIds[index]];
    const byId = new Map(selectedMeta.map((p) => [String(p._id), p]));
    const nextMeta = nextIds.map((id) => byId.get(id)).filter(Boolean);
    syncSelection(nextIds, nextMeta);
  };

  const categoryOptions = useMemo(
    () => [{ _id: '', name: 'All categories' }, ...categories],
    [categories]
  );

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Limit</label>
          <input
            type="number"
            min="1"
            max="48"
            className="input-field"
            value={settings.limit || 8}
            onChange={(e) => onSettingChange('limit', Number(e.target.value) || 8)}
            disabled={productIds.length > 0}
          />
          {productIds.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-1">Limit ignored when products are selected.</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Category filter</label>
          <select
            className="input-field"
            value={settings.categoryId || ''}
            onChange={(e) => onSettingChange('categoryId', e.target.value)}
            disabled={productIds.length > 0}
          >
            {categoryOptions.map((c) => (
              <option key={c._id || 'all'} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className={`flex items-center gap-2 text-sm ${productIds.length ? 'opacity-50' : ''}`}>
            <input
              type="checkbox"
              checked={!!settings.isFeatured}
              onChange={(e) => onSettingChange('isFeatured', e.target.checked)}
              disabled={productIds.length > 0}
            />
            Featured only
          </label>
        </div>
      </div>

      <div className="relative">
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
          Search &amp; choose products
        </label>
        <input
          className="input-field"
          placeholder="Type at least 2 characters to search products..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
        {open && query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">No products found.</p>
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.map((p) => {
              const id = String(p._id);
              const already = selectedIdSet.has(id);
              const img = resolveProductImageUrl(p);
              return (
                <li key={id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => addProduct(p)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed ${already ? 'bg-gray-50' : ''}`}
                  >
                    <span className="w-9 h-9 rounded bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] text-gray-300">N/A</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-900 truncate">{p.name}</span>
                      <span className="block text-xs text-gray-400 truncate">
                        {p.sku ? `SKU ${p.sku} · ` : ''}NPR {Number(p.price || 0).toLocaleString('en-NP')}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-rose-600 shrink-0">
                      {already ? 'Added' : '+ Add'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {productIds.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase text-gray-400">
              Selected products ({productIds.length})
            </p>
            <button
              type="button"
              className="text-xs text-red-500 hover:underline"
              onClick={() => syncSelection([], [])}
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-2">
            {productIds.map((id, index) => {
              const meta = selectedMeta.find((p) => String(p._id) === id) || { _id: id, name: id };
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-2"
                >
                  <span className="w-9 h-9 rounded bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {meta.image ? (
                      <img src={meta.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] text-gray-300">N/A</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 truncate">{meta.name}</span>
                    {meta.sku && <span className="block text-[11px] text-gray-400">SKU {meta.sku}</span>}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveProduct(index, -1)}
                      className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === productIds.length - 1}
                      onClick={() => moveProduct(index, 1)}
                      className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(id)}
                      className="p-1.5 text-red-500 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-gray-400 mt-2">
            Storefront will show these products in this order. Category / featured / limit filters are ignored while a selection is set.
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500">
          No products selected yet — the grid will use category / featured / limit filters instead. Search above to pick specific products.
        </p>
      )}
    </div>
  );
}
