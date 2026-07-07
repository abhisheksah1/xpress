import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { ExportCsvButton, VENDOR_BILL_LABELS, VENDOR_BILL_TYPES, downloadBlob } from './financeUtils.jsx';

const emptyVendor = () => ({
  name: '',
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  paymentTerms: '',
  billType: 'pan',
  panNumber: '',
  vatNumber: '',
  notes: '',
  status: 'active',
});

export default function FinanceVendorsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, vendor: null });
  const [form, setForm] = useState(emptyVendor());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getFinanceVendors({ search, limit: 100 })
      .then((res) => setRows(res.data.data.vendors || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modal.open) return;
    setForm(modal.vendor ? { ...emptyVendor(), ...modal.vendor } : emptyVendor());
  }, [modal]);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinanceVendorsCsv({ search });
    downloadBlob(blob, 'vendor-registry.csv');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.vendor?._id) {
        await adminApi.updateFinanceVendor(modal.vendor._id, form);
        toast.success('Vendor updated');
      } else {
        await adminApi.createFinanceVendor(form);
        toast.success('Vendor created');
      }
      setModal({ open: false, vendor: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;
    try {
      await adminApi.deleteFinanceVendor(id);
      toast.success('Vendor deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Vendor Registry</h2>
          <p className="text-sm text-slate-500 mt-1">Suppliers with PAN / VAT bill classification.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input-field sm:max-w-xs"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ExportCsvButton onExport={exportCsv} />
          <button type="button" className="btn-primary shrink-0" onClick={() => setModal({ open: true, vendor: null })}>
            + Add vendor
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading vendors...</p>
      ) : rows.length === 0 ? (
        <div className="card text-slate-500">No vendors yet.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <div key={row._id} className="card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                    {VENDOR_BILL_LABELS[row.billType] || 'Pan Bill'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{row.companyName || '—'}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {[row.contactPerson, row.phone, row.email].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
                {(row.panNumber || row.vatNumber) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {row.panNumber ? `PAN: ${row.panNumber}` : ''}
                    {row.panNumber && row.vatNumber ? ' · ' : ''}
                    {row.vatNumber ? `VAT: ${row.vatNumber}` : ''}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {row.status}
                </span>
                <button type="button" className="btn-secondary text-xs" onClick={() => setModal({ open: true, vendor: row })}>Edit</button>
                <button type="button" className="text-xs text-rose-600" onClick={() => remove(row._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <form onSubmit={save} className="bg-white rounded-xl shadow-xl w-full max-w-xl my-6">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold">{modal.vendor ? 'Edit vendor' : 'Add vendor'}</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <input className="input-field sm:col-span-2" placeholder="Vendor name *" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <input className="input-field" placeholder="Company" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
                <input className="input-field" placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
                <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                <input type="email" className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <input className="input-field sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                <input className="input-field sm:col-span-2" placeholder="Payment terms" value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">PAN / VAT section</p>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">Default bill type for this supplier</label>
                  <select className="input-field" value={form.billType} onChange={(e) => setForm((f) => ({ ...f, billType: e.target.value }))}>
                    {VENDOR_BILL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className="input-field" placeholder="PAN number" value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))} />
                  <input className="input-field" placeholder="VAT / PAN registration number" value={form.vatNumber} onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal({ open: false, vendor: null })}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
