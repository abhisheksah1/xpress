import { Outlet, Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { useAuthStore } from '../store/authStore.js';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Catalog' },
  { to: '/admin/content', label: 'Content' },
  { to: '/admin/navbar', label: 'Navigation' },
  { to: '/admin/blog', label: 'Blog' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/leads', label: 'Lead orders', badge: 'leads' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/reminders', label: 'Reminders' },
  { to: '/admin/delivery', label: 'Delivery' },
  { to: '/admin/api-partners', label: 'API Partners' },
  { to: '/admin/api-partners/reports', label: 'Partner Reports' },
  { to: '/admin/finance', label: 'Finance' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const [leadCount, setLeadCount] = useState(0);

  const refreshLeadCount = () => {
    adminApi.getLeadOrderCount()
      .then((res) => setLeadCount(res.data.data?.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    refreshLeadCount();
    const onFocus = () => refreshLeadCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link to="/admin" className="text-xl font-bold text-primary-400">
            KoseliXpress
          </Link>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span>{item.label}</span>
                {item.badge === 'leads' && leadCount > 0 && (
                  <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {leadCount > 99 ? '99+' : leadCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          {user && <p className="text-xs text-gray-400 truncate">{user.email}</p>}
          <Link to="/" className="block text-sm text-gray-400 hover:text-white">View Storefront</Link>
          <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
        </header>
        <main className="flex-1 p-8 bg-gray-50 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
