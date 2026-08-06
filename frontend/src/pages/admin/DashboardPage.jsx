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

function formatDayLabel(dateKey) {
  if (!dateKey) return '—';
  try {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [visits, setVisits] = useState(null);
  const [system, setSystem] = useState(null);

  useEffect(() => {
    adminApi.getDashboard().then((res) => {
      setStats(res.data.data.stats);
      setVisits(res.data.data.visits || null);
      setSystem(res.data.data.system || null);
    });
  }, []);

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? '—' },
    { label: 'Active Products', value: stats?.totalProducts ?? '—' },
    { label: 'Revenue (NPR)', value: stats?.totalRevenue != null ? Number(stats.totalRevenue).toLocaleString() : '—' },
  ];

  const visitCards = [
    {
      label: 'Visitors today',
      value: stats?.visitorsToday != null ? Number(stats.visitorsToday).toLocaleString() : '—',
      hint: visits?.yesterday ? `Yesterday: ${Number(visits.yesterday.uniqueVisitors || 0).toLocaleString()}` : null,
    },
    {
      label: 'Page views today',
      value: stats?.pageViewsToday != null ? Number(stats.pageViewsToday).toLocaleString() : '—',
      hint: visits?.yesterday ? `Yesterday: ${Number(visits.yesterday.pageViews || 0).toLocaleString()}` : null,
    },
    {
      label: 'Visitors (7 days)',
      value: stats?.visitorsLast7Days != null ? Number(stats.visitorsLast7Days).toLocaleString() : '—',
      hint: 'Unique per day, summed',
    },
    {
      label: 'Page views (7 days)',
      value: stats?.pageViewsLast7Days != null ? Number(stats.pageViewsLast7Days).toLocaleString() : '—',
      hint: visits?.timezone ? `Timezone: ${visits.timezone}` : null,
    },
  ];

  const quickLinks = [
    { to: '/admin/products/new', label: 'Add Product' },
    { to: '/admin/reminders', label: 'Customer Reminders' },
    { to: '/admin/content', label: 'Edit Homepage' },
    { to: '/admin/navbar', label: 'Edit Navigation' },
    { to: '/admin/settings', label: 'Store Settings' },
    { to: '/admin/blog', label: 'Manage Blog' },
  ];

  const last7 = Array.isArray(visits?.last7Days) ? [...visits.last7Days].reverse() : [];

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

      <div className="mb-8">
        <h2 className="font-semibold mb-3">Store traffic</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          {visitCards.map((s) => (
            <div key={s.label} className="card">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold mt-1 tabular-nums">{s.value}</p>
              {s.hint ? <p className="text-xs text-gray-400 mt-1">{s.hint}</p> : null}
            </div>
          ))}
        </div>
        {last7.length > 0 && (
          <div className="card overflow-x-auto">
            <h3 className="font-semibold mb-3 text-sm text-gray-700">Last 7 days</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Day</th>
                  <th className="pb-2 font-medium text-right">Visitors</th>
                  <th className="pb-2 font-medium text-right">Page views</th>
                </tr>
              </thead>
              <tbody>
                {last7.map((row) => (
                  <tr key={row.date} className="border-b border-gray-50 last:border-0">
                    <td className="py-2">{formatDayLabel(row.date)}</td>
                    <td className="py-2 text-right tabular-nums">{Number(row.uniqueVisitors || 0).toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums">{Number(row.pageViews || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 mt-3">
              Visitors are unique browsers per day (anonymous id in the shopper&apos;s browser). Counts start after this update is live.
            </p>
          </div>
        )}
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
