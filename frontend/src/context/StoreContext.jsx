import { createContext, useContext, useEffect, useState } from 'react';
import { storeApi } from '../api/store.js';

const StoreContext = createContext({ settings: {}, headerNav: null, footerNav: null, loading: true });

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [headerNav, setHeaderNav] = useState(null);
  const [footerNav, setFooterNav] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.primary_color || '#E11D48';
    const secondary = settings.secondary_color || '#1E293B';
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-secondary', secondary);
  }, [settings.primary_color, settings.secondary_color]);

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
  }, []);

  return (
    <StoreContext.Provider value={{ settings, headerNav, footerNav, loading, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
