import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../../api/admin.js';
import { computeComboItemsTotal, formatNprAmount, getComboItemLineTotal, serializeComboItemsForApi } from '../../utils/comboItems.js';

function mergeComboImagesPreview(existingImages, comboItems) {
  const manual = [...existingImages];
  const urls = new Set(manual.map((i) => i.url));
  const extras = [];

  for (const item of comboItems) {
    const p = item.productData;
    if (!p?.images?.length) continue;
    const img = p.images.find((i) => i.isPrimary) || p.images[0];
    if (!img?.url || urls.has(img.url)) continue;
    extras.push({
      url: img.url,
      publicId: img.publicId,
      alt: p.name,
      isPrimary: false,
      sortOrder: manual.length + extras.length,
    });
    urls.add(img.url);
  }

  const merged = [...manual, ...extras];
  return merged.map((img, i) => ({ ...img, isPrimary: i === 0, sortOrder: i === 0 ? 0 : i }));
}

function computeComboStockPreview(comboItems) {
  if (!comboItems.length) return 0;
  let min = Infinity;
  for (const item of comboItems) {
    const stock = item.productData?.stock ?? 0;
    const qty = Math.max(1, item.quantity || 1);
    min = Math.min(min, Math.floor(stock / qty));
  }
  return min === Infinity ? 0 : Math.max(0, min);
}

