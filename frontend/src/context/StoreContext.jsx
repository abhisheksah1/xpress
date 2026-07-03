import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { storeApi } from '../api/store.js';
import {
  convertFromNpr,
  formatMoney,
  getCheckoutDisplayCurrencies,
  getDefaultCurrency,
} from '../utils/currency.js';

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

  const currencies = useMemo(() => getCheckoutDisplayCurrencies(settings), [settings]);

  const displayCurrency = useMemo(
    () => currencies.find((c) => c.code === displayCurrencyCode) || getDefaultCurrency(settings),
    [currencies, displayCurrencyCode, settings]
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
    const primary = settings.primary_color || '#E11D48';
    const secondary = settings.secondary_color || '#1E293B';
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-secondary', secondary);
  }, [settings.primary_color, settings.secondary_color]);

  useEffect(() => {
    if (loading || !currencies.length) return;
    const valid = currencies.some((c) => c.code === displayCurrencyCode);
    if (!valid) {
      const fallback = getDefaultCurrency(settings)?.code || currencies[0]?.code || 'NPR';
      setDisplayCurrencyCode(fallback);
    }
  }, [loading, currencies, displayCurrencyCode, settings]);

  const refresh = async () => {
    try {
      const [settingsRes, headerRes, footerRes] = await Promise.all([
        storeApi.getSettings(),
        storeApi.getNavbar('header'),
        storeApi.getNavbar('footer'),
      ]);
      setSettings(settingsRes.data.data);
      setHeaderNav(headerRes.data.data?.[0] || null);
      setFooterNav(footerRes.data.data?.[0] || null);
    } catch {
      /* use defaults */
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
        settings,
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
