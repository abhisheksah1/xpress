import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { formatDisplayPhone } from '../../utils/phone.js';

const customerRemindersUrl = () => `${window.location.origin}/reminders`;

const copyText = async (text, label) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Could not copy link');
  }
};

function SendModal({ open, reminder, onClose, onSendEmail, onSendWhatsApp, sending, whatsapping }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setMessage('');
  }, [open]);

  if (!open || !reminder) return null;

  const phone = formatDisplayPhone(reminder.customer?.countryCode, reminder.customer?.phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendEmail({ subject, message });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">Send reminder</h3>
        <p className="text-sm text-gray-500">
          {reminder.customer?.name} · {reminder.customer?.email}
          <span className="block mt-1">Phone: {phone}</span>
          <span className="block mt-1">
            {new Date(reminder.occasionDate).toLocaleDateString()} · {reminder.title || reminder.relation || 'Special date'}
          </span>
        </p>

        <div>
          <label className="block text-sm font-medium mb-1">Subject (email only, optional)</label>
          <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Leave empty to use template" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Message (optional)</label>
          <textarea className="input-field" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Leave empty to use template" />
          <p className="text-xs text-gray-400 mt-1">Supports variables like {'{{customer_name}}'}, {'{{title}}'}, {'{{occasion_date}}'}.</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            type="button"
            disabled={whatsapping || !reminder.customer?.phone}
            onClick={() => onSendWhatsApp({ message })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#25D366] text-white hover:bg-[#1ebe57] disabled:opacity-50"
            title={!reminder.customer?.phone ? 'Customer has no phone number' : 'Open WhatsApp with pre-filled message'}
          >
            {whatsapping ? 'Opening...' : 'Send via WhatsApp'}
          </button>
          <button type="submit" disabled={sending} className="btn-primary">{sending ? 'Sending...' : 'Send email'}</button>
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
  const [whatsappingId, setWhatsappingId] = useState(null);

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

  const openWhatsApp = async (reminder, payload = {}) => {
    if (!reminder.customer?.phone) {
      toast.error('Customer has no phone number. Ask them to register or update their profile.');
      return;
    }
    setWhatsappingId(reminder._id);
    try {
      const { data } = await adminApi.whatsAppReminder(reminder._id, payload);
      const url = data.data?.url;
      if (!url) throw new Error('No WhatsApp link returned');
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp opened — tap Send in the chat');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open WhatsApp');
    } finally {
      setWhatsappingId(null);
    }
  };

  const sendEmail = async (payload) => {
    setSending(true);
    try {
      await adminApi.sendReminder(send.reminder._id, payload);
      toast.success('Reminder email sent');
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
        <p className="text-sm text-gray-500 mt-1">
          Upcoming special dates saved by customers. Send reminders via WhatsApp (one click) or email.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-violet-800">Customer reminder page</p>
          <p className="text-xs text-violet-900 break-all font-mono bg-white/80 rounded px-2 py-1.5 border border-violet-100">
            {customerRemindersUrl()}
          </p>
          <p className="text-xs text-violet-700">
            Share this link so logged-in customers can save birthdays, anniversaries, and special dates.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyText(customerRemindersUrl(), 'Customer link')}
              className="btn-secondary text-xs"
            >
              Copy customer link
            </button>
            <a href={customerRemindersUrl()} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
              Open page
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
          <p className="text-xs font-bold uppercase text-emerald-800">WhatsApp reminders (easy steps)</p>
          <ol className="text-xs text-emerald-900 space-y-1 list-decimal list-inside">
            <li>Click the green <strong>WhatsApp</strong> button on any reminder row.</li>
            <li>WhatsApp Web or the app opens with the message ready.</li>
            <li>Review and tap <strong>Send</strong> in WhatsApp.</li>
          </ol>
          <p className="text-xs text-emerald-700">
            Customers need a phone number on their account — collected at registration.
            Customize the message template under <strong>Settings → SMTP & Email Templates</strong> (reminder template).
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Customers must <Link to="/login" className="text-primary-600 hover:underline">log in</Link> before they can add reminders.
        View registered contacts under <Link to="/admin/customers" className="text-primary-600 hover:underline">Customers</Link>.
      </p>

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
                  <th className="py-2">Actions</th>
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
                        <p className="text-xs text-gray-500 truncate">{formatDisplayPhone(r.customer?.countryCode, r.customer?.phone)}</p>
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
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={!r.customer?.phone || whatsappingId === r._id}
                          onClick={() => openWhatsApp(r)}
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#25D366] text-white hover:bg-[#1ebe57] disabled:opacity-50"
                          title={!r.customer?.phone ? 'No phone on file' : 'Open WhatsApp'}
                        >
                          {whatsappingId === r._id ? '...' : 'WhatsApp'}
                        </button>
                        <button type="button" className="btn-secondary text-xs" onClick={() => setSend({ open: true, reminder: r })}>
                          Email
                        </button>
                      </div>
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
        onSendEmail={sendEmail}
        onSendWhatsApp={(payload) => openWhatsApp(send.reminder, payload)}
        sending={sending}
        whatsapping={whatsappingId === send.reminder?._id}
      />
    </div>
  );
}
