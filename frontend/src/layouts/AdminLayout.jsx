import { Outlet, Link, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { useAuthStore } from '../store/authStore.js';
import {
  canAccessAdminNav,
  canAccessAdminPath,
  getVisibleNavGroups,
  isNavGroupActive,
} from '../utils/adminPermissions.js';

function roleBadge(user) {
  if (user?.role === 'super_admin') return 'Super admin';
  if (user?.role === 'admin') return 'Admin';
  if (user?.role === 'staff') return 'Staff';
  return '';
}

function NavItemLink({ item, leadCount }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-lg text-sm transition-colors ${
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
  );
}

function NavGroupSection({ group, pathname, leadCount, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const active = isNavGroupActive(group, pathname);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${
          active ? 'text-primary-300' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <span>{group.label}</span>
        <span className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="mt-0.5 ml-1 space-y-0.5 border-l border-gray-800 pl-2">
          {group.items.map((item) => (
            <NavItemLink key={item.to} item={item} leadCount={leadCount} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [leadCount, setLeadCount] = useState(0);

  const refreshLeadCount = () => {
    if (!canAccessAdminNav(user, { permissions: ['orders:read'] })) return;
    adminApi.getLeadOrderCount()
      .then((res) => setLeadCount(res.data.data?.count || 0))
      .catch(() => {});
  };

  useEffect(() => {
    refreshLeadCount();
    const onFocus = () => refreshLeadCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/admin/login';
  };

  const visibleGroups = useMemo(() => getVisibleNavGroups(user), [user]);

  if (!canAccessAdminPath(user, location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <Link to="/admin" className="text-xl font-bold text-primary-400">
            KoseliXpress
          </Link>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleGroups.map((group) => {
            if (group.type === 'link') {
              return (
                <div key={group.item.to} className="pb-2 mb-2 border-b border-gray-800">
                  <NavItemLink item={group.item} leadCount={leadCount} />
                </div>
              );
            }
            return (
              <NavGroupSection
                key={group.id}
                group={group}
                pathname={location.pathname}
                leadCount={leadCount}
                defaultOpen={isNavGroupActive(group, location.pathname)}
              />
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800 space-y-2">
          {user && (
            <>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <p className="text-[10px] uppercase tracking-wide text-primary-400">{roleBadge(user)}</p>
            </>
          )}
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
