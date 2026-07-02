import { Settings } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const NRB_BASE_URL = 'https://www.nrb.org.np/api/forex/v1';
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

const SYMBOLS = {
  NPR: 'Rs.',
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  CHF: 'CHF',
  SGD: 'S$',
  SAR: '﷼',
  QAR: '﷼',
  AED: 'د.إ',
  HKD: 'HK$',
  KRW: '₩',
  THB: '฿',
};

const formatDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const fetchNrbRates = async (date = new Date()) => {
  const day = formatDate(date);
  const url = `${NRB_BASE_URL}/rates?page=1&per_page=100&from=${day}&to=${day}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new ApiError(502, `NRB FOREX API request failed (${res.status})`);
  }

  const body = await res.json();
  if (body?.status?.code !== 200) {
    throw new ApiError(502, 'NRB FOREX API returned an error response');
  }

  const payload = body?.data?.payload;
  if (!Array.isArray(payload) || !payload.length) {
    throw new ApiError(404, 'No FOREX rates published for the selected date');
  }

  const latest = payload[0];
  return {
    date: latest.date,
    publishedOn: latest.published_on,
    modifiedOn: latest.modified_on,
    rates: latest.rates || [],
  };
};

export const nprPerUnitFromNrb = (rateItem) => {
  const buy = Number(rateItem.buy);
  const unit = Number(rateItem.currency?.unit) || 1;
  if (!buy || !unit) return null;
  return buy / unit;
};

export const conversionRateFromNpr = (nprPerUnit) => {
  if (!nprPerUnit) return 1;
  return Number((1 / nprPerUnit).toFixed(8));
};

const buildRateMap = (rates) => {
  const map = new Map();
  for (const item of rates) {
    const code = String(item.currency?.iso3 || item.currency?.ISO3 || '').toUpperCase();
    if (!code) continue;
    const nprPerUnit = nprPerUnitFromNrb(item);
    if (!nprPerUnit) continue;
    map.set(code, {
      code,
      name: item.currency?.name || code,
      unit: Number(item.currency?.unit) || 1,
      buy: Number(item.buy),
      sell: Number(item.sell),
      nprPerUnit,
      rate: conversionRateFromNpr(nprPerUnit),
    });
  }
  return map;
};

export const syncNrbRatesToSettings = async (userId = null) => {
  const [multiSetting, autoSyncSetting] = await Promise.all([
    Settings.findOne({ key: 'multi_currencies' }),
    Settings.findOne({ key: 'currency_nrb_auto_sync' }),
  ]);

  const multi = multiSetting?.value || { defaultCode: 'NPR', currencies: [] };
  const currencies = Array.isArray(multi.currencies) ? [...multi.currencies] : [];

  const nrb = await fetchNrbRates();
  const rateMap = buildRateMap(nrb.rates);
  let updated = 0;

  const merged = currencies.map((currency) => {
    if (currency.code === 'NPR') {
      return { ...currency, rate: 1, nprPerUnit: 1, source: 'base', symbol: currency.symbol || 'Rs.' };
    }

    if (currency.manualOverride) return currency;

    const nrbRate = rateMap.get(String(currency.code || '').toUpperCase());
    if (!nrbRate) return currency;

    updated += 1;
    return {
      ...currency,
      name: currency.name || nrbRate.name,
      symbol: currency.symbol || SYMBOLS[nrbRate.code] || currency.code,
      rate: nrbRate.rate,
      nprPerUnit: nrbRate.nprPerUnit,
      buyRate: nrbRate.buy,
      sellRate: nrbRate.sell,
      unit: nrbRate.unit,
      source: 'nrb',
      syncedAt: new Date().toISOString(),
    };
  });

  const syncMeta = {
    at: new Date().toISOString(),
    date: nrb.date,
    publishedOn: nrb.publishedOn,
    modifiedOn: nrb.modifiedOn,
    updated,
    totalNrbRates: nrb.rates.length,
    message: `Synced ${updated} currency rate(s) from NRB`,
  };

  const updates = [
    { key: 'multi_currencies', value: { ...multi, currencies: merged } },
    { key: 'currency_nrb_last_sync', value: syncMeta },
  ];

  for (const item of updates) {
    await Settings.findOneAndUpdate(
      { key: item.key },
      { value: item.value, updatedBy: userId || undefined },
      { new: true, upsert: false }
    );
  }

  return { ...syncMeta, currencies: merged };
};

let schedulerStarted = false;

export const startForexScheduler = async () => {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const runSync = async () => {
    try {
      const setting = await Settings.findOne({ key: 'currency_nrb_auto_sync' });
      const enabled = setting?.value !== false && setting?.value !== 'false';
      if (!enabled) return;

      const result = await syncNrbRatesToSettings();
      console.log(`[NRB Forex] ${result.message} (${result.date})`);
    } catch (err) {
      console.error('[NRB Forex] Auto-sync failed:', err.message);
      await Settings.findOneAndUpdate(
        { key: 'currency_nrb_last_sync' },
        {
          value: {
            at: new Date().toISOString(),
            message: err.message,
            error: true,
          },
        }
      );
    }
  };

  // Initial sync shortly after startup
  setTimeout(runSync, 5000);
  setInterval(runSync, SYNC_INTERVAL_MS);
};
