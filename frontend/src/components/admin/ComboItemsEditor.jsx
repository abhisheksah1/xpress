import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../../api/admin.js';
import {
  computeComboItemsTotal,
  defaultSelectedOptionsForProduct,
  formatNprAmount,
  getComboItemLineTotal,
  getComboItemUnitPrice,
  productHasVariations,
  resolveComboItemStock,
  serializeComboItemsForApi,
} from '../../utils/comboItems.js';

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
  let hasHardLimit = false;

  for (const item of comboItems) {
    const product = item.productData;
    if (product?.allowBackorder) continue;
    const stock = resolveComboItemStock(item);
    const qty = Math.max(1, item.quantity || 1);
    min = Math.min(min, Math.floor(stock / qty));
    hasHardLimit = true;
  }

  if (!hasHardLimit) return 99;
  return min === Infinity ? 0 : Math.max(0, min);
}

function formatOptionSummary(selectedOptions = []) {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ');
}

function VariationPicker({ product, selectedOptions, onChange, idPrefix = '' }) {
  const categories = product?.optionCategories || [];
  if (!categories.length) return null;

  const byCategory = Object.fromEntries(
    (selectedOptions || []).map((o) => [String(o.category || '').trim().toLowerCase(), o])
  );

  return (
    <div className="space-y-2 mt-2">
      {categories.map((cat, catIndex) => {
        const key = String(cat.name || '').trim().toLowerCase();
        const current = byCategory[key];
        return (
          <label key={`${idPrefix}${cat._id || cat.name || catIndex}`} className="block text-xs text-gray-600">
            <span className="font-semibold text-gray-700">
              {cat.name}
              {cat.tracksInventory ? ' (stock)' : ''}
            </span>
            <select
              className="input-field mt-1 text-sm py-1.5"
              value={current?.label || ''}
              onChange={(e) => {
                const opt = (cat.options || []).find((o) => o.label === e.target.value);
                if (!opt) return;
                const next = (selectedOptions || []).filter(
                  (o) => String(o.category || '').trim().toLowerCase() !== key
                );
                next.push({
                  category: cat.name,
                  label: opt.label,
                  priceAdjustment: Number(opt.priceAdjustment) || 0,
                });
                onChange(next);
              }}
            >
              <option value="" disabled>
                Select {cat.name}
              </option>
              {(cat.options || []).map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label}
                  {opt.priceAdjustment
                    ? ` (${opt.priceAdjustment > 0 ? '+' : ''}${formatNprAmount(opt.priceAdjustment)})`
                    : ''}
                  {cat.tracksInventory ? ` · stock ${Number(opt.stock) || 0}` : ''}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
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
  const [pendingAdd, setPendingAdd] = useState(null); // { product, selectedOptions }

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
  const hasOutOfStockComponent = comboItems.some((item) => {
    if (item.productData?.allowBackorder) return false;
    return resolveComboItemStock(item) <= 0;
  });

  useEffect(() => {
    onStockPreview?.(stockPreview);
  }, [stockPreview, onStockPreview]);

  const applyImages = (items) => {
    if (onImagesChange) {
      onImagesChange(mergeComboImagesPreview(images, items));
    }
  };

  const commitAdd = (product, selectedOptions = []) => {
    const next = [
      ...comboItems,
      {
        product: String(product._id),
        productData: product,
        quantity: 1,
        sortOrder: comboItems.length,
        ...(selectedOptions.length ? { selectedOptions } : {}),
      },
    ];
    onChange(next);
    applyImages(next);
    setBrowseList((prev) => prev.filter((p) => String(p._id) !== String(product._id)));
    setPendingAdd(null);
  };

  const startAddProduct = (product) => {
    if (productHasVariations(product)) {
      setPendingAdd({
        product,
        selectedOptions: defaultSelectedOptionsForProduct(product),
      });
      return;
    }
    commitAdd(product, []);
  };

  const pendingReady = useMemo(() => {
    if (!pendingAdd?.product) return false;
    const cats = pendingAdd.product.optionCategories || [];
    if (!cats.length) return true;
    return cats.every((cat) => {
      const key = String(cat.name || '').trim().toLowerCase();
      return (pendingAdd.selectedOptions || []).some(
        (o) => String(o.category || '').trim().toLowerCase() === key
      );
    });
  }, [pendingAdd]);

  const pendingUnitPrice = useMemo(() => {
    if (!pendingAdd?.product) return 0;
    return getComboItemUnitPrice({
      productData: pendingAdd.product,
      selectedOptions: pendingAdd.selectedOptions,
    });
  }, [pendingAdd]);

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

  const updateItemOptions = (index, selectedOptions) => {
    const next = comboItems.map((item, i) =>
      i === index ? { ...item, selectedOptions } : item
    );
    onChange(next);
  };

  return (
    <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800">Combo / Hamper Contents</h3>
        <p className="text-xs text-gray-500 mt-1">
          Choose single products included in this combo. Show price for each item. For variable products,
          pick the variation (size, weight, etc.) when adding — that lock is used for stock and checkout.
          Components that allow sell-after-OOS will not block the combo. Component images are added as
          gallery extras.
        </p>
      </div>

      <div>
        <input
          className="input-field text-sm"
          placeholder="Search single products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-64 overflow-y-auto">
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
                const outOfStock = (p.stock ?? 0) <= 0 && !p.allowBackorder;
                const variable = productHasVariations(p);
                return (
                  <li key={p._id} className="border-b border-gray-50 last:border-0">
                    <button
                      type="button"
                      onClick={() => startAddProduct(p)}
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
                          {p.sku || 'No SKU'}
                          {variable ? ' · Variable' : ''}
                          {!p.isActive && ' · Draft'}
                          {p.allowBackorder ? ' · Sell after OOS' : ''}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums shrink-0">
                        {formatNprAmount(p.price)}
                      </span>
                      <span className={`text-xs font-medium shrink-0 ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>
                        {outOfStock ? 'Out of stock' : `Stock: ${p.stock}`}
                      </span>
                      <span className="text-primary-600 text-xs font-semibold shrink-0">
                        {variable ? 'Set up' : '+ Add'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {pendingAdd && (
        <div className="rounded-lg border border-primary-200 bg-white p-3 space-y-3">
          <div className="flex items-start gap-3">
            {pendingAdd.product.images?.[0]?.url ? (
              <img
                src={pendingAdd.product.images[0].url}
                alt=""
                className="w-12 h-12 rounded object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-100 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{pendingAdd.product.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose variation(s) for this combo item · Base {formatNprAmount(pendingAdd.product.price)}
              </p>
              <VariationPicker
                product={pendingAdd.product}
                selectedOptions={pendingAdd.selectedOptions}
                onChange={(selectedOptions) => setPendingAdd((prev) => ({ ...prev, selectedOptions }))}
                idPrefix="pending-"
              />
              <p className="text-sm font-bold text-primary-600 mt-2">
                Line price: {formatNprAmount(pendingUnitPrice)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setPendingAdd(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={!pendingReady}
              onClick={() => commitAdd(pendingAdd.product, pendingAdd.selectedOptions)}
            >
              Add to combo
            </button>
          </div>
        </div>
      )}

      {comboItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Included in this combo</p>
          {comboItems.map((item, index) => {
            const p = item.productData || {};
            const img = p.images?.find((i) => i.isPrimary) || p.images?.[0];
            const itemStock = resolveComboItemStock(item);
            const outOfStock = itemStock <= 0 && !p.allowBackorder;
            const bundlesFromItem = Math.floor(itemStock / Math.max(1, item.quantity || 1));
            const lineTotal = getComboItemLineTotal(item);
            const unitPrice = getComboItemUnitPrice(item);
            const variable = productHasVariations(p);
            const optionSummary = formatOptionSummary(item.selectedOptions);

            return (
              <div
                key={`${item.product}-${index}`}
                className={`bg-white border rounded-lg p-3 space-y-2 ${
                  outOfStock ? 'border-red-200 bg-red-50/40' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  {img?.url ? (
                    <img src={img.url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name || 'Product'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatNprAmount(unitPrice)}
                      {optionSummary ? ` · ${optionSummary}` : variable ? ' · Choose variation' : ''}
                    </p>
                    <p className={`text-xs ${outOfStock ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                      {p.allowBackorder
                        ? 'Sell after OOS enabled — does not block combo'
                        : outOfStock
                          ? 'Out of stock — combo unavailable'
                          : `Stock: ${itemStock} · Supports ${bundlesFromItem} combo(s)`}
                    </p>
                    {lineTotal > 0 && (
                      <p className="text-xs font-semibold text-primary-600 mt-0.5">
                        Line total: {formatNprAmount(lineTotal)}
                      </p>
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

                {variable && (
                  <VariationPicker
                    product={p}
                    selectedOptions={item.selectedOptions || defaultSelectedOptionsForProduct(p)}
                    onChange={(selectedOptions) => updateItemOptions(index, selectedOptions)}
                    idPrefix={`item-${index}-`}
                  />
                )}
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
            One or more components are out of stock — this combo will show as out of stock on the store
            (unless those components allow sell after OOS).
          </p>
        )}
      </div>
    </div>
  );
}

export { mergeComboImagesPreview, computeComboStockPreview };
