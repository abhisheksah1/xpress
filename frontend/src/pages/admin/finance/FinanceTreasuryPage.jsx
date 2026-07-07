import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, ExportCsvButton, StatCard, TREASURY_TYPES, defaultDateRange, downloadBlob, fmtNpr } from './financeUtils.jsx';

export default function FinanceTreasuryPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ inflow: 0, outflow: 0, net: 0 });
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [accountModal, setAccountModal] = useState(false);
  const [txModal, setTxModal] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank',
    bankName: '',
    accountNumber: '',
    openingBalance: '',
    notes: '',
  });
  const [txForm, setTxForm] = useState({
    accountId: '',
    type: 'deposit',
    amount: '',
    description: '',
    reference: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });
  const [adjustForm, setAdjustForm] = useState({
    accountId: '',
    mode: 'increase',
    amount: '',
    newBalance: '',
    reason: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });

  const openAdjustModal = (account) => {
    setAdjustForm({
      accountId: account._id,
      mode: 'increase',
      amount: '',
      newBalance: String(account.currentBalance ?? 0),
      reason: '',
      transactionDate: new Date().toISOString().slice(0, 10),
    });
    setAdjustModal(true);
  };

  const selectedAccountData = accounts.find((a) => a._id === adjustForm.accountId);

  const loadAccounts = useCallback(() => {
    adminApi
      .getTreasuryAccounts()
      .then((res) => {
        setAccounts(res.data.data.accounts || []);
        setTotalBalance(res.data.data.totalBalance || 0);
      })
      .catch(() => {
        setAccounts([]);
        setTotalBalance(0);
      });
  }, []);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    adminApi
      .getTreasuryTransactions({
        accountId: selectedAccount || undefined,
        startDate,
        endDate,
        limit: 50,
      })
      .then((res) => {
        setTransactions(res.data.data.transactions || []);
        setSummary(res.data.data.summary || { inflow: 0, outflow: 0, net: 0 });
      })
      .catch(() => {
        setTransactions([]);
        setSummary({ inflow: 0, outflow: 0, net: 0 });
      })
      .finally(() => setLoading(false));
  }, [selectedAccount, startDate, endDate]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinanceTreasuryCsv({
      startDate,
      endDate,
      accountId: selectedAccount || undefined,
    });
    downloadBlob(blob, `treasury-report-${endDate}.csv`);
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createTreasuryAccount({
        ...accountForm,
        openingBalance: accountForm.openingBalance !== '' ? Number(accountForm.openingBalance) : 0,
      });
      toast.success('Treasury account created');
      setAccountModal(false);
      setAccountForm({ name: '', type: 'bank', bankName: '', accountNumber: '', openingBalance: '', notes: '' });
      loadAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  const saveTransaction = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.createTreasuryTransaction({
        ...txForm,
        amount: Number(txForm.amount),
      });
      toast.success('Transaction recorded');
      setTxModal(false);
      setTxForm({
        accountId: '',
        type: 'deposit',
        amount: '',
        description: '',
        reference: '',
        transactionDate: new Date().toISOString().slice(0, 10),
      });
      loadAccounts();
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    } finally {
      setSaving(false);
    }
  };

  const saveAdjustment = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        mode: adjustForm.mode,
        reason: adjustForm.reason.trim(),
        transactionDate: adjustForm.transactionDate,
      };
      if (adjustForm.mode === 'set') {
        payload.newBalance = Number(adjustForm.newBalance);
      } else {
        payload.amount = Number(adjustForm.amount);
      }
      await adminApi.adjustTreasuryBalance(adjustForm.accountId, payload);
      toast.success('Treasury balance adjusted');
      setAdjustModal(false);
      loadAccounts();
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Balance adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Treasury Accounts &amp; Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Cash, bank, and wallet balances with transaction ledger.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setAccountModal(true)}>+ Add account</button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!selectedAccount}
            onClick={() => {
              const account = accounts.find((a) => a._id === selectedAccount);
              if (account) openAdjustModal(account);
            }}
          >
            Adjust balance
          </button>
          <button type="button" className="btn-primary" onClick={() => setTxModal(true)}>+ Record transaction</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total treasury balance" value={fmtNpr(totalBalance)} tone="positive" />
        <StatCard label="Inflows (period)" value={fmtNpr(summary.inflow)} />
        <StatCard label="Outflows (period)" value={fmtNpr(summary.outflow)} sub={`Net ${fmtNpr(summary.net)}`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card space-y-3 lg:col-span-1">
          <h3 className="font-semibold">Accounts</h3>
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-400">No treasury accounts yet.</p>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSelectedAccount('')}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${!selectedAccount ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
              >
                All accounts
              </button>
              {accounts.map((a) => (
                <div
                  key={a._id}
                  className={`rounded-lg border text-sm ${selectedAccount === a._id ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedAccount(a._id)}
                    className="w-full text-left px-3 py-2"
                  >
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{a.type} · {fmtNpr(a.currentBalance)}</p>
                  </button>
                  <div className="px-3 pb-2">
                    <button
                      type="button"
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                      onClick={() => openAdjustModal(a)}
                    >
                      Adjust balance
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <h3 className="font-semibold">Transaction ledger</h3>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setRange} />
              <ExportCsvButton onExport={exportCsv} />
            </div>
          </div>

          {loading ? (
            <p className="text-slate-400 text-sm">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-slate-400 text-sm">No transactions in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 border-b">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Account</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const out = tx.type === 'withdrawal' || tx.type === 'transfer_out' || tx.type === 'adjustment_out';
                    return (
                      <tr key={tx._id} className="border-b border-slate-100">
                        <td className="py-3 pr-3">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                        <td className="py-3 pr-3">{tx.account?.name}</td>
                        <td className="py-3 pr-3 capitalize">{tx.type.replace('_', ' ')}</td>
                        <td className="py-3 pr-3">{tx.description || '—'}</td>
                        <td className={`py-3 pr-3 text-right tabular-nums font-semibold ${out ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {out ? '-' : '+'}{fmtNpr(tx.amount)}
                        </td>
                        <td className="py-3 text-right tabular-nums">{fmtNpr(tx.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {accountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveAccount} className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b"><h3 className="font-bold">New treasury account</h3></div>
            <div className="p-5 space-y-3">
              <input className="input-field" placeholder="Account name *" required value={accountForm.name} onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} />
              <select className="input-field" value={accountForm.type} onChange={(e) => setAccountForm((f) => ({ ...f, type: e.target.value }))}>
                {TREASURY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input className="input-field" placeholder="Bank name" value={accountForm.bankName} onChange={(e) => setAccountForm((f) => ({ ...f, bankName: e.target.value }))} />
              <input className="input-field" placeholder="Account number" value={accountForm.accountNumber} onChange={(e) => setAccountForm((f) => ({ ...f, accountNumber: e.target.value }))} />
              <input type="number" className="input-field" placeholder="Opening balance" value={accountForm.openingBalance} onChange={(e) => setAccountForm((f) => ({ ...f, openingBalance: e.target.value }))} />
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAccountModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveAdjustment} className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold">Adjust treasury balance</h3>
              {selectedAccountData && (
                <p className="text-sm text-slate-500 mt-1">
                  {selectedAccountData.name} · Current: {fmtNpr(selectedAccountData.currentBalance)}
                </p>
              )}
            </div>
            <div className="p-5 space-y-3">
              <select
                className="input-field"
                required
                value={adjustForm.accountId}
                onChange={(e) => {
                  const account = accounts.find((a) => a._id === e.target.value);
                  setAdjustForm((f) => ({
                    ...f,
                    accountId: e.target.value,
                    newBalance: account ? String(account.currentBalance ?? 0) : '',
                  }));
                }}
              >
                <option value="">Select account *</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} ({fmtNpr(a.currentBalance)})</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'increase', label: 'Increase' },
                  { value: 'decrease', label: 'Decrease' },
                  { value: 'set', label: 'Set balance' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                      adjustForm.mode === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200'
                    }`}
                    onClick={() => setAdjustForm((f) => ({ ...f, mode: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {adjustForm.mode === 'set' ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input-field"
                  placeholder="New balance *"
                  required
                  value={adjustForm.newBalance}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, newBalance: e.target.value }))}
                />
              ) : (
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="input-field"
                  placeholder={adjustForm.mode === 'increase' ? 'Increase by *' : 'Decrease by *'}
                  required
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, amount: e.target.value }))}
                />
              )}
              <input
                type="date"
                className="input-field"
                value={adjustForm.transactionDate}
                onChange={(e) => setAdjustForm((f) => ({ ...f, transactionDate: e.target.value }))}
              />
              <textarea
                className="input-field min-h-[80px]"
                placeholder="Reason for adjustment *"
                required
                minLength={2}
                maxLength={500}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAdjustModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || !adjustForm.accountId}>
                {saving ? 'Saving...' : 'Apply adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {txModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveTransaction} className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b"><h3 className="font-bold">Record transaction</h3></div>
            <div className="p-5 space-y-3">
              <select className="input-field" required value={txForm.accountId} onChange={(e) => setTxForm((f) => ({ ...f, accountId: e.target.value }))}>
                <option value="">Select account *</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              <select className="input-field" value={txForm.type} onChange={(e) => setTxForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer_in">Transfer in</option>
                <option value="transfer_out">Transfer out</option>
              </select>
              <input type="number" min={0.01} step="0.01" className="input-field" placeholder="Amount *" required value={txForm.amount} onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))} />
              <input type="date" className="input-field" value={txForm.transactionDate} onChange={(e) => setTxForm((f) => ({ ...f, transactionDate: e.target.value }))} />
              <input className="input-field" placeholder="Description" value={txForm.description} onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setTxModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
