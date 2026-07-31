import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, EXPENSE_CATEGORIES, ExportCsvButton, defaultDateRange, downloadBlob, fmtNpr } from './financeUtils.jsx';

const emptyForm = () => ({
  category: 'other',
  title: '',
  description: '',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentStatus: 'paid',
  vendor: '',
  treasuryAccount: '',
  reference: '',
  notes: '',
});

export default function FinanceExpensesPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getFinanceExpenses({ startDate, endDate, limit: 50 })
      .then((res) => setRows(res.data.data.expenses || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  useEffect(() => {
    load();
    adminApi.getFinanceVendors({ limit: 200 }).then((r) => setVendors(r.data.data.vendors || [])).catch(() => {});
    adminApi.getTreasuryAccounts().then((r) => setAccounts(r.data.data.accounts || [])).catch(() => {});
  }, [load]);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinanceExpensesCsv({ startDate, endDate });
    downloadBlob(blob, `overhead-expenses-${endDate}.csv`);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      category: row.category || 'other',
      title: row.title || '',
      description: row.description || '',
      amount: String(row.amount ?? ''),
      expenseDate: row.expenseDate
        ? new Date(row.expenseDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      paymentStatus: row.paymentStatus || 'paid',
      vendor: row.vendor?._id || row.vendor || '',
      treasuryAccount: row.treasuryAccount?._id || row.treasuryAccount || '',
      reference: row.reference || '',
      notes: row.notes || '',
    });
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) < 0) {
      return toast.error('Enter a valid amount');
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      amount: Number(form.amount),
      vendor: form.vendor || undefined,
      treasuryAccount: form.treasuryAccount || undefined,
      description: form.description || undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    };

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updateFinanceExpense(editingId, payload);
        toast.success('Expense updated');
      } else {
        await adminApi.createFinanceExpense(payload);
        toast.success('Expense recorded');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense? Linked treasury withdrawal will be reversed.')) return;
    try {
      await adminApi.deleteFinanceExpense(id);
      toast.success('Expense deleted');
      if (editingId === id) closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Operational Overhead Expenses</h2>
          <p className="text-sm text-slate-500 mt-1">Rent, salaries, marketing, and other running costs.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setRange} />
          <ExportCsvButton onExport={exportCsv} />
          <button type="button" className="btn-primary shrink-0" onClick={openCreate}>
            + Add expense
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading expenses...</p>
      ) : rows.length === 0 ? (
        <div className="card text-slate-500">No expenses in this period.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Treasury</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-slate-100">
                  <td className="py-3 pr-3">{new Date(row.expenseDate).toLocaleDateString()}</td>
                  <td className="py-3 pr-3 font-medium">{row.title}</td>
                  <td className="py-3 pr-3 capitalize">{row.category}</td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{fmtNpr(row.amount)}</td>
                  <td className="py-3 pr-3 text-slate-500">{row.treasuryAccount?.name || '—'}</td>
                  <td className="py-3 pr-3 capitalize">{row.paymentStatus}</td>
                  <td className="py-3 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs text-primary-600 font-medium mr-3"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-rose-600 font-medium"
                      onClick={() => remove(row._id)}
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b sticky top-0 bg-white">
              <h3 className="font-bold">{editingId ? 'Edit overhead expense' : 'Add overhead expense'}</h3>
            </div>
            <div className="p-5 space-y-3">
              <input
                className="input-field"
                placeholder="Title *"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <textarea
                className="input-field text-sm min-h-[64px]"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="input-field"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-field"
                  placeholder="Amount *"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="input-field"
                  value={form.expenseDate}
                  onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
                <select
                  className="input-field"
                  value={form.paymentStatus}
                  onChange={(e) => setForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <select
                className="input-field"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              >
                <option value="">Vendor (optional)</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <select
                className="input-field"
                value={form.treasuryAccount}
                onChange={(e) => setForm((f) => ({ ...f, treasuryAccount: e.target.value }))}
              >
                <option value="">Deduct from treasury (optional)</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                className="input-field"
                placeholder="Reference / bill no. (optional)"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
              <textarea
                className="input-field text-sm min-h-[56px]"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update expense' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
