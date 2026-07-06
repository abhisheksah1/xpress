import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useAuthStore } from '../../store/authStore.js';

const empty = () => ({
  title: '',
  occasionDate: '',
  recipientName: '',
  relation: '',
  deliveryLocationText: '',
  notes: '',
  isActive: true,
});

function RemindersLoginPrompt({ staffSignedIn = false }) {
  if (staffSignedIn) {
    return (
      <div className="card text-center py-10 px-5 sm:px-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Customer account required</h2>
        <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
          Special date reminders are saved under registered customer accounts so our team can contact
          them. Please sign in with a customer account to add your own reminders.
        </p>
        <Link to="/" className="btn-primary inline-block">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="card text-center py-10 px-5 sm:px-8">
      <h2 className="text-lg font-bold text-slate-900 mb-2">Sign in to save reminders</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
        Special date reminders are available for registered customers only. Please log in or create
        an account so our team can remind you before birthdays, anniversaries, and other important dates.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/login" state={{ from: '/reminders' }} className="btn-primary">
          Log in
        </Link>
        <Link to="/register" state={{ from: '/reminders' }} className="btn-secondary">
          Register
        </Link>
      </div>
    </div>
  );
}

function ReminderModal({ open, initial, onClose, onSave, saving }) {
  const [form, setForm] = useState(empty());

  useEffect(() => {
    if (!open) return;
    if (!initial) {
      setForm(empty());
      return;
    }
    setForm({
      title: initial.title || '',
      occasionDate: initial.occasionDate ? initial.occasionDate.slice(0, 10) : '',
      recipientName: initial.recipientName || '',
      relation: initial.relation || '',
      deliveryLocationText: initial.deliveryLocationText || '',
      notes: initial.notes || '',
      isActive: initial.isActive !== false,
    });
  }, [open, initial]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.occasionDate) return toast.error('Please select a date');
          onSave({
            ...form,
            occasionDate: new Date(form.occasionDate).toISOString(),
          });
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <h3 className="font-semibold text-lg">{initial?._id ? 'Edit Reminder' : 'Add Special Date'}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input type="date" className="input-field" value={form.occasionDate} onChange={(e) => set('occasionDate', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Relation</label>
            <input className="input-field" value={form.relation} onChange={(e) => set('relation', e.target.value)} placeholder="Mother / Wife / Friend" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Mom's Birthday" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Recipient name</label>
          <input className="input-field" value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} placeholder="e.g. Sita" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Delivery location (text)</label>
          <input className="input-field" value={form.deliveryLocationText} onChange={(e) => set('deliveryLocationText', e.target.value)} placeholder="e.g. Lazimpat, Kathmandu (near Hotel X)" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any special instructions..." />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          Active
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [modal, setModal] = useState({ open: false, reminder: null });
  const [saving, setSaving] = useState(false);

  const hasToken = Boolean(localStorage.getItem('accessToken'));
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!hasToken) {
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      try {
        const profile = user || (await fetchProfile());
        if (cancelled) return;
        if (profile?.role !== 'customer') {
          setCheckingAuth(false);
          setLoading(false);
          return;
        }
        setCheckingAuth(false);
        const { data } = await storeApi.getMyReminders();
        if (!cancelled) setReminders(data.data || []);
      } catch {
        if (!cancelled) {
          localStorage.removeItem('accessToken');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [hasToken, user, fetchProfile]);

  const requireCustomer = () => {
    toast.error('Please log in or register to save reminders');
    navigate('/login', { state: { from: '/reminders' } });
  };

  const openAddModal = () => {
    if (!isCustomer) {
      requireCustomer();
      return;
    }
    setModal({ open: true, reminder: null });
  };

  const openEditModal = (reminder) => {
    if (!isCustomer) {
      requireCustomer();
      return;
    }
    setModal({ open: true, reminder });
  };

  const save = async (payload) => {
    if (!isCustomer) {
      requireCustomer();
      return;
    }

    setSaving(true);
    try {
      if (modal.reminder?._id) {
        await storeApi.updateReminder(modal.reminder._id, payload);
        toast.success('Reminder updated');
      } else {
        await storeApi.createReminder(payload);
        toast.success('Reminder saved');
      }
      setModal({ open: false, reminder: null });
      const { data } = await storeApi.getMyReminders();
      setReminders(data.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        requireCustomer();
      } else {
        toast.error(err.response?.data?.message || 'Failed to save reminder');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!isCustomer) {
      requireCustomer();
      return;
    }
    if (!window.confirm('Delete this reminder?')) return;
    try {
      await storeApi.deleteReminder(id);
      toast.success('Reminder deleted');
      const { data } = await storeApi.getMyReminders();
      setReminders(data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete reminder');
    }
  };

  const showLoginPrompt = !hasToken || !isCustomer;
  const staffSignedIn = hasToken && user && user.role !== 'customer';

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Special Date Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Save upcoming dates and we&apos;ll remind you before the day.
          </p>
        </div>
        {isCustomer && (
          <button className="btn-primary shrink-0" type="button" onClick={openAddModal}>
            + Add date
          </button>
        )}
      </div>

      {checkingAuth || loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : showLoginPrompt ? (
        <RemindersLoginPrompt staffSignedIn={staffSignedIn} />
      ) : reminders.length === 0 ? (
        <div className="card text-gray-600">
          No reminders yet. Add birthdays, anniversaries, and special occasions.
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <div key={r._id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {r.title || (r.relation ? `${r.relation} occasion` : 'Special date')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Date: {new Date(r.occasionDate).toLocaleDateString()}{' '}
                  {r.recipientName ? `· Recipient: ${r.recipientName}` : ''}{' '}
                  {r.relation ? `· Relation: ${r.relation}` : ''}
                </p>
                {r.deliveryLocationText && (
                  <p className="text-xs text-gray-400 mt-1 truncate">Delivery note: {r.deliveryLocationText}</p>
                )}
                {r.lastSentAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Last reminder sent: {new Date(r.lastSentAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="btn-secondary" type="button" onClick={() => openEditModal(r)}>Edit</button>
                <button className="text-red-500 text-sm hover:underline" type="button" onClick={() => remove(r._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCustomer && (
        <ReminderModal
          open={modal.open}
          initial={modal.reminder}
          onClose={() => setModal({ open: false, reminder: null })}
          onSave={save}
          saving={saving}
        />
      )}
    </div>
  );
}
