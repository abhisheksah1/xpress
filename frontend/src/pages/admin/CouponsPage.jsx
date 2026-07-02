import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { DEFAULT_PAYMENT_GATEWAYS } from '../../config/paymentGateways.js';

const DISCOUNT_TYPES = [
  { value: 'flat', label: 'Flat amount (Rs.)' },
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'percent_capped', label: 'Percentage with max cap (%)' },
];

const APPLIES_TO = [
  { value: 'order', label: 'Entire order subtotal' },
  { value: 'category', label: 'Specific categories only' },
  { value: 'shipping', label: 'Delivery / shipping fee' },
  { value: 'payment_gateway', label: 'Payment gateway specific' },
];

const GATEWAYS = DEFAULT_PAYMENT_GATEWAYS.map((g) => ({ id: g.id, label: g.displayLabel || g.id }));

const emptyForm = () => ({
  code: '',
  name: '',
  description: '',
  discountType: 'flat',
  appliesTo: 'order',
  value: '',
  maxDiscount: '',
  categoryIds: [],
  paymentGatewayIds: [],
  minOrderAmount: '',
  maxUses: '',
  perUserLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
});

function CouponModal({ open, initial, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        code: initial.code || '',
        name: initial.name || '',
        description: initial.description || '',
        discountType: initial.discountType || 'flat',
        appliesTo: initial.appliesTo || 'order',
        value: initial.value ?? '',
        maxDiscount: initial.maxDiscount ?? '',
        categoryIds: (initial.categoryIds || []).map((c) => c._id || c),
        paymentGatewayIds: initial.paymentGatewayIds || [],
        minOrderAmount: initial.minOrderAmount ?? '',
        maxUses: initial.maxUses ?? '',
        perUserLimit: initial.perUserLimit ?? '',
        startsAt: initial.startsAt ? initial.startsAt.slice(0, 10) : '',
        expiresAt: initial.expiresAt ? initial.expiresAt.slice(0, 10) : '',
        isActive: initial.isActive !== false,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  if (!open) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleId = (key, id) => {
    const list = form[key] || [];
    set(key, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value),
      maxDiscount: form.maxDiscount !== '' ? Number(form.maxDiscount) : undefined,
      minOrderAmount: form.minOrderAmount !== '' ? Number(form.minOrderAmount) : 0,
      maxUses: form.maxUses !== '' ? Number(form.maxUses) : undefined,
      perUserLimit: form.perUserLimit !== '' ? Number(form.perUserLimit) : undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      categoryIds: form.appliesTo === 'category' ? form.categoryIds : [],
      paymentGatewayIds: form.appliesTo === 'payment_gateway' ? form.paymentGatewayIds : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-lg">{initial?._id ? 'Edit Coupon' : 'Create Coupon'}</h3>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Coupon code *</label>
              <input className="input-field uppercase" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required placeholder="SAVE10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display name *</label>
              <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input className="input-field" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Internal note or customer-facing hint" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Discount type *</label>
              <select className="input-field" value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                {DISCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Applies to *</label>
              <select className="input-field" value={form.appliesTo} onChange={(e) => set('appliesTo', e.target.value)}>
                {APPLIES_TO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {form.discountType === 'flat' ? 'Amount (Rs.) *' : 'Percent (%) *'}
              </label>
              <input type="number" min="0" className="input-field" value={form.value} onChange={(e) => set('value', e.target.value)} required />
            </div>
            {form.discountType === 'percent_capped' && (
              <div>
                <label className="block text-sm font-medium mb-1">Max discount (Rs.) *</label>
                <input type="number" min="0" className="input-field" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Min order (Rs.)</label>
              <input type="number" min="0" className="input-field" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} />
            </div>
          </div>

          {form.appliesTo === 'category' && (
            <div>
              <label className="block text-sm font-medium mb-2">Categories *</label>
              <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {categories.map((cat) => (
                  <label key={cat._id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.categoryIds.includes(cat._id)} onChange={() => toggleId('categoryIds', cat._id)} />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.appliesTo === 'payment_gateway' && (
            <div>
              <label className="block text-sm font-medium mb-2">Payment gateways *</label>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                {GATEWAYS.map((gw) => (
                  <label key={gw.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.paymentGatewayIds.includes(gw.id)} onChange={() => toggleId('paymentGatewayIds', gw.id)} />
                    {gw.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Max total uses</label>
              <input type="number" min="0" className="input-field" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max uses per customer</label>
              <input type="number" min="0" className="input-field" value={form.perUserLimit} onChange={(e) => set('perUserLimit', e.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valid from</label>
              <input type="date" className="input-field" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valid until</label>
              <input type="date" className="input-field" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Active (customers can use this coupon)
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Coupon'}</button>
        </div>
      </form>
    </div>
  );
}

function typeLabel(coupon) {
  if (coupon.discountType === 'flat') return `Rs. ${coupon.value} off`;
  if (coupon.discountType === 'percent') return `${coupon.value}% off`;
  return `${coupon.value}% off (max Rs. ${coupon.maxDiscount})`;
}

function scopeLabel(coupon) {
  const map = {
    order: 'Order',
    category: 'Category',
    shipping: 'Delivery fee',
    payment_gateway: 'Payment gateway',
  };
  return map[coupon.appliesTo] || coupon.appliesTo;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, coupon: null });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.getCoupons({ search: search || undefined, limit: 100 }),
      adminApi.getCategories(),
    ])
      .then(([couponRes, catRes]) => {
        setCoupons(couponRes.data.data?.coupons || []);
        setCategories(catRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load coupons'))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modal.coupon?._id) {
        await adminApi.updateCoupon(modal.coupon._id, payload);
        toast.success('Coupon updated');
      } else {
        await adminApi.createCoupon(payload);
        toast.success('Coupon created');
      }
      setModal({ open: false, coupon: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      await adminApi.deleteCoupon(coupon._id);
      toast.success('Coupon deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const loadReport = async () => {
    setReportLoading(true);
    try {
      const params = {};
      if (reportFrom) params.from = reportFrom;
      if (reportTo) params.to = reportTo;
      const { data } = await adminApi.getCouponUsageReport(params);
      setReport(data.data);
    } catch (err) {
      setReport(null);
      toast.error(err.response?.data?.message || 'Failed to load coupon report');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Coupons</h1>
          <p className="text-sm text-gray-500 mt-1">
            Flat, percent, category-wise, payment gateway, and delivery fee discounts.
          </p>
        </div>
        <button type="button" onClick={() => setModal({ open: true, coupon: null })} className="btn-primary">
          + New Coupon
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Coupon Usage Report</h2>
            <p className="text-sm text-gray-500 mt-1">
              See how many times each coupon was used, total discount given, and total order value for a date range.
            </p>
          </div>
          <button type="button" onClick={loadReport} className="btn-secondary" disabled={reportLoading}>
            {reportLoading ? 'Loading...' : 'Load report'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input type="date" className="input-field" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input type="date" className="input-field" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => {
                setReportFrom('');
                setReportTo('');
                setReport(null);
              }}
              disabled={reportLoading}
            >
              Clear
            </button>
          </div>
        </div>

        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total uses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{report.totals?.uses || 0}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total discount</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">Rs. {(report.totals?.totalDiscount || 0).toLocaleString('en-NP')}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                <p className="text-xs text-gray-500 uppercase font-semibold">Total order value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Rs. {(report.totals?.totalOrderValue || 0).toLocaleString('en-NP')}</p>
              </div>
            </div>

            {(report.rows || []).length === 0 ? (
              <p className="text-sm text-gray-400">No coupon usage found in this date range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                      <th className="py-2 pr-4">Coupon</th>
                      <th className="py-2 pr-4">Uses</th>
                      <th className="py-2 pr-4">Total discount</th>
                      <th className="py-2 pr-4">Total order value</th>
                      <th className="py-2 pr-4">Scope</th>
                      <th className="py-2">Last used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row._id} className="border-b border-gray-50">
                        <td className="py-3 pr-4">
                          <span className="font-mono font-bold text-primary-600">{row.code}</span>
                          {row.name && <p className="text-xs text-gray-400">{row.name}</p>}
                        </td>
                        <td className="py-3 pr-4 font-semibold">{row.uses}</td>
                        <td className="py-3 pr-4 text-emerald-700 font-semibold">
                          Rs. {(row.totalDiscount || 0).toLocaleString('en-NP')}
                        </td>
                        <td className="py-3 pr-4">
                          Rs. {(row.totalOrderValue || 0).toLocaleString('en-NP')}
                        </td>
                        <td className="py-3 pr-4">{row.appliesTo || '—'}</td>
                        <td className="py-3">
                          {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <input
          className="input-field max-w-sm mb-4"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : coupons.length === 0 ? (
          <p className="text-gray-400 text-sm">No coupons yet. Create your first discount code.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Discount</th>
                  <th className="py-2 pr-4">Scope</th>
                  <th className="py-2 pr-4">Usage</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b border-gray-50">
                    <td className="py-3 pr-4">
                      <span className="font-mono font-bold text-primary-600">{coupon.code}</span>
                      <p className="text-xs text-gray-400">{coupon.name}</p>
                    </td>
                    <td className="py-3 pr-4">{typeLabel(coupon)}</td>
                    <td className="py-3 pr-4">
                      {scopeLabel(coupon)}
                      {coupon.appliesTo === 'category' && coupon.categoryIds?.length > 0 && (
                        <p className="text-xs text-gray-400">{coupon.categoryIds.map((c) => c.name).join(', ')}</p>
                      )}
                      {coupon.appliesTo === 'payment_gateway' && coupon.paymentGatewayIds?.length > 0 && (
                        <p className="text-xs text-gray-400">{coupon.paymentGatewayIds.join(', ')}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {coupon.usedCount || 0}
                      {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setModal({ open: true, coupon })} className="text-primary-600 text-xs font-medium">Edit</button>
                        <button type="button" onClick={() => handleDelete(coupon)} className="text-red-500 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CouponModal
        open={modal.open}
        initial={modal.coupon}
        categories={categories}
        onClose={() => setModal({ open: false, coupon: null })}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
