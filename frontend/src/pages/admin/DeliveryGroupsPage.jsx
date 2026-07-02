import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const METHOD_LABELS = {
  local_arrangement: 'Local Arrangement',
  courier_local: 'Courier / Local Arrangement',
  courier: 'Courier',
};

const formatLocationTimeSlots = (loc) => {
  if (!loc.timeSlotsEnabled) return '—';
  const slots = (loc.timeSlots || []).filter((s) => s.enabled !== false);
  if (!slots.length) return 'Enabled (no slots)';
  return slots.map((s) => {
    const fee = Number(s.fee || 0);
    return `${s.label}${fee > 0 ? ` (+Rs.${fee})` : ''}`;
  }).join(', ');
};

function LocationModal({ open, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState({ name: '', deliveryFee: 100, timeSlotsEnabled: false, timeSlots: [] });
  useEffect(() => {
    if (open) {
      const base = initial || { name: '', deliveryFee: 100, timeSlotsEnabled: false, timeSlots: [] };
      setForm({
        ...base,
        deliveryFee: base.deliveryFee ?? 100,
        timeSlotsEnabled: !!base.timeSlotsEnabled,
        timeSlots: Array.isArray(base.timeSlots) ? base.timeSlots : [],
      });
    }
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            deliveryFee: Number(form.deliveryFee),
            timeSlotsEnabled: !!form.timeSlotsEnabled,
            timeSlots: (form.timeSlots || []).map((s, i) => ({
              id: s.id || `slot_${Date.now()}_${i}`,
              label: s.label || '',
              start: s.start || '',
              end: s.end || '',
              fee: Number(s.fee || 0),
              enabled: s.enabled !== false,
              sortOrder: Number(s.sortOrder ?? i),
            })),
          });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">{initial?._id ? 'Edit Location' : 'Create Delivery Location'}</h3>
        <div>
          <label className="block text-sm font-medium mb-1">District / City Location Name</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Charge in Base Currency (NPR)</label>
          <input type="number" min="0" className="input-field" value={form.deliveryFee} onChange={(e) => setForm((f) => ({ ...f, deliveryFee: e.target.value }))} required />
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!form.timeSlotsEnabled}
              onChange={(e) => setForm((f) => ({ ...f, timeSlotsEnabled: e.target.checked }))}
            />
            Enable time slot selection for this location
          </label>
          <p className="text-xs text-gray-400 mt-1">
            Only locations with this enabled will show time slot options on checkout. Each time slot can have its own additional fee.
          </p>
        </div>

        {form.timeSlotsEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Time slots</p>
              <button
                type="button"
                className="text-xs text-primary-600 font-medium"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    timeSlots: [
                      ...(f.timeSlots || []),
                      { id: `slot_${Date.now()}`, label: '', start: '09:00', end: '12:00', fee: 0, enabled: true, sortOrder: (f.timeSlots || []).length },
                    ],
                  }))
                }
              >
                + Add slot
              </button>
            </div>

            {(form.timeSlots || []).length === 0 && (
              <p className="text-xs text-gray-400">No slots added yet.</p>
            )}

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(form.timeSlots || []).map((slot, idx) => (
                <div key={slot.id || idx} className="border border-gray-100 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={slot.enabled !== false}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            timeSlots: f.timeSlots.map((s, i) => (i === idx ? { ...s, enabled: e.target.checked } : s)),
                          }))
                        }
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      className="text-xs text-red-500"
                      onClick={() => setForm((f) => ({ ...f, timeSlots: f.timeSlots.filter((_, i) => i !== idx) }))}
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    className="input-field"
                    placeholder="Slot label (e.g. Morning 9–12)"
                    value={slot.label || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        timeSlots: f.timeSlots.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s)),
                      }))
                    }
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start</label>
                      <input
                        className="input-field"
                        value={slot.start || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            timeSlots: f.timeSlots.map((s, i) => (i === idx ? { ...s, start: e.target.value } : s)),
                          }))
                        }
                        placeholder="09:00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End</label>
                      <input
                        className="input-field"
                        value={slot.end || ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            timeSlots: f.timeSlots.map((s, i) => (i === idx ? { ...s, end: e.target.value } : s)),
                          }))
                        }
                        placeholder="12:00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Additional fee (NPR)</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={slot.fee ?? 0}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          timeSlots: f.timeSlots.map((s, i) => (i === idx ? { ...s, fee: e.target.value } : s)),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function GroupModal({ open, initial, locations, categories, products, onClose, onSave, saving }) {
  const empty = {
    name: '',
    code: '',
    coverageLocations: [],
    deliveryMethod: 'local_arrangement',
    estimatedDeliveryLabel: '',
    estimatedDays: { min: 0, max: 1 },
    estimatedHours: '',
    cutoffTime: '16:00',
    categories: [],
    products: [],
    isActive: true,
    sortOrder: 0,
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        ...empty,
        ...initial,
        coverageLocations: (initial.coverageLocations || []).map((l) => l._id || l),
        categories: (initial.categories || []).map((c) => c._id || c),
        products: (initial.products || []).map((p) => p._id || p),
        estimatedHours: initial.estimatedHours ?? '',
      } : empty);
    }
  }, [open, initial]);

  if (!open) return null;

  const toggleId = (key, id) => {
    const list = form[key] || [];
    setForm((f) => ({
      ...f,
      [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            estimatedHours: form.estimatedHours === '' ? undefined : Number(form.estimatedHours),
            estimatedDays: {
              min: Number(form.estimatedDays?.min ?? 0),
              max: Number(form.estimatedDays?.max ?? 1),
            },
            sortOrder: Number(form.sortOrder || 0),
          });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">{initial?._id ? 'Edit Delivery Group' : 'Create Delivery Group'}</h3>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Delivery Group Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Same Day Delivery" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Group Code</label>
            <input className="input-field" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="grp_ktm (auto if empty)" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Coverage Locations</label>
          <p className="text-xs text-gray-400 mb-2">Select which delivery locations belong to this group</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2">
            {locations.map((loc) => (
              <button
                key={loc._id}
                type="button"
                onClick={() => toggleId('coverageLocations', loc._id)}
                className={`text-xs px-2 py-1 rounded border ${
                  form.coverageLocations.includes(loc._id)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select className="input-field" value={form.deliveryMethod} onChange={(e) => setForm((f) => ({ ...f, deliveryMethod: e.target.value }))}>
              {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Est. Delivery Time (label)</label>
            <input className="input-field" value={form.estimatedDeliveryLabel} onChange={(e) => setForm((f) => ({ ...f, estimatedDeliveryLabel: e.target.value }))} placeholder="Minimum 4 Hours" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Min Days</label>
            <input type="number" min="0" className="input-field" value={form.estimatedDays?.min ?? 0} onChange={(e) => setForm((f) => ({ ...f, estimatedDays: { ...f.estimatedDays, min: Number(e.target.value) } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Days</label>
            <input type="number" min="0" className="input-field" value={form.estimatedDays?.max ?? 1} onChange={(e) => setForm((f) => ({ ...f, estimatedDays: { ...f.estimatedDays, max: Number(e.target.value) } }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Est. Hours (optional)</label>
            <input type="number" min="0" className="input-field" value={form.estimatedHours} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="4" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cut-off Time (NST)</label>
            <input className="input-field" value={form.cutoffTime} onChange={(e) => setForm((f) => ({ ...f, cutoffTime: e.target.value }))} placeholder="16:00" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Categories in this group</label>
          <p className="text-xs text-gray-400 mb-2">All products in selected categories can be delivered via this group</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto border border-gray-100 rounded-lg p-2">
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => toggleId('categories', cat._id)}
                className={`text-xs px-2 py-1 rounded border ${
                  form.categories.includes(cat._id) ? 'bg-slate-800 text-white' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Specific products only</label>
          <p className="text-xs text-gray-400 mb-2">Optionally restrict to individual products (in addition to categories)</p>
          <select
            multiple
            className="input-field text-sm h-32"
            value={form.products}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                products: Array.from(e.target.selectedOptions, (o) => o.value),
              }))
            }
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Group'}</button>
        </div>
      </form>
    </div>
  );
}

function ProductsModal({ group, onClose }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!group) return;
    adminApi.getDeliveryGroupProducts(group._id)
      .then(({ data }) => setProducts(data.data))
      .finally(() => setLoading(false));
  }, [group]);

  if (!group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold">Products — {group.name}</h3>
          <button type="button" onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-400 text-sm">No products assigned. Add categories or products in group settings.</p>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p._id} className="text-sm flex justify-between border-b border-gray-50 pb-2">
                  <span>{p.name}</span>
                  <span className="text-gray-400">{p.category?.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryGroupsPage() {
  const [locations, setLocations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locModal, setLocModal] = useState(null);
  const [groupModal, setGroupModal] = useState(null);
  const [productsModal, setProductsModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [locRes, grpRes, catRes, prodRes] = await Promise.all([
        adminApi.getDeliveryLocations({ includeInactive: true }),
        adminApi.getDeliveryGroups({ includeInactive: true }),
        adminApi.getCategories(),
        adminApi.getProducts({ limit: 500, isActive: '' }),
      ]);
      setLocations(locRes.data.data);
      setGroups(grpRes.data.data);
      setCategories(catRes.data.data);
      setProducts(prodRes.data.data?.products || prodRes.data.data || []);
    } catch {
      toast.error('Failed to load delivery setup');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveLocation = async (data) => {
    setSaving(true);
    try {
      if (locModal?._id) await adminApi.updateDeliveryLocation(locModal._id, data);
      else await adminApi.createDeliveryLocation(data);
      toast.success('Location saved');
      setLocModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (loc) => {
    if (!confirm(`Delete location "${loc.name}"?`)) return;
    try {
      await adminApi.deleteDeliveryLocation(loc._id);
      toast.success('Location deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete location');
    }
  };

  const saveGroup = async (data) => {
    setSaving(true);
    try {
      if (groupModal?._id) await adminApi.updateDeliveryGroup(groupModal._id, data);
      else await adminApi.createDeliveryGroup(data);
      toast.success('Delivery group saved');
      setGroupModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (group) => {
    if (!confirm(`Delete group "${group.name}"?`)) return;
    try {
      await adminApi.deleteDeliveryGroup(group._id);
      toast.success('Group deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete group');
    }
  };

  const coverageLabel = (group) => {
    const names = (group.coverageLocations || []).map((l) => l.name || l);
    return names.length ? names.join(', ') : '—';
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading delivery setup...</div>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Delivery Setup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Step 1: Create delivery locations with base fees and optional time slots (per city). Step 2: Create delivery groups and assign locations, categories, and products.
        </p>
      </div>

      {/* Section 1: Locations */}
      <section className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Fulfillment Districts / Cities &amp; Shipping Rates (NPR)</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              These locations populate the checkout dropdown. Enable time slots per location (e.g. Kathmandu, Pokhara) and set an additional fee per slot. Fees are shown to customers at checkout and added to delivery automatically.
            </p>
          </div>
          <button type="button" onClick={() => setLocModal({})} className="btn-primary text-sm whitespace-nowrap">
            + Create Delivery Location
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">District / City Location Name</th>
              <th className="text-left px-4 py-3 font-semibold">Base Fee (NPR)</th>
              <th className="text-left px-4 py-3 font-semibold">Time Slots</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {locations.map((loc) => (
              <tr key={loc._id} className="hover:bg-gray-50 align-top">
                <td className="px-4 py-3 font-medium">{loc.name}</td>
                <td className="px-4 py-3">{loc.deliveryFee}</td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-md">{formatLocationTimeSlots(loc)}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button type="button" onClick={() => setLocModal(loc)} className="text-primary-600 text-xs font-medium">Edit</button>
                  <button type="button" onClick={() => deleteLocation(loc)} className="text-red-500 text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {!locations.length && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No delivery locations yet. Create your first location.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Section 2: Groups */}
      <section className="card p-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Product Delivery &amp; Availability Groups</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl">
              Groups set minimum/maximum delivery times and restrict products to specific shipping regions.
              Example: fresh cakes → Kathmandu-only 4-hour group; branded chocolates → nationwide next-day group.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!locations.length) {
                toast.error('Create delivery locations first');
                return;
              }
              setGroupModal({});
            }}
            className="btn-primary text-sm whitespace-nowrap"
            disabled={!locations.length}
          >
            + Create Delivery Group
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Delivery Group</th>
                <th className="text-left px-4 py-3 font-semibold">Coverage Area</th>
                <th className="text-left px-4 py-3 font-semibold">Method</th>
                <th className="text-left px-4 py-3 font-semibold">Est. Delivery Time</th>
                <th className="text-left px-4 py-3 font-semibold">Cut-off Time</th>
                <th className="text-left px-4 py-3 font-semibold">Products</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((group) => (
                <tr key={group._id} className="hover:bg-gray-50 align-top">
                  <td className="px-4 py-3">
                    <span className="font-medium block">{group.name}</span>
                    <span className="text-xs text-gray-400">ID: {group.code || group._id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">{coverageLabel(group)}</td>
                  <td className="px-4 py-3">{METHOD_LABELS[group.deliveryMethod] || group.deliveryMethod}</td>
                  <td className="px-4 py-3">{group.estimatedDeliveryLabel || `${group.estimatedDays?.min ?? 0}-${group.estimatedDays?.max ?? 1} days`}</td>
                  <td className="px-4 py-3">{group.cutoffTime ? `${group.cutoffTime} NST` : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setProductsModal(group)}
                      className="text-primary-600 text-xs font-medium hover:underline"
                    >
                      {group.productCount ?? 0} items
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button type="button" onClick={() => setGroupModal(group)} className="text-primary-600 text-xs font-medium">Edit</button>
                    <button type="button" onClick={() => deleteGroup(group)} className="text-red-500 text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!groups.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No delivery groups yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-400">
        Product-level rules can still be set per product under <Link to="/admin/products" className="text-primary-600">Catalog → Edit Product → Delivery Availability</Link>.
      </p>

      <LocationModal open={locModal !== null} initial={locModal?._id ? locModal : null} onClose={() => setLocModal(null)} onSave={saveLocation} saving={saving} />
      <GroupModal
        open={groupModal !== null}
        initial={groupModal?._id ? groupModal : null}
        locations={locations}
        categories={categories}
        products={products}
        onClose={() => setGroupModal(null)}
        onSave={saveGroup}
        saving={saving}
      />
      <ProductsModal group={productsModal} onClose={() => setProductsModal(null)} />
    </div>
  );
}
