import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useStore } from '../../context/StoreContext.jsx';
import NavbarCurrencySelect from './NavbarCurrencySelect.jsx';
import { resolveBrandLogoAlt, resolveBrandLogoUrl } from '../../config/brandLogo.js';
import StoreLogo from './StoreLogo.jsx';

const DEFAULT_ANNOUNCEMENT = {
  enabled: true,
  text: 'Same-Day Flowers & Cake Delivery Available all major cities in Nepal — Order by 4:00 PM NST',
  backgroundColor: '#22c55e',
  textColor: '#ffffff',
};

const DEFAULT_HEADER_OPTIONS = {
  showSearch: true,
  showCart: true,
  showCurrency: true,
  showLogin: true,
  showReminders: true,
  showLogo: true,
  searchPlaceholder: 'Search gifts & flowers...',
};

const DEFAULT_MENU_BAR = {
  enabled: true,
  backgroundColor: '#f3f4f6',
};

function NavItemLink({ item, className, onNavigate }) {
  const isExternal = item.link?.startsWith('http');
  if (isExternal) {
    return (
      <a
        href={item.link}
        target={item.openInNewTab ? '_blank' : undefined}
        rel="noreferrer"
        className={className}
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.link || '/'} className={className} onClick={onNavigate}>
      {item.label}
    </Link>
  );
}

