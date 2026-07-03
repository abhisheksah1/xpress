import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { formatDisplayPhone } from '../../utils/phone.js';

function CustomerDetailModal({ open, customer, onClose, onToggleStatus, toggling }) {
  if (!open || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${customer.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <dl className="text-sm space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Phone</dt>
            <dd className="font-medium text-right">{formatDisplayPhone(customer.countryCode, customer.phone)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Registered</dt>
            <dd className="font-medium text-right">{customer.createdAt ? new Date(customer.createdAt).toLocaleString() : '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Last login</dt>
            <dd className="font-medium text-right">{customer.lastLogin ? new Date(customer.lastLogin).toLocaleString() : '—'}</dd>
          </div>
        </dl>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          <button
            type="button"
            disabled={toggling}
            onClick={() => onToggleStatus(customer)}
            className="btn-primary"
          >
            {toggling ? 'Updating...' : customer.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState({ open: false, customer: null });
  const [toggling, setToggling] = useState(false);

  const params = useMemo(() => {
    const p = { page, limit: 30, role: 'customer' };
    if (search) p.search = search;
    return p;
  }, [search, page]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getCustomers(params);
      setRows(data.data?.users || []);
      setPagination(data.data?.pagination || { page: 1, pages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [params]);

  const toggleStatus = async (customer) => {
    setToggling(true);
    try {
      const { data } = await adminApi.toggleCustomerStatus(customer._id);
      toast.success(data.message || 'Status updated');
      setDetail({ open: false, customer: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registered customers with contact details. Phone numbers are used for WhatsApp reminders.
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            className="input-field max-w-md"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, email, or phone..."
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-400">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c._id} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{c.email}</td>
                    <td className="py-3 pr-4 text-gray-600">{formatDisplayPhone(c.countryCode, c.phone)}</td>
                    <td className="py-3 pr-4 text-gray-500 text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button type="button" className="btn-secondary text-xs" onClick={() => setDetail({ open: true, customer: c })}>
                        View
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

      <CustomerDetailModal
        open={detail.open}
        customer={detail.customer}
        onClose={() => setDetail({ open: false, customer: null })}
        onToggleStatus={toggleStatus}
        toggling={toggling}
      />
    </div>
  );
}
