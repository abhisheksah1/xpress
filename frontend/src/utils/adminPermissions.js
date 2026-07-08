const ADMIN_ROLES = new Set(['super_admin', 'admin']);

export function isSuperAdminUser(user) {
  return user?.role === 'super_admin';
}

export function isAdminUser(user) {
  return ADMIN_ROLES.has(user?.role);
}

export function hasStaffPermission(user, permission) {
  if (!user) return false;
  if (ADMIN_ROLES.has(user.role)) return true;
  if (user.role !== 'staff') return false;
  return (user.permissions || []).includes(permission);
}

export function hasAnyStaffPermission(user, permissions = []) {
  if (!permissions.length) return true;
  return permissions.some((p) => hasStaffPermission(user, p));
}

/** Routes restricted to admin / super admin only (not assignable to custom staff). */
export const ADMIN_ONLY_PATHS = [
  '/admin/coupons',
  '/admin/delivery',
  '/admin/api-partners',
  '/admin/finance',
  '/admin/settings',
  '/admin/navbar',
  '/admin/staff',
];

const NAV_ITEM_DEFS = {
  dashboard: { to: '/admin', label: 'Dashboard', end: true, permissions: [] },
  catalog: { to: '/admin/products', label: 'Catalog', permissions: ['products:read'] },
  content: { to: '/admin/content', label: 'Content', permissions: ['cms:read'] },
  navbar: { to: '/admin/navbar', label: 'Navigation', adminOnly: true },
  blog: { to: '/admin/blog', label: 'Blog', permissions: ['blog:read'] },
  orders: { to: '/admin/orders', label: 'Orders', permissions: ['orders:read'], badge: 'leads' },
  leads: { to: '/admin/leads', label: 'Lead orders', permissions: ['orders:read'] },
  coupons: { to: '/admin/coupons', label: 'Coupons', adminOnly: true },
  customers: { to: '/admin/customers', label: 'Customers', permissions: ['users:read'] },
  reminders: { to: '/admin/reminders', label: 'Reminders', permissions: ['reminders:read'] },
  delivery: { to: '/admin/delivery', label: 'Delivery', adminOnly: true },
  apiPartners: { to: '/admin/api-partners', label: 'API Partners', adminOnly: true },
  partnerReports: { to: '/admin/api-partners/reports', label: 'Partner Reports', adminOnly: true },
  finance: { to: '/admin/finance', label: 'Finance', adminOnly: true },
  staff: { to: '/admin/staff', label: 'Team & roles', adminOnly: true },
  settings: { to: '/admin/settings', label: 'Settings', adminOnly: true },
};

/** Grouped sidebar structure — routes and permissions unchanged. */
export const NAV_GROUPS = [
  { type: 'link', item: NAV_ITEM_DEFS.dashboard },
  {
    id: 'store',
    label: 'Store',
    items: [NAV_ITEM_DEFS.catalog, NAV_ITEM_DEFS.content, NAV_ITEM_DEFS.navbar, NAV_ITEM_DEFS.blog],
  },
  {
    id: 'sales',
    label: 'Sales & orders',
    items: [
      NAV_ITEM_DEFS.orders,
      NAV_ITEM_DEFS.leads,
      NAV_ITEM_DEFS.coupons,
      NAV_ITEM_DEFS.customers,
      NAV_ITEM_DEFS.reminders,
      NAV_ITEM_DEFS.delivery,
    ],
  },
  {
    id: 'business',
    label: 'Partners & finance',
    items: [NAV_ITEM_DEFS.apiPartners, NAV_ITEM_DEFS.partnerReports, NAV_ITEM_DEFS.finance],
  },
  {
    id: 'system',
    label: 'System',
    items: [NAV_ITEM_DEFS.staff, NAV_ITEM_DEFS.settings],
  },
];

/** Flat list (e.g. path checks, legacy use). */
export const NAV_ITEMS = [
  NAV_ITEM_DEFS.dashboard,
  NAV_ITEM_DEFS.catalog,
  NAV_ITEM_DEFS.content,
  NAV_ITEM_DEFS.navbar,
  NAV_ITEM_DEFS.blog,
  NAV_ITEM_DEFS.orders,
  NAV_ITEM_DEFS.leads,
  NAV_ITEM_DEFS.coupons,
  NAV_ITEM_DEFS.customers,
  NAV_ITEM_DEFS.reminders,
  NAV_ITEM_DEFS.delivery,
  NAV_ITEM_DEFS.apiPartners,
  NAV_ITEM_DEFS.partnerReports,
  NAV_ITEM_DEFS.finance,
  NAV_ITEM_DEFS.staff,
  NAV_ITEM_DEFS.settings,
];

export function getVisibleNavGroups(user) {
  return NAV_GROUPS.map((group) => {
    if (group.type === 'link') {
      return canAccessAdminNav(user, group.item) ? group : null;
    }
    const items = group.items.filter((item) => canAccessAdminNav(user, item));
    if (!items.length) return null;
    return { ...group, items };
  }).filter(Boolean);
}

function navItemMatchesPath(item, pathname) {
  const normalized = pathname.replace(/\/$/, '') || '/admin';
  if (item.end) return normalized === item.to;
  return normalized === item.to || normalized.startsWith(`${item.to}/`);
}

export function isNavGroupActive(group, pathname) {
  if (group.type === 'link') return navItemMatchesPath(group.item, pathname);
  return group.items.some((item) => navItemMatchesPath(item, pathname));
}

export function canAccessAdminNav(user, item) {
  if (!user || user.role === 'customer') return false;
  if (item.superAdminOnly && !isSuperAdminUser(user)) return false;
  if (item.adminOnly) return isAdminUser(user);
  if (isAdminUser(user)) return true;
  if (user.role !== 'staff') return false;
  return hasAnyStaffPermission(user, item.permissions);
}

export function canAccessAdminPath(user, pathname) {
  if (!user || user.role === 'customer') return false;
  if (pathname === '/admin' || pathname === '/admin/') return user.role !== 'customer';

  const normalized = pathname.replace(/\/$/, '') || '/admin';

  if (ADMIN_ONLY_PATHS.some((p) => normalized === p || normalized.startsWith(`${p}/`))) {
    if (normalized.startsWith('/admin/staff')) return isSuperAdminUser(user) || user.role === 'admin';
    return isAdminUser(user);
  }

  if (normalized.startsWith('/admin/products')) {
    return hasStaffPermission(user, 'products:read');
  }
  if (normalized.startsWith('/admin/orders') || normalized.startsWith('/admin/leads')) {
    return hasStaffPermission(user, 'orders:read');
  }
  if (normalized.startsWith('/admin/customers')) {
    return hasStaffPermission(user, 'users:read');
  }
  if (normalized.startsWith('/admin/content')) {
    return hasStaffPermission(user, 'cms:read');
  }
  if (normalized.startsWith('/admin/blog')) {
    return hasStaffPermission(user, 'blog:read');
  }
  if (normalized.startsWith('/admin/reminders')) {
    return hasStaffPermission(user, 'reminders:read');
  }

  return isAdminUser(user);
}
