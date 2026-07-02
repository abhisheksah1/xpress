import { Outlet, Link, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
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
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <Link to="/" className="text-sm text-gray-400 hover:text-white">View Storefront</Link>
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
