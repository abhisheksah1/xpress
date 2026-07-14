import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storeApi } from '../api/store.js';
import {
  convertFromNpr,
  formatMoney,
  getCheckoutDisplayCurrencies,
  getDefaultCurrency,
} from '../utils/currency.js';
import { resolveFaviconUrl } from '../config/brandLogo.js';

const DISPLAY_CURRENCY_KEY = 'koseli-display-currency';

const StoreContext = createContext({
  settings: {},
  headerNav: null,
  footerNav: null,
  loading: true,
  currencies: [],
  displayCurrencyCode: 'NPR',
  displayCurrency: null,
  setDisplayCurrencyCode: () => {},
  formatPriceNpr: (n) => `Rs. ${n}`,
});

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [headerNav, setHeaderNav] = useState(null);
  const [footerNav, setFooterNav] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayCurrencyCode, setDisplayCurrencyCodeState] = useState(() => {
    if (typeof window === 'undefined') return 'NPR';
    return localStorage.getItem(DISPLAY_CURRENCY_KEY) || 'NPR';
  });

  // Never expose undefined settings — live API can return empty/null payloads
  const safeSettings = settings && typeof settings === 'object' ? settings : {};

  const currencies = useMemo(() => getCheckoutDisplayCurrencies(safeSettings), [safeSettings]);

  const displayCurrency = useMemo(
    () => currencies.find((c) => c.code === displayCurrencyCode) || getDefaultCurrency(safeSettings),
    [currencies, displayCurrencyCode, safeSettings]
  );

  const setDisplayCurrencyCode = (code) => {
    setDisplayCurrencyCodeState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISPLAY_CURRENCY_KEY, code);
    }
  };

  const formatPriceNpr = (amountNpr) =>
    formatMoney(convertFromNpr(amountNpr, displayCurrency), displayCurrency);

  useEffect(() => {
    const root = document.documentElement;
    const primary = safeSettings.primary_color || '#E11D48';
    const secondary = safeSettings.secondary_color || '#1E293B';
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-secondary', secondary);
  }, [safeSettings.primary_color, safeSettings.secondary_color]);

  useEffect(() => {
    const href = resolveFaviconUrl(safeSettings);
    const iconLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    iconLinks.forEach((el) => {
      if (href) {
        el.setAttribute('href', href);
      } else if (el.getAttribute('rel') === 'icon') {
        el.setAttribute('href', '/vite.svg');
      }
    });

    if (href && !document.querySelector('link[rel="apple-touch-icon"]')) {
      const apple = document.createElement('link');
      apple.setAttribute('rel', 'apple-touch-icon');
      apple.setAttribute('href', href);
      document.head.appendChild(apple);
    }
  }, [safeSettings.favicon_url, safeSettings.logo_url]);

  useEffect(() => {
    if (loading || !currencies.length) return;
    const valid = currencies.some((c) => c.code === displayCurrencyCode);
    if (!valid) {
      const fallback = getDefaultCurrency(safeSettings)?.code || currencies[0]?.code || 'NPR';
      setDisplayCurrencyCode(fallback);
    }
  }, [loading, currencies, displayCurrencyCode, safeSettings]);

  const refresh = async () => {
    try {
      const [settingsRes, headerRes, footerRes] = await Promise.all([
        storeApi.getSettings(),
        storeApi.getNavbar('header'),
        storeApi.getNavbar('footer'),
      ]);
      const payload = settingsRes?.data?.data;
      setSettings(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {});
      setHeaderNav(headerRes?.data?.data?.[0] || null);
      setFooterNav(footerRes?.data?.data?.[0] || null);
    } catch {
      setSettings((prev) => (prev && typeof prev === 'object' ? prev : {}));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        settings: safeSettings,
        headerNav,
        footerNav,
        loading,
        refresh,
        currencies,
        displayCurrencyCode,
        displayCurrency,
        setDisplayCurrencyCode,
        formatPriceNpr,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
