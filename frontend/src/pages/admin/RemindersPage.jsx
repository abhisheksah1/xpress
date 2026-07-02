import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

function SendModal({ open, reminder, onClose, onSend, sending }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setMessage('');
  }, [open]);

  if (!open || !reminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend({ subject, message });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">Send reminder</h3>
        <p className="text-sm text-gray-500">
          {reminder.customer?.name} · {reminder.customer?.email}
          <span className="block mt-1">
            {new Date(reminder.occasionDate).toLocaleDateString()} · {reminder.title || reminder.relation || 'Special date'}
          </span>
        </p>

        <div>
          <label className="block text-sm font-medium mb-1">Subject (optional)</label>
          <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Leave empty to use template" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message (optional)</label>
          <textarea className="input-field" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave empty to use template" />
          <p className="text-xs text-gray-400 mt-1">Supports variables like {{customer_name}}, {{title}}, {{occasion_date}}.</p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={sending} className="btn-primary">{sending ? 'Sending...' : 'Send'}</button>
        </div>
      </form>
    </div>
  );
}

export default function RemindersPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [send, setSend] = useState({ open: false, reminder: null });
  const [sending, setSending] = useState(false);

  const params = useMemo(() => {
    const p = { page, limit: 50 };
    if (from) p.from = from;
    if (to) p.to = to;
    if (search) p.search = search;
    return p;
  }, [from, to, search, page]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getReminders(params);
      setRows(data.data?.reminders || []);
      setPagination(data.data?.pagination || { page: 1, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [params]);

  const sendNow = async (payload) => {
    setSending(true);
    try {
      await adminApi.sendReminder(send.reminder._id, payload);
      toast.success('Reminder sent');
      setSend({ open: false, reminder: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Reminders</h1>
        <p className="text-sm text-gray-500 mt-1">Upcoming special dates saved by customers. Filter by date range and send reminders.</p>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <input type="date" className="input-field" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <input type="date" className="input-field" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Search</label>
            <input className="input-field" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Recipient, relation, location note..." />
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-400">No reminders found for this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Recipient / Relation</th>
                  <th className="py-2 pr-4">Delivery note</th>
                  <th className="py-2 pr-4">Last sent</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-semibold">{new Date(r.occasionDate).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.customer?.name || 'Customer'}</p>
                        <p className="text-xs text-gray-400 truncate">{r.customer?.email}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{r.title || 'Special date'}</p>
                      <p className="text-xs text-gray-400">{[r.recipientName, r.relation].filter(Boolean).join(' · ')}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{r.deliveryLocationText || '—'}</td>
                    <td className="py-3 pr-4 text-xs text-gray-400">
                      {r.lastSentAt ? new Date(r.lastSentAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3">
                      <button type="button" className="btn-secondary text-xs" onClick={() => setSend({ open: true, reminder: r })}>
                        Send reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex gap-2 justify-center pt-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <SendModal
        open={send.open}
        reminder={send.reminder}
        onClose={() => setSend({ open: false, reminder: null })}
        onSend={sendNow}
        sending={sending}
      />
    </div>
  );
}

