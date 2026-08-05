import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin.js';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [system, setSystem] = useState(null);

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setStats(res.data.data.stats);
      setSystem(res.data.data.system || null);
    });
  }, []);

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? '—' },
    { label: 'Active Products', value: stats?.totalProducts ?? '—' },
    { label: 'Revenue (NPR)', value: stats?.totalRevenue != null ? Number(stats.totalRevenue).toLocaleString() : '—' },
  ];

  const quickLinks = [
    { to: '/admin/products/new', label: 'Add Product' },
    { to: '/admin/reminders', label: 'Customer Reminders' },
    { to: '/admin/content', label: 'Edit Homepage' },
    { to: '/admin/navbar', label: 'Edit Navigation' },
    { to: '/admin/settings', label: 'Store Settings' },
    { to: '/admin/blog', label: 'Manage Blog' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {system && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 max-w-md">
            <p className="font-semibold text-slate-800">
              Live system updated
            </p>
            <p className="mt-0.5 tabular-nums">
              {formatDateTime(system.liveUpdatedAt)}
              {system.gitSha ? (
                <span className="text-slate-400 font-mono ml-2">
                  ({String(system.gitSha).slice(0, 7)})
                </span>
              ) : null}
            </p>
            {!system.hasDeployStamp && (
              <p className="text-[11px] text-amber-700 mt-1">
                No deploy stamp yet — run <code className="font-mono">bash deploy.sh</code> on the server so this shows the real live update time.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickLinks.map((l) => (
            <Link key={l.to} to={l.to} className="btn-secondary text-sm">{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
