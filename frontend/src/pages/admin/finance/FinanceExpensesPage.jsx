import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, EXPENSE_CATEGORIES, ExportCsvButton, defaultDateRange, downloadBlob, fmtNpr } from './financeUtils.jsx';

export default function FinanceExpensesPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'other',
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentStatus: 'paid',
    vendor: '',
    treasuryAccount: '',
    reference: '',
    notes: '',
  });

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

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createFinanceExpense({
        ...form,
        amount: Number(form.amount),
        vendor: form.vendor || undefined,
        treasuryAccount: form.treasuryAccount || undefined,
      });
      toast.success('Expense recorded');
      setModal(false);
      setForm({
        category: 'other',
        title: '',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentStatus: 'paid',
        vendor: '',
        treasuryAccount: '',
        reference: '',
        notes: '',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await adminApi.deleteFinanceExpense(id);
      toast.success('Expense deleted');
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
          <button type="button" className="btn-primary shrink-0" onClick={() => setModal(true)}>
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
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500 border-b">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b border-slate-100">
                  <td className="py-3 pr-3">{new Date(row.expenseDate).toLocaleDateString()}</td>
                  <td className="py-3 pr-3 font-medium">{row.title}</td>
                  <td className="py-3 pr-3 capitalize">{row.category}</td>
                  <td className="py-3 pr-3 font-semibold tabular-nums">{fmtNpr(row.amount)}</td>
                  <td className="py-3 pr-3 capitalize">{row.paymentStatus}</td>
                  <td className="py-3 text-right">
                    <button type="button" className="text-xs text-rose-600" onClick={() => remove(row._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b"><h3 className="font-bold">Add overhead expense</h3></div>
            <div className="p-5 space-y-3">
              <input className="input-field" placeholder="Title *" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input-field" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input type="number" min={0} className="input-field" placeholder="Amount *" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <input type="date" className="input-field" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
              <select className="input-field" value={form.treasuryAccount} onChange={(e) => setForm((f) => ({ ...f, treasuryAccount: e.target.value }))}>
                <option value="">Deduct from treasury (optional)</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
