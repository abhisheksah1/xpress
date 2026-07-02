import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';

export function useStoreSettings() {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await adminApi.getSettings();
    const list = data.data;
    setSettings(list);
    const map = {};
    list.forEach((s) => { map[s.key] = s.value; });
    setValues(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));

  const saveKeys = async (keys) => {
    const payload = keys.map((key) => ({ key, value: values[key] }));
    await adminApi.bulkUpdateSettings(payload);
  };

  const get = (key, fallback) => values[key] ?? fallback;

  return { settings, values, set, get, saveKeys, load, loading, setValues };
}
