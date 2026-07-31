import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, ExportCsvButton, StatCard, defaultDateRange, downloadBlob, fmtNpr, vendorBillToPurchaseType } from './financeUtils.jsx';

const PURCHASE_TYPES = [
  { value: 'vat_13', label: 'VAT Bill (13% VAT)', rate: 0.13 },
  { value: 'pan_bill', label: 'Pan Bill', rate: 0 },
  { value: 'normal_bill', label: 'Normal Bill', rate: 0 },
];

const PURCHASE_TYPE_LABELS = {
  vat_13: 'VAT Bill',
  pan_bill: 'Pan Bill',
  normal_bill: 'Normal Bill',
  non_vat: 'Pan Bill',
  zero_rated: 'Normal Bill',
};

const emptyDraft = () => ({
  vendor: '',
  invoiceRef: '',
  purchaseType: 'vat_13',
  purchaseDate: new Date().toISOString().slice(0, 10),
  treasuryAccount: '',
  stockReceived: true,
});

function treasuryLabel(account) {
  if (!account) return '';
  const type = String(account.type || 'other').replace('_', ' ').toUpperCase();
  return `${account.name} (${type})`;
}

function productImage(product) {
  return product?.images?.find((i) => i.isPrimary)?.url || product?.images?.[0]?.url || '';
}

function getTrackingCategories(product) {
  return (product?.optionCategories || []).filter((cat) => cat?.tracksInventory && cat.options?.length);
}

function formatOptionsLabel(selectedOptions = []) {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ');
}

function optionsMatchKey(selectedOptions = []) {
  return selectedOptions
    .map((o) => `${o.category}:${o.label}`)
    .sort()
    .join('|');
}

