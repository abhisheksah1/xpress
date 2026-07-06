import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { DEFAULT_API_PARTNER_ORDER_FIELDS } from '../../config/apiPartnerDefaults.js';

const emptyForm = () => ({
  integrationName: '',
  companyName: '',
  contactPerson: '',
  email: '',
  status: 'active',
  allowAllProducts: false,
  allowedProducts: [],
  allowedDeliveryLocations: [],
  orderFields: DEFAULT_API_PARTNER_ORDER_FIELDS.map((f) => ({ ...f })),
  ipWhitelist: [],
  rateLimitPerMinute: 120,
});

function ModalShell({ children, onClose, wide }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full ${wide ? 'max-w-4xl xl:max-w-5xl' : 'max-w-lg'} my-4 sm:my-6`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function CredentialsModal({ open, credentials, onClose }) {
  if (!open || !credentials) return null;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 sm:p-6 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900">API credentials</h3>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Copy these now. The API secret is shown only once.
        </p>
        {[
          ['API Username', credentials.apiUsername],
          ['API Key', credentials.apiKey],
          ['API Secret', credentials.apiSecret],
        ].map(([label, value]) => (
          <div key={label}>
            <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
            <div className="flex gap-2 mt-1">
              <input className="input-field font-mono text-sm flex-1" readOnly value={value} />
              <button type="button" className="btn-secondary shrink-0" onClick={() => copy(value, label)}>
                Copy
              </button>
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </ModalShell>
  );
}

function PartnerFormModal({ open, initial, products, locations, onClose, onSave, saving }) {
  const [form, setForm] = useState(emptyForm());
  const [productSearch, setProductSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setProductSearch('');
    setLocationSearch('');
    if (!initial) {
      setForm(emptyForm());
      return;
    }
    setForm({
      integrationName: initial.integrationName || '',
      companyName: initial.companyName || '',
      contactPerson: initial.contactPerson || '',
      email: initial.email || '',
      status: initial.status || 'active',
      allowAllProducts: Boolean(initial.allowAllProducts),
      allowedProducts: (initial.allowedProducts || []).map((p) => p._id || p),
      allowedDeliveryLocations: (initial.allowedDeliveryLocations || []).map((l) => l._id || l),
      orderFields: initial.orderFields?.length
        ? initial.orderFields
        : DEFAULT_API_PARTNER_ORDER_FIELDS.map((f) => ({ ...f })),
      ipWhitelist: initial.ipWhitelist || [],
      rateLimitPerMinute: initial.rateLimitPerMinute || 120,
    });
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleId = (key, id) => {
    setForm((f) => {
      const list = f[key];
      return {
        ...f,
        [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  };

  const toggleField = (key, patch) => {
    setForm((f) => ({
      ...f,
      orderFields: f.orderFields.map((field) =>
        field.key === key ? { ...field, ...patch } : field
      ),
    }));
  };

  const filteredProducts = products.filter((p) =>
    !productSearch.trim() || p.name?.toLowerCase().includes(productSearch.trim().toLowerCase())
  );
  const filteredLocations = locations.filter((l) =>
    !locationSearch.trim() || l.name?.toLowerCase().includes(locationSearch.trim().toLowerCase())
  );

  return (
    <ModalShell onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="bg-white rounded-xl shadow-xl flex flex-col max-h-[calc(100vh-2rem)] min-w-0"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">
            {initial?._id ? 'Edit API Partner' : 'Create API Partner'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Configure partner access, products, locations, and order fields.</p>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Integration name *</label>
            <input className="input-field" required value={form.integrationName} onChange={(e) => set('integrationName', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Company name</label>
            <input className="input-field" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Contact person</label>
            <input className="input-field" value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Email</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-slate-500 block mb-1">Rate limit (req/min)</label>
            <input type="number" min={10} className="input-field w-full" value={form.rateLimitPerMinute} onChange={(e) => set('rateLimitPerMinute', Number(e.target.value))} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">IP whitelist (optional, one per line)</label>
          <textarea
            className="input-field font-mono text-sm"
            rows={2}
            value={(form.ipWhitelist || []).join('\n')}
            onChange={(e) => set('ipWhitelist', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
            placeholder="203.0.113.10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold uppercase text-slate-500">Allowed products</p>
              {!form.allowAllProducts && (
                <span className="text-[10px] text-slate-400">{form.allowedProducts.length} selected</span>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowAllProducts}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm((f) => ({
                    ...f,
                    allowAllProducts: checked,
                    allowedProducts: checked ? [] : f.allowedProducts,
                  }));
                }}
              />
              Allow all products
            </label>
            {form.allowAllProducts ? (
              <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3 bg-slate-50">
                This partner can access every active product in the catalog via the API.
              </p>
            ) : (
              <>
            <input
              className="input-field text-sm mb-2"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            <div className="h-48 sm:h-56 lg:h-64 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {filteredProducts.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No products match your search.</p>
              ) : filteredProducts.map((p) => (
                <label key={p._id} className="flex items-start gap-2 text-sm py-0.5 cursor-pointer hover:bg-slate-50 rounded px-1">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={form.allowedProducts.includes(p._id)}
                    onChange={() => toggleId('allowedProducts', p._id)}
                  />
                  <span className="min-w-0 break-words leading-snug">{p.name}</span>
                </label>
              ))}
            </div>
              </>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold uppercase text-slate-500">Allowed delivery locations</p>
              <span className="text-[10px] text-slate-400">{form.allowedDeliveryLocations.length} selected</span>
            </div>
            <input
              className="input-field text-sm mb-2"
              placeholder="Search locations..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
            <div className="h-48 sm:h-56 lg:h-64 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {filteredLocations.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No locations match your search.</p>
              ) : filteredLocations.map((l) => (
                <label key={l._id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-slate-50 rounded px-1">
                  <input
                    type="checkbox"
                    className="shrink-0"
                    checked={form.allowedDeliveryLocations.includes(l._id)}
                    onChange={() => toggleId('allowedDeliveryLocations', l._id)}
                  />
                  <span className="min-w-0 break-words">{l.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500 mb-2">Order fields</p>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[320px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Field</th>
                  <th className="px-3 py-2">Enabled</th>
                  <th className="px-3 py-2">Required</th>
                </tr>
              </thead>
              <tbody>
                {form.orderFields.map((field) => (
                  <tr key={field.key} className="border-t border-slate-100">
                    <td className="px-3 py-2">{field.label}</td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        onChange={(e) => toggleField(field.key, { enabled: e.target.checked, required: e.target.checked ? field.required : false })}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={!field.enabled}
                        onChange={(e) => toggleField(field.key, { required: e.target.checked })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0 bg-white rounded-b-xl">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default function ApiPartnersPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, partner: null });
  const [credentials, setCredentials] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsPartner, setLogsPartner] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [partnersRes, productsRes, locationsRes] = await Promise.all([
        adminApi.getApiPartners(),
        adminApi.getProducts({ limit: 500, status: 'active' }),
        adminApi.getDeliveryLocations(),
      ]);
      setRows(partnersRes.data.data?.partners || []);
      setProducts(productsRes.data.data?.products || []);
      setLocations(locationsRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load API partners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (modal.partner?._id) {
        await adminApi.updateApiPartner(modal.partner._id, payload);
        toast.success('API partner updated');
      } else {
        const { data } = await adminApi.createApiPartner(payload);
        setCredentials(data.data?.credentials || null);
        toast.success('API partner created');
      }
      setModal({ open: false, partner: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save API partner');
    } finally {
      setSaving(false);
    }
  };

  const resetCredentials = async (id) => {
    if (!window.confirm('Reset API credentials? Existing integrations will stop working until updated.')) return;
    try {
      const { data } = await adminApi.resetApiPartnerCredentials(id);
      setCredentials(data.data?.credentials || null);
      toast.success('Credentials reset');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset credentials');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this API partner?')) return;
    try {
      await adminApi.deleteApiPartner(id);
      toast.success('API partner deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const downloadDocs = async (id, name) => {
    try {
      const res = await adminApi.downloadApiPartnerDocs(id);
      const blob = new Blob([res.data], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-api-docs.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download documentation');
    }
  };

  const viewLogs = async (partner) => {
    try {
      const { data } = await adminApi.getApiPartnerLogs(partner._id);
      setLogs(data.data?.logs || []);
      setLogsPartner(partner);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load logs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Gateway Partners</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage third-party integrations. Orders use NPR + manual payment only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className="btn-primary" onClick={() => setModal({ open: true, partner: null })}>
          + Create API user
        </button>
        <Link to="/admin/api-partners/reports" className="btn-secondary">
          Partner reports
        </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="card text-slate-500">No API partners yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row._id} className="card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{row.integrationName}</p>
                <p className="text-sm text-slate-500">
                  {row.companyName || '—'} · <span className="font-mono">{row.apiUsername}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Products: {row.allowAllProducts ? 'All' : (row.allowedProducts?.length || 0)} · Locations: {row.allowedDeliveryLocations?.length || 0} ·
                  {' '}
                  <span className={row.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}>{row.status}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setModal({ open: true, partner: row })}>Edit</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => resetCredentials(row._id)}>Reset credentials</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => downloadDocs(row._id, row.apiUsername)}>Download docs</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => viewLogs(row)}>Activity logs</button>
                <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => remove(row._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PartnerFormModal
        open={modal.open}
        initial={modal.partner}
        products={products}
        locations={locations}
        onClose={() => setModal({ open: false, partner: null })}
        onSave={save}
        saving={saving}
      />

      <CredentialsModal open={!!credentials} credentials={credentials} onClose={() => setCredentials(null)} />

      {logsPartner && (
        <ModalShell onClose={() => { setLogsPartner(null); setLogs([]); }} wide>
          <div className="bg-white rounded-xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col min-w-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-semibold truncate pr-4">Activity logs — {logsPartner.integrationName}</h3>
              <button type="button" className="text-sm text-slate-500 shrink-0" onClick={() => { setLogsPartner(null); setLogs([]); }}>Close</button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2 text-sm flex-1 min-h-0">
              {logs.length === 0 ? (
                <p className="text-slate-400">No activity yet.</p>
              ) : logs.map((log) => (
                <div key={log._id} className="border border-slate-100 rounded-lg px-3 py-2">
                  <p className="font-mono text-xs">{log.method} {log.path} · {log.statusCode}</p>
                  <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()} · {log.ip} · {log.durationMs}ms</p>
                  {log.errorMessage && <p className="text-xs text-rose-600">{log.errorMessage}</p>}
                </div>
              ))}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
