import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin.js';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminApi.getDashboard().then((res) => setStats(res.data.data.stats));
  }, []);

  const cards = [
    { label: 'Total Orders', value: stats?.totalOrders ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? '—' },
    { label: 'Active Products', value: stats?.totalProducts ?? '—' },
    { label: 'Revenue (NPR)', value: stats?.totalRevenue != null ? Number(stats.totalRevenue).toLocaleString() : '—' },
  ];

  const quickLinks = [
    { to: '/admin/products/new', label: 'Add Product' },
    { to: '/admin/content', label: 'Edit Homepage' },
    { to: '/admin/navbar', label: 'Edit Navigation' },
    { to: '/admin/settings', label: 'Store Settings' },
    { to: '/admin/blog', label: 'Manage Blog' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
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