export default function FinancePurchasesPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [reportRange, setReportRange] = useState(defaultDateRange);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [header, setHeader] = useState(emptyDraft);
  const [draftItems, setDraftItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingNumber, setEditingNumber] = useState('');

  const [productQuery, setProductQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lineQty, setLineQty] = useState('1');
  const [lineRate, setLineRate] = useState('');
  /** category name -> option label for inventory variations */
  const [lineOptions, setLineOptions] = useState({});

  const purchaseTypeMeta = PURCHASE_TYPES.find((t) => t.value === header.purchaseType) || PURCHASE_TYPES[0];

  const taxableSubtotal = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0),
    [draftItems]
  );

  const vatAmount = useMemo(
    () => Math.round(taxableSubtotal * purchaseTypeMeta.rate * 100) / 100,
    [taxableSubtotal, purchaseTypeMeta.rate]
  );

  const grandTotal = taxableSubtotal + vatAmount;
  const draftUnits = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const lineSubtotal = (Number(lineQty) || 0) * (Number(lineRate) || 0);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getFinancePurchases({ startDate, endDate, limit: 50 })
      .then((res) => setRows(res.data.data.purchases || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    load();
    adminApi.getFinanceVendors({ limit: 200, status: 'active' }).then((r) => setVendors(r.data.data.vendors || [])).catch(() => {});
    adminApi.getTreasuryAccounts().then((r) => setAccounts(r.data.data.accounts || [])).catch(() => {});
  }, [load]);

  const loadReport = useCallback(() => {
    setReportLoading(true);
    adminApi
      .getFinancePurchaseReport({ startDate: reportRange.startDate, endDate: reportRange.endDate })
      .then((res) => setReport(res.data.data))
      .catch(() => setReport(null))
      .finally(() => setReportLoading(false));
  }, [reportRange]);

  const exportReportCsv = async () => {
    const { data: blob } = await adminApi.exportFinancePurchaseReportCsv({
      startDate: reportRange.startDate,
      endDate: reportRange.endDate,
    });
    downloadBlob(blob, `purchase-entry-report-${reportRange.endDate}.csv`);
  };

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    const q = productQuery.trim();
    if (q.length < 2 || (selectedProduct && productQuery === selectedProduct.name)) {
      setSearchResults([]);
      return undefined;
    }

    const timer = setTimeout(() => {
      setSearching(true);
      adminApi
        .getProducts({ search: q, limit: 15 })
        .then((res) => {
          setSearchResults(res.data.data.products || []);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [productQuery, selectedProduct]);

  const selectProduct = (product) => {
    setSelectedProduct(product);
    setProductQuery(product.name);
    setSearchResults([]);
    setSearchOpen(false);
    setLineQty('1');
    setLineRate(String(product.costPrice ?? product.price ?? ''));
    const defaults = {};
    getTrackingCategories(product).forEach((cat) => {
      if (cat.options?.[0]) defaults[cat.name] = cat.options[0].label;
    });
    setLineOptions(defaults);
  };

  const clearProductPicker = () => {
    setSelectedProduct(null);
    setProductQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    setLineQty('1');
    setLineRate('');
    setLineOptions({});
  };

  const buildLineSelectedOptions = () => {
    if (!selectedProduct) return [];
    return getTrackingCategories(selectedProduct).map((cat) => ({
      category: cat.name,
      label: lineOptions[cat.name] || cat.options[0]?.label,
    })).filter((o) => o.label);
  };

  const addLineToDraft = () => {
    if (!selectedProduct) return toast.error('Select a product first');
    const quantity = Number(lineQty);
    const unitCost = Number(lineRate);
    if (!quantity || quantity < 1) return toast.error('Enter a valid quantity');
    if (!Number.isFinite(unitCost) || unitCost < 0) return toast.error('Enter a valid rate');

    const tracking = getTrackingCategories(selectedProduct);
    if (tracking.length) {
      const missing = tracking.find((cat) => !lineOptions[cat.name]);
      if (missing) return toast.error(`Select ${missing.name} before adding`);
    }

    const selectedOptions = buildLineSelectedOptions();
    const oKey = optionsMatchKey(selectedOptions);
    const variationLabel = formatOptionsLabel(selectedOptions);
    const displayStock =
      tracking.length === 1
        ? Number(
            (tracking[0].options || []).find((o) => o.label === lineOptions[tracking[0].name])
              ?.stock
          ) || 0
        : selectedProduct.stock ?? 0;

    const existingIndex = draftItems.findIndex(
      (item) => item.product === selectedProduct._id && (item.optionsKey || '') === oKey
    );
    if (existingIndex >= 0) {
      setDraftItems((items) =>
        items.map((item, index) =>
          index === existingIndex
            ? { ...item, quantity: item.quantity + quantity, unitCost }
            : item
        )
      );
    } else {
      setDraftItems((items) => [
        ...items,
        {
          key: `${selectedProduct._id}-${oKey || 'base'}-${Date.now()}`,
          product: selectedProduct._id,
          name: variationLabel ? `${selectedProduct.name} (${variationLabel})` : selectedProduct.name,
          sku: selectedProduct.sku || '',
          image: productImage(selectedProduct),
          stock: displayStock,
          quantity,
          unitCost,
          selectedOptions: selectedOptions.length ? selectedOptions : undefined,
          optionsKey: oKey,
        },
      ]);
    }

    toast.success('Added to bill draft');
    clearProductPicker();
  };

  const removeDraftItem = (key) => {
    setDraftItems((items) => items.filter((item) => item.key !== key));
  };

  const updateDraftItem = (key, patch) => {
    setDraftItems((items) =>
      items.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  };

  const clearBill = () => {
    if (draftItems.length && !window.confirm('Clear all items from this bill draft?')) return;
    setDraftItems([]);
  };

  const resetEntry = () => {
    setHeader(emptyDraft());
    setDraftItems([]);
    setEditingId(null);
    setEditingNumber('');
    clearProductPicker();
  };

  const beginEdit = async (row) => {
    try {
      const res = await adminApi.getFinancePurchase(row._id);
      const purchase = res.data.data;
      const vendorId = purchase.vendor?._id || purchase.vendor || '';
      const treasuryId = purchase.treasuryAccount?._id || purchase.treasuryAccount || '';
      setEditingId(purchase._id);
      setEditingNumber(purchase.purchaseNumber || '');
      setHeader({
        vendor: vendorId,
        invoiceRef: purchase.invoiceRef || '',
        purchaseType: purchase.purchaseType === 'non_vat' || purchase.purchaseType === 'pan_bill'
          ? 'pan_bill'
          : purchase.purchaseType === 'zero_rated' || purchase.purchaseType === 'normal_bill'
            ? 'normal_bill'
            : 'vat_13',
        purchaseDate: purchase.purchaseDate
          ? new Date(purchase.purchaseDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        treasuryAccount: treasuryId,
        stockReceived: purchase.stockReceived !== false,
      });
      setDraftItems(
        (purchase.items || []).map((item, index) => {
          const selectedOptions = item.selectedOptions || [];
          const oKey = optionsMatchKey(selectedOptions);
          return {
            key: `${item.product || 'line'}-${oKey || index}-${index}`,
            product: item.product?._id || item.product || undefined,
            name: item.name,
            sku: item.sku || item.product?.sku || '',
            image: productImage(item.product) || '',
            stock: item.product?.stock ?? 0,
            quantity: item.quantity,
            unitCost: item.unitCost,
            selectedOptions: selectedOptions.length ? selectedOptions : undefined,
            optionsKey: oKey,
          };
        })
      );
      clearProductPicker();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Editing ${purchase.purchaseNumber} — update fields then save`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load purchase for editing');
    }
  };

  const removePurchase = async (row) => {
    if (!window.confirm(`Delete purchase ${row.purchaseNumber}? Stock and treasury will be reversed.`)) {
      return;
    }
    try {
      await adminApi.deleteFinancePurchase(row._id);
      toast.success('Purchase deleted');
      if (editingId === row._id) resetEntry();
      load();
      loadReport();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const lodgeBill = async () => {
    if (!header.vendor) return toast.error('Select a wholesale supplier');
    if (!header.invoiceRef?.trim()) return toast.error('Bill / invoice number is required');
    if (!draftItems.length) return toast.error('Add at least one product to the bill draft');
    if (!header.treasuryAccount) return toast.error('Select a source treasury account');

    const payload = {
      vendor: header.vendor,
      invoiceRef: header.invoiceRef.trim(),
      purchaseType: header.purchaseType,
      purchaseDate: header.purchaseDate,
      treasuryAccount: header.treasuryAccount,
      stockReceived: header.stockReceived,
      paidAmount: grandTotal,
      paymentStatus: 'paid',
      items: draftItems.map((item) => ({
        product: item.product,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitCost: item.unitCost,
        selectedOptions: item.selectedOptions,
      })),
    };

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateFinancePurchase(editingId, payload);
        toast.success('Wholesale bill updated');
      } else {
        await adminApi.createFinancePurchase(payload);
        toast.success('Wholesale bill saved and lodged');
      }
      resetEntry();
      load();
      loadReport();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save wholesale bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Purchase Ledger</h2>
        <p className="text-sm text-slate-500 mt-1">
          Lodge supplier wholesale bills, then review the purchase ledger report and export CSV.
        </p>
      </div>

      {editingId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-amber-900">
            Editing bill <span className="font-mono font-semibold">{editingNumber}</span>. Change any field or line items, then save.
          </p>
          <button type="button" className="btn-secondary text-xs" onClick={resetEntry}>
            Cancel edit
          </button>
        </div>
      )}

      {/* Bill header */}
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
          <div className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Select wholesale supplier *
            </label>
            <select
              className="input-field text-sm"
              value={header.vendor}
              onChange={(e) => {
                const vendorId = e.target.value;
                const vendor = vendors.find((v) => v._id === vendorId);
                setHeader((h) => ({
                  ...h,
                  vendor: vendorId,
                  purchaseType: vendor ? vendorBillToPurchaseType(vendor.billType) : h.purchaseType,
                }));
              }}
            >
              <option value="">Choose supplier</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Bill / invoice number *
            </label>
            <input
              className="input-field text-sm"
              placeholder="e.g. 2154"
              value={header.invoiceRef}
              onChange={(e) => setHeader((h) => ({ ...h, invoiceRef: e.target.value }))}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Bill purchase type
            </label>
            <select
              className="input-field text-sm"
              value={header.purchaseType}
              onChange={(e) => setHeader((h) => ({ ...h, purchaseType: e.target.value }))}
            >
              {PURCHASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Purchase entry date
            </label>
            <input
              type="date"
              className="input-field text-sm"
              value={header.purchaseDate}
              onChange={(e) => setHeader((h) => ({ ...h, purchaseDate: e.target.value }))}
            />
          </div>
          <div className="min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Source treasury account *
            </label>
            <select
              className="input-field text-sm"
              value={header.treasuryAccount}
              onChange={(e) => setHeader((h) => ({ ...h, treasuryAccount: e.target.value }))}
            >
              <option value="">Choose account</option>
              {accounts.filter((a) => a.isActive !== false).map((a) => (
                <option key={a._id} value={a._id}>{treasuryLabel(a)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Entry workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
        {/* Left — add product */}
        <div className="xl:col-span-5 card p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Add product item to bill</h3>

          <div className="relative z-30">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
              Search gifting product (by name or SKU) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>🔍</span>
              <input
                className="input-field pl-9 text-sm"
                placeholder="Type at least 2 characters, e.g. red rose"
                value={productQuery}
                onFocus={() => {
                  if (productQuery.trim().length >= 2 && !selectedProduct) setSearchOpen(true);
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  setProductQuery(value);
                  if (selectedProduct && value !== selectedProduct.name) {
                    setSelectedProduct(null);
                  }
                  if (value.trim().length >= 2) setSearchOpen(true);
                }}
              />
            </div>
            {searching && <p className="text-xs text-slate-400 mt-1">Searching catalog...</p>}
            {searchOpen && productQuery.trim().length >= 2 && !selectedProduct && !searching && searchResults.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No products found for &ldquo;{productQuery.trim()}&rdquo;</p>
            )}
            {searchOpen && searchResults.length > 0 && !selectedProduct && (
              <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => selectProduct(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3"
                  >
                    {productImage(p) ? (
                      <img src={productImage(p)} alt="" className="w-10 h-10 rounded object-cover border shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-slate-100 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.sku || 'No SKU'} · Stock: {p.stock ?? 0}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 sm:p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Selected match</p>
                <button type="button" onClick={clearProductPicker} className="text-[10px] font-bold uppercase text-slate-500 hover:text-slate-800">
                  Clear
                </button>
              </div>
              <div className="flex gap-3">
                {productImage(selectedProduct) ? (
                  <img src={productImage(selectedProduct)} alt="" className="w-16 h-16 rounded-lg object-cover border border-white shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white border shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{selectedProduct.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">SKU: {selectedProduct.sku || '—'}</p>
                  <p className="text-xs text-slate-500">
                    Current stock:{' '}
                    {getTrackingCategories(selectedProduct).length
                      ? `${selectedProduct.stock ?? 0} total (per variation below)`
                      : (selectedProduct.stock ?? 0)}
                  </p>
                </div>
              </div>
              {getTrackingCategories(selectedProduct).map((cat) => (
                <div key={cat._id || cat.name}>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">
                    {cat.name} (stock variation) *
                  </label>
                  <select
                    className="input-field text-sm"
                    value={lineOptions[cat.name] || ''}
                    onChange={(e) =>
                      setLineOptions((prev) => ({ ...prev, [cat.name]: e.target.value }))
                    }
                  >
                    {(cat.options || []).map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label} — stock {opt.stock ?? 0}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {!getTrackingCategories(selectedProduct).length &&
                (selectedProduct.optionCategories || []).length > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                    This product has variables but none track inventory. Enable &ldquo;Track stock per option&rdquo;
                    on Size / Weight in the product form to stock variations separately.
                  </p>
                )}
              {(selectedProduct.images || []).length > 1 && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">Product gallery</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {selectedProduct.images.slice(0, 6).map((img, idx) => (
                      <img key={idx} src={img.url} alt="" className="w-10 h-10 rounded object-cover border border-white shrink-0" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">Quantity *</label>
              <input
                type="number"
                min={1}
                className="input-field text-sm"
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500 block mb-1">Rate (Rs.) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input-field text-sm"
                value={lineRate}
                onChange={(e) => setLineRate(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Calculated subtotal</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{fmtNpr(lineSubtotal)}</span>
          </div>

          <button
            type="button"
            onClick={addLineToDraft}
            disabled={!selectedProduct}
            className="w-full min-h-[44px] rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            + Add item to bill draft
          </button>
        </div>

        {/* Right — bill draft */}
        <div className="xl:col-span-7 card p-4 sm:p-5 flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Wholesale bill items draft ({draftItems.length})
            </h3>
            {draftItems.length > 0 && (
              <button type="button" onClick={clearBill} className="text-xs font-bold uppercase text-rose-600 hover:underline shrink-0">
                Clear bill
              </button>
            )}
          </div>

          {draftItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Search and add products to build the wholesale bill draft.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1 flex-1">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 border-b">
                    <th className="py-2 pr-3">Product &amp; SKU</th>
                    <th className="py-2 pr-3 text-center">Qty</th>
                    <th className="py-2 pr-3 text-right">Cost rate</th>
                    <th className="py-2 pr-3 text-right">Subtotal</th>
                    <th className="py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((item) => {
                    const sub = item.quantity * item.unitCost;
                    return (
                      <tr key={item.key} className="border-b border-slate-100">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.image ? (
                              <img src={item.image} alt="" className="w-10 h-10 rounded object-cover border shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-slate-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 line-clamp-2">{item.name}</p>
                              <p className="text-xs text-slate-500">{item.sku || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-center">
                          <input
                            type="number"
                            min={1}
                            className="input-field text-sm w-16 py-1 text-center mx-auto"
                            value={item.quantity}
                            onChange={(e) =>
                              updateDraftItem(item.key, {
                                quantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                          />
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="input-field text-sm w-24 py-1 text-right ml-auto"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateDraftItem(item.key, {
                                unitCost: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                        </td>
                        <td className="py-3 pr-3 text-right tabular-nums font-semibold">{fmtNpr(sub)}</td>
                        <td className="py-3 text-right">
                          <button type="button" onClick={() => removeDraftItem(item.key)} className="text-slate-400 hover:text-rose-600" aria-label="Remove">
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Taxable subtotal (excl. VAT)</span>
              <span className="font-semibold tabular-nums">{fmtNpr(taxableSubtotal)}</span>
            </div>
            {purchaseTypeMeta.rate > 0 && (
              <div className="flex justify-between text-sm text-rose-600">
                <span>⚡ Calculated {Math.round(purchaseTypeMeta.rate * 100)}% Nepal VAT</span>
                <span className="font-semibold tabular-nums">+{fmtNpr(vatAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-sm font-bold text-slate-900">Grand total</span>
              <span className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">{fmtNpr(grandTotal)}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {draftItems.length} products | {draftUnits} units | Mode: {purchaseTypeMeta.label.replace(' Bill', '')}
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-600 pt-1">
              <input
                type="checkbox"
                checked={header.stockReceived}
                onChange={(e) => setHeader((h) => ({ ...h, stockReceived: e.target.checked }))}
              />
              Receive stock into inventory when bill is lodged
            </label>

            <button
              type="button"
              onClick={lodgeBill}
              disabled={saving || !draftItems.length}
              className="w-full min-h-[48px] mt-2 rounded-lg bg-[#e11d48] text-white text-sm sm:text-base font-bold hover:bg-[#be123c] disabled:opacity-50 transition-colors"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? `✓ Update bill ${editingNumber}`
                  : '✓ Save & lodge wholesale bill'}
            </button>
            {editingId && (
              <button type="button" onClick={resetEntry} className="w-full btn-secondary text-sm mt-2">
                Cancel edit / start new bill
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Purchase entry report */}
      <div className="space-y-4">
        <div className="card flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Purchase Ledger Report</h3>
            <p className="text-sm text-slate-500 mt-1">Summary of lodged wholesale bills for a custom date range.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <DateRangeFilter
              startDate={reportRange.startDate}
              endDate={reportRange.endDate}
              onChange={setReportRange}
            />
            <ExportCsvButton onExport={exportReportCsv} />
          </div>
        </div>

        {reportLoading ? (
          <p className="text-slate-400 text-sm">Loading report...</p>
        ) : !report ? (
          <div className="card text-slate-500 text-sm">Unable to load purchase report.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <StatCard label="Bills lodged" value={report.summary.billCount} />
              <StatCard label="Product lines" value={report.summary.productLines} />
              <StatCard label="Units purchased" value={report.summary.totalUnits.toLocaleString()} />
              <StatCard label="VAT total" value={fmtNpr(report.summary.vatTotal)} />
              <StatCard label="Grand total" value={fmtNpr(report.summary.grandTotal)} tone="positive" />
            </div>

            <div className="card overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 border-b">
                    <th className="py-2 pr-3">PO #</th>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Bill type</th>
                    <th className="py-2 pr-3 text-right">Subtotal</th>
                    <th className="py-2 pr-3 text-right">VAT</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3">Treasury</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.purchases || []).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No purchase entries in this date range.
                      </td>
                    </tr>
                  ) : (
                    report.purchases.map((row) => (
                      <tr key={row._id} className="border-b border-slate-100">
                        <td className="py-3 pr-3 font-mono text-xs">{row.purchaseNumber}</td>
                        <td className="py-3 pr-3">{row.invoiceRef || '—'}</td>
                        <td className="py-3 pr-3">{new Date(row.purchaseDate).toLocaleDateString()}</td>
                        <td className="py-3 pr-3">{row.vendor?.name}</td>
                        <td className="py-3 pr-3">{PURCHASE_TYPE_LABELS[row.purchaseType] || row.purchaseType}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.subtotal)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.tax)}</td>
                        <td className="py-3 pr-3 text-right tabular-nums font-semibold">{fmtNpr(row.total)}</td>
                        <td className="py-3 pr-3">{row.treasuryAccount?.name || '—'}</td>
                        <td className="py-3 capitalize">{row.paymentStatus}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <h3 className="font-semibold text-slate-900">Recent wholesale bills</h3>
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setRange} />
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading purchase history...</p>
        ) : rows.length === 0 ? (
          <div className="card text-slate-500 text-sm">No lodged bills in this period.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b">
                  <th className="py-2 pr-3">PO #</th>
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Items</th>
                  <th className="py-2 pr-3">Subtotal</th>
                  <th className="py-2 pr-3">VAT</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 font-mono text-xs">{row.purchaseNumber}</td>
                    <td className="py-3 pr-3">{row.invoiceRef || '—'}</td>
                    <td className="py-3 pr-3">{new Date(row.purchaseDate).toLocaleDateString()}</td>
                    <td className="py-3 pr-3">{row.vendor?.name}</td>
                    <td className="py-3 pr-3">{PURCHASE_TYPE_LABELS[row.purchaseType] || row.purchaseType}</td>
                    <td className="py-3 pr-3">{row.items?.length || 0}</td>
                    <td className="py-3 pr-3 tabular-nums">{fmtNpr(row.subtotal)}</td>
                    <td className="py-3 pr-3 tabular-nums">{fmtNpr(row.tax)}</td>
                    <td className="py-3 pr-3 font-semibold tabular-nums">{fmtNpr(row.total)}</td>
                    <td className="py-3 pr-3 capitalize">{row.paymentStatus}</td>
                    <td className="py-3 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-xs text-primary-600 font-medium mr-3"
                        onClick={() => beginEdit(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-rose-600 font-medium"
                        onClick={() => removePurchase(row)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
