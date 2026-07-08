import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { useAuthStore } from '../../store/authStore.js';

const emptyForm = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
  permissions: [],
  presetId: '',
});

function roleLabel(member) {
  if (member.role === 'admin') return 'Admin';
  if (member.role === 'super_admin') return 'Super admin';
  return 'Custom staff';
}

function StaffFormModal({
  open,
  title,
  initial,
  meta,
  isSuperAdmin,
  saving,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name || '',
        email: initial.email || '',
        phone: initial.phone || '',
        password: '',
        role: initial.role === 'admin' ? 'admin' : 'staff',
        permissions: [...(initial.permissions || [])],
        presetId: '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, initial]);

  if (!open) return null;

  const applyPreset = (presetId) => {
    const preset = meta?.presets?.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      presetId,
      role: 'staff',
      permissions: [...preset.permissions],
    }));
  };

  const togglePermission = (key) => {
    setForm((f) => ({
      ...f,
      presetId: '',
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: form.role,
      permissions: form.role === 'staff' ? form.permissions : [],
    };
    if (!initial || form.password) {
      payload.password = form.password;
    }
    onSave(payload);
  };

  const showPermissions = form.role === 'staff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-5 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Assign a role preset or pick individual privileges.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-gray-600">Full name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Email</span>
              <input
                required
                type="email"
                disabled={Boolean(initial)}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input mt-1 w-full disabled:bg-gray-100"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="input mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">{initial ? 'New password (optional)' : 'Password'}</span>
              <input
                type="password"
                required={!initial}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input mt-1 w-full"
              />
            </label>
          </div>

          {isSuperAdmin && (
            <label className="block text-sm">
              <span className="text-gray-600">Access level</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  role: e.target.value,
                  permissions: e.target.value === 'admin' ? [] : f.permissions,
                }))}
                className="input mt-1 w-full"
              >
                {(meta?.roles || []).map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
          )}

          {showPermissions && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {(meta?.presets || []).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.presetId === preset.id
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {meta?.presets?.find((p) => p.id === form.presetId)?.description}
              </p>

              <p className="text-sm font-medium text-gray-700 pt-2">Custom privileges</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {(meta?.permissions || []).map((perm) => (
                  <label key={perm.key} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.role === 'admin' && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Admin users get full panel access but cannot manage super admin accounts.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : initial ? 'Update member' : 'Create member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { isSuperAdmin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [modal, setModal] = useState({ open: false, member: null });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, metaRes] = await Promise.all([
        adminApi.getStaff({ page, limit: 20, search: search || undefined }),
        meta ? Promise.resolve({ data: { data: meta } }) : adminApi.getStaffMeta(),
      ]);
      setRows(listRes.data.data?.staff || []);
      setPagination(listRes.data.data?.pagination || { page: 1, pages: 1 });
      if (!meta) setMeta(metaRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, search]);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (modal.member) {
        await adminApi.updateStaff(modal.member._id, payload);
        toast.success('Team member updated');
      } else {
        await adminApi.createStaff(payload);
        toast.success('Team member created');
      }
      setModal({ open: false, member: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member) => {
    try {
      await adminApi.updateStaff(member._id, { isActive: !member.isActive });
      toast.success(member.isActive ? 'Member deactivated' : 'Member activated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (member) => {
    if (!window.confirm(`Remove ${member.name} from the team?`)) return;
    try {
      await adminApi.deleteStaff(member._id);
      toast.success('Team member removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team & roles</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage admin users and staff with custom privileges.
          </p>
        </div>
        <button type="button" onClick={() => setModal({ open: true, member: null })} className="btn-primary">
          Add team member
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input w-full max-w-md"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Privileges</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No team members found</td></tr>
            ) : rows.map((member) => (
              <tr key={member._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{member.name}</td>
                <td className="px-4 py-3 text-gray-600">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                    {roleLabel(member)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {member.role === 'admin'
                    ? 'Full access'
                    : (member.permissions || []).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${member.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button type="button" onClick={() => setModal({ open: true, member })} className="text-primary-600 hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleToggleActive(member)} className="text-gray-600 hover:underline">
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  {(isSuperAdmin() || member.role === 'staff') && (
                    <button type="button" onClick={() => handleDelete(member)} className="text-red-600 hover:underline">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary">Previous</button>
          <span className="text-sm text-gray-600 self-center">Page {page} of {pagination.pages}</span>
          <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next</button>
        </div>
      )}

      <StaffFormModal
        open={modal.open}
        title={modal.member ? 'Edit team member' : 'Add team member'}
        initial={modal.member}
        meta={meta}
        isSuperAdmin={isSuperAdmin()}
        saving={saving}
        onClose={() => setModal({ open: false, member: null })}
        onSave={handleSave}
      />
    </div>
  );
}