function MenuDropdown({ item, onNavigate }) {
  const children = (item.children || []).filter((c) => c.label);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const hasDropdown = item.type === 'dropdown' || children.length > 0;

  if (!hasDropdown) {
    return (
      <NavItemLink
        item={item}
        className="text-sm font-medium text-gray-800 hover:text-primary-600 whitespace-nowrap px-2 py-3 inline-flex items-center gap-1"
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="text-sm font-medium text-gray-800 hover:text-primary-600 whitespace-nowrap px-2 py-3 inline-flex items-center gap-1"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{item.label}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[200px] rounded-lg border border-gray-100 bg-white shadow-lg py-1">
          {children.length > 0 ? (
            children.map((child, idx) => (
              <NavItemLink
                key={child._id || idx}
                item={child}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                onNavigate={() => { setOpen(false); onNavigate?.(); }}
              />
            ))
          ) : (
            <NavItemLink
              item={item}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
              onNavigate={() => { setOpen(false); onNavigate?.(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function HeaderIconLink({ to, label, children, className = '' }) {
  return (
    <Link to={to} className={`p-2 text-gray-800 hover:text-primary-600 transition-colors ${className}`.trim()} aria-label={label}>
      {children}
    </Link>
  );
}

function UserIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

const accountBtnClass =
  'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-gray-800 border border-gray-200 bg-white hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors whitespace-nowrap';

const accountBtnCompactClass =
  'inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-800 border border-gray-200 bg-white hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors shrink-0';

function AccountNavControl({ user, onNavigate, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const closeMenu = () => {
    setOpen(false);
    onNavigate?.();
  };

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/');
  };

  if (!user) {
    if (compact) {
      return (
        <Link to="/login" className={accountBtnCompactClass} onClick={onNavigate} aria-label="Login">
          <UserIcon className="w-5 h-5" />
        </Link>
      );
    }
    return (
      <Link to="/login" className={accountBtnClass} onClick={onNavigate}>
        <UserIcon />
        <span>Login</span>
      </Link>
    );
  }

  const displayName = user.name?.trim().split(/\s+/)[0] || 'Account';

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className={compact ? accountBtnCompactClass : accountBtnClass}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={compact ? displayName : undefined}
      >
        <UserIcon className={compact ? 'w-5 h-5' : undefined} />
        {!compact && (
          <>
            <span className="max-w-[5.5rem] truncate">{displayName}</span>
            <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 min-w-[9.5rem] rounded-lg border border-gray-100 bg-white shadow-lg py-1 z-50"
          role="menu"
        >
          <Link
            to="/orders"
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
            onClick={closeMenu}
            role="menuitem"
          >
            My orders
          </Link>
          <button
            type="button"
            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            onClick={handleLogout}
            role="menuitem"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function LogoMark({ logoUrl, storeName, alt }) {
  return (
    <StoreLogo
      src={logoUrl}
      alt={alt}
      storeName={storeName}
      variant="header"
    />
  );
}

export default function StoreHeader() {
  const count = useCartStore((s) => s.count());
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { settings, headerNav } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);
  const headerRef = useRef(null);

  const storeName = settings.registry_company_name || settings.store_name || 'KoseliXpress';
  const logoUrl = resolveBrandLogoUrl({ headerNav, footerNav: null, settings, placement: 'header' });
  const logoAlt = resolveBrandLogoAlt({ headerNav, settings });
  const announcement = { ...DEFAULT_ANNOUNCEMENT, ...(headerNav?.announcement || {}) };
  const headerOptions = { ...DEFAULT_HEADER_OPTIONS, ...(headerNav?.headerOptions || {}) };
  const menuBar = { ...DEFAULT_MENU_BAR, ...(headerNav?.menuBar || {}) };

  const headerItems = useMemo(
    () => (headerNav?.items || [])
      .filter((i) => i.isActive !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [headerNav?.items]
  );

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return undefined;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty('--store-header-h', `${el.offsetHeight}px`);
    };

    syncHeaderHeight();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeaderHeight) : null;
    ro?.observe(el);
    window.addEventListener('resize', syncHeaderHeight);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncHeaderHeight);
    };
  }, [announcement.enabled, announcement.text, menuBar.enabled, headerItems.length]);

  const goToHome = (e) => {
    e.preventDefault();
    if (location.pathname !== '/') navigate('/');
    else window.dispatchEvent(new CustomEvent('store:home-refresh'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileOpen(false);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/shop?search=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery('');
    setMobileOpen(false);
  };

  const handleMobileLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 shadow-sm">
      {announcement.enabled && announcement.text && (
        <div
          className="text-center text-xs sm:text-sm font-semibold px-3 py-2 sm:py-2.5"
          style={{ backgroundColor: announcement.backgroundColor, color: announcement.textColor }}
        >
          {announcement.text}
        </div>
      )}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-2 min-w-0">
            <div className={`relative z-10 flex items-center justify-start shrink-0 min-w-[40px] ${searchOpen ? 'flex-1 sm:flex-none' : ''}`}>
              {headerOptions.showSearch && (
                <div className="relative">
                  {searchOpen ? (
                    <form onSubmit={submitSearch} className="flex items-center gap-1">
                      <input
                        ref={searchRef}
                        className="input-field text-sm py-1.5 w-[calc(100vw-5.5rem)] max-w-[9rem] sm:max-w-[12rem] sm:w-48"
                        placeholder={headerOptions.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <button type="button" className="p-2 text-gray-500 shrink-0" onClick={() => setSearchOpen(false)} aria-label="Close search">✕</button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="p-2 text-gray-800 hover:text-primary-600"
                      aria-label="Search"
                      onClick={() => setSearchOpen(true)}
                    >
                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {headerOptions.showLogo !== false && (
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] pointer-events-none max-w-[min(52vw,180px)] sm:max-w-[220px] ${
                  searchOpen ? 'hidden sm:block' : ''
                }`}
              >
                <a
                  href="/"
                  onClick={goToHome}
                  className="pointer-events-auto inline-flex items-center justify-center w-full"
                  aria-label={`${storeName} — home`}
                >
                  <LogoMark logoUrl={logoUrl} storeName={storeName} alt={logoAlt} />
                </a>
              </div>
            )}

            <div className="relative z-10 flex items-center justify-end shrink-0 gap-0 min-w-0">
              {headerOptions.showCurrency && (
                <div className="hidden lg:block">
                  <NavbarCurrencySelect />
                </div>
              )}
              {headerOptions.showReminders !== false && (
                <HeaderIconLink to="/reminders" label="Reminders" className="hidden md:inline-flex">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </HeaderIconLink>
              )}
              {headerOptions.showLogin !== false && (
                <>
                  <span className="md:hidden">
                    <AccountNavControl user={user} compact />
                  </span>
                  <span className="hidden md:inline-flex">
                    <AccountNavControl user={user} />
                  </span>
                </>
              )}
              {headerOptions.showCart && (
                <Link to="/cart" className="relative p-2 text-gray-800 hover:text-primary-600 shrink-0" aria-label="Shopping cart">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 6h15l-1.5 9H8L6 6zm0 0L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" />
                  </svg>
                  {count > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              )}
              <button
                type="button"
                className="p-2 text-gray-800 hover:text-primary-600 md:hidden shrink-0"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuBar.enabled && headerItems.length > 0 && (
        <div className="hidden md:block border-b border-gray-200" style={{ backgroundColor: menuBar.backgroundColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap items-center justify-center gap-x-1 lg:gap-x-2">
              {headerItems.map((item) => (
                <MenuDropdown key={item._id || item.label} item={item} />
              ))}
            </nav>
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(100%,320px)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                {headerOptions.showLogo !== false && (
                  <LogoMark logoUrl={logoUrl} storeName={storeName} alt={logoAlt} />
                )}
                <span className="font-semibold text-gray-900">Menu</span>
              </div>
              <button type="button" className="p-2 text-gray-500" onClick={() => setMobileOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="p-4 border-b border-gray-100">
              {headerOptions.showSearch && (
                <form onSubmit={submitSearch}>
                  <input
                    className="input-field text-sm"
                    placeholder={headerOptions.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
              )}
              {headerOptions.showCurrency && (
                <div className="mt-3">
                  <NavbarCurrencySelect />
                </div>
              )}
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {headerItems.map((item) => {
                const children = (item.children || []).filter((c) => c.label);
                return (
                  <div key={item._id || item.label} className="border-b border-gray-50 pb-2 mb-2">
                    <NavItemLink
                      item={item}
                      className="block py-2 font-medium text-gray-900"
                      onNavigate={() => setMobileOpen(false)}
                    />
                    {children.map((child, idx) => (
                      <NavItemLink
                        key={child._id || idx}
                        item={child}
                        className="block py-1.5 pl-3 text-sm text-gray-600"
                        onNavigate={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                );
              })}
              <Link to="/reminders" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>Reminders</Link>
              {headerOptions.showLogin !== false && (
                user ? (
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <p className="text-xs text-gray-400 mb-1">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 mb-2">{user.name || user.email}</p>
                    <Link to="/orders" className="block py-2 text-gray-700" onClick={() => setMobileOpen(false)}>My orders</Link>
                    <button
                      type="button"
                      className="block w-full text-left py-2 text-red-600 font-medium"
                      onClick={handleMobileLogout}
                    >
                      Log out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 mt-1 px-3 py-2 rounded-lg text-sm font-semibold text-primary-600 border border-primary-200 bg-primary-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserIcon />
                    Login
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