export default function ComboItemsEditor({
  productId,
  comboItems,
  onChange,
  onImagesChange,
  images,
  onStockPreview,
}) {
  const [search, setSearch] = useState('');
  const [browseList, setBrowseList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const existingIds = useMemo(
    () => new Set(comboItems.map((i) => String(i.product))),
    [comboItems]
  );

  const fetchProducts = useCallback(async (term = '') => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {
        forComboPicker: 'true',
        limit: 30,
        sort: 'name',
      };
      if (term.trim()) params.search = term.trim();
      if (productId) params.excludeId = productId;
      const { data } = await adminApi.getProducts(params);
      const list = data.data?.products || [];
      setBrowseList(list.filter((p) => !p.isHamper && !existingIds.has(String(p._id))));
    } catch (err) {
      setBrowseList([]);
      setLoadError(err.response?.data?.message || 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [productId, existingIds]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, fetchProducts]);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!comboItems.length || hydratedRef.current) return;
    const stale = comboItems.some((item) => !item.productData?.name);
    if (!stale) {
      hydratedRef.current = true;
      return;
    }

    adminApi
      .getProducts({ forComboPicker: 'true', limit: 100 })
      .then(({ data }) => {
        const byId = new Map((data.data?.products || []).map((p) => [String(p._id), p]));
        const refreshed = comboItems.map((item) => ({
          ...item,
          product: serializeComboItemsForApi([item])[0]?.product || item.product,
          productData: byId.get(String(item.product?._id || item.product)) || item.productData,
        }));
        hydratedRef.current = true;
        onChange(refreshed);
      })
      .catch(() => {
        hydratedRef.current = true;
      });
  }, [comboItems, onChange]);

  const stockPreview = useMemo(() => computeComboStockPreview(comboItems), [comboItems]);
  const componentsTotal = useMemo(() => computeComboItemsTotal(comboItems), [comboItems]);
  const hasOutOfStockComponent = comboItems.some((item) => (item.productData?.stock ?? 0) <= 0);

  useEffect(() => {
    onStockPreview?.(stockPreview);
  }, [stockPreview, onStockPreview]);

  const applyImages = (items) => {
    if (onImagesChange) {
      onImagesChange(mergeComboImagesPreview(images, items));
    }
  };

  const addProduct = (product) => {
    const next = [
      ...comboItems,
      {
        product: String(product._id),
        productData: product,
        quantity: 1,
        sortOrder: comboItems.length,
      },
    ];
    onChange(next);
    applyImages(next);
    setBrowseList((prev) => prev.filter((p) => String(p._id) !== String(product._id)));
  };

  const removeItem = (index) => {
    const removed = comboItems[index];
    const next = comboItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i }));
    onChange(next);
    applyImages(next);
    if (removed?.productData) {
      setBrowseList((prev) => {
        if (prev.some((p) => String(p._id) === String(removed.product))) return prev;
        return [...prev, removed.productData].sort((a, b) => a.name.localeCompare(b.name));
      });
    }
  };

  const updateQty = (index, quantity) => {
    const next = comboItems.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item
    );
    onChange(next);
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800">Combo / Hamper Contents</h3>
        <p className="text-xs text-gray-500 mt-1">
          Choose single products included in this combo. If any component is out of stock, this combo
          is automatically treated as out of stock. Component images are added as 2nd, 3rd gallery images.
        </p>
      </div>

      <div>
        <input
          className="input-field text-sm"
          placeholder="Search single products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-52 overflow-y-auto">
          {loading && <p className="text-xs text-gray-400 p-3">Loading products...</p>}
          {!loading && loadError && <p className="text-xs text-red-500 p-3">{loadError}</p>}
          {!loading && !loadError && browseList.length === 0 && (
            <p className="text-xs text-gray-400 p-3">
              {search ? 'No matching single products found.' : 'No single products available. Create individual products first.'}
            </p>
          )}
          {!loading && browseList.length > 0 && (
            <ul>
              {browseList.map((p) => {
                const outOfStock = (p.stock ?? 0) <= 0;
                return (
                  <li key={p._id} className="border-b border-gray-50 last:border-0">
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm"
                    >
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-gray-100 shrink-0" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="font-medium block truncate">{p.name}</span>
                        <span className="text-xs text-gray-400">
                          {p.sku}
                          {!p.isActive && ' · Draft'}
                        </span>
                      </span>
                      <span className={`text-xs font-medium shrink-0 ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>
                        {outOfStock ? 'Out of stock' : `Stock: ${p.stock}`}
                      </span>
                      <span className="text-primary-600 text-xs font-semibold shrink-0">+ Add</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {comboItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Included in this combo</p>
          {comboItems.map((item, index) => {
            const p = item.productData || {};
            const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
            const outOfStock = (p.stock ?? 0) <= 0;
            const bundlesFromItem = Math.floor((p.stock ?? 0) / Math.max(1, item.quantity || 1));
            const lineTotal = getComboItemLineTotal(item);
            return (
              <div
                key={`${item.product}-${index}`}
                className={`flex items-center gap-3 bg-white border rounded-lg p-2 ${
                  outOfStock ? 'border-red-200 bg-red-50/40' : 'border-gray-100'
                }`}
              >
                {img?.url ? (
                  <img src={img.url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name || 'Product'}</p>
                  <p className={`text-xs ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {outOfStock ? 'Out of stock — combo unavailable' : `Stock: ${p.stock} · Supports ${bundlesFromItem} combo(s)`}
                  </p>
                  {lineTotal > 0 && (
                    <p className="text-xs font-semibold text-primary-600 mt-0.5">{formatNprAmount(lineTotal)}</p>
                  )}
                </div>
                <label className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                  Qty
                  <input
                    type="number"
                    min="1"
                    className="input-field w-16 py-1 text-sm"
                    value={item.quantity}
                    onChange={(e) => updateQty(index, e.target.value)}
                  />
                </label>
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-xs shrink-0">
                  Remove
                </button>
              </div>
            );
          })}
          {componentsTotal > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2.5 mt-1">
              <span className="text-sm font-semibold text-gray-700">Total value of included products</span>
              <span className="text-base font-bold text-primary-600">{formatNprAmount(componentsTotal)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-amber-700">No items in this combo yet. Pick products from the list above.</p>
      )}

      <div className="rounded-lg bg-white border border-gray-100 px-3 py-2">
        <p className="text-xs font-medium text-gray-600">
          Calculated combo availability:{' '}
          <span className={stockPreview <= 0 ? 'text-red-600 font-bold' : 'text-primary-600 font-bold'}>
            {stockPreview} bundle(s)
          </span>
        </p>
        {hasOutOfStockComponent && (
          <p className="text-xs text-red-500 mt-1">
            One or more components are out of stock — this combo will show as out of stock on the store.
          </p>
        )}
      </div>
    </div>
  );
}

export { mergeComboImagesPreview, computeComboStockPreview };
