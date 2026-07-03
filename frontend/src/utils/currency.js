const FALLBACK_CODES = ['NPR', 'INR', 'AUD', 'USD', 'EUR', 'QAR', 'GBP', 'AED', 'SAR'];

export const getCurrencyCatalog = (settings) => {
  const multi = settings?.multi_currencies || { currencies: [] };
  const list = (multi.currencies || []).filter((c) => c.code?.trim());
  if (list.length) return list;
  return [{
    code: 'NPR',
    name: 'Nepalese Rupee',
    symbol: settings?.currency_symbol || 'Rs.',
    rate: 1,
    enabled: true,
    isDefault: true,
  }];
};

/** All currency codes configured in Multi-Currencies (+ gateway selections) for admin payment setup. */
export const getConfiguredCurrencyCodes = (settings) => {
  const fromMulti = getCurrencyCatalog(settings).map((c) => c.code.toUpperCase());
  const fromGateways = (settings?.payment_gateways || [])
    .flatMap((g) => (g.currencies || []).map((code) => String(code).toUpperCase()));
  return [...new Set(['NPR', ...fromMulti, ...fromGateways, ...FALLBACK_CODES])].sort();
};

export const getEnabledCurrencies = (settings) => {
  const list = getCurrencyCatalog(settings).filter((c) => c.enabled !== false);
  if (list.length) return list;
  return [{
    code: 'NPR',
    name: 'Nepalese Rupee',
    symbol: settings?.currency_symbol || 'Rs.',
    rate: 1,
    isDefault: true,
  }];
};

/**
 * Currencies customers can pick in the navbar / checkout:
 * enabled multi-currencies + any currency assigned to an enabled payment gateway.
 */
export const getCheckoutDisplayCurrencies = (settings) => {
  const catalog = getCurrencyCatalog(settings);
  const byCode = new Map(catalog.map((c) => [c.code.toUpperCase(), c]));
  const seen = new Set();
  const result = [];

  const addCode = (code) => {
    const upper = String(code || '').trim().toUpperCase();
    if (!upper || seen.has(upper)) return;
    seen.add(upper);
    const meta = byCode.get(upper);
    if (meta) {
      result.push(meta.enabled === false ? { ...meta, enabled: true } : meta);
      return;
    }
    result.push({
      code: upper,
      name: upper,
      symbol: upper,
      rate: upper === 'NPR' ? 1 : 0.01,
      enabled: true,
    });
  };

  catalog.filter((c) => c.enabled !== false).forEach((c) => addCode(c.code));

  (settings?.payment_gateways || []).forEach((gateway) => {
    if (gateway.enabled === false) return;
    (gateway.currencies || []).forEach(addCode);
  });

  if (!seen.has('NPR')) {
    const npr = byCode.get('NPR') || {
      code: 'NPR',
      name: 'Nepalese Rupee',
      symbol: settings?.currency_symbol || 'Rs.',
      rate: 1,
      enabled: true,
      isDefault: true,
    };
    result.unshift(npr);
  }

  if (!result.length) {
    return getEnabledCurrencies(settings);
  }

  return result;
};

export const getDefaultCurrency = (settings) => {
  const list = getCheckoutDisplayCurrencies(settings);
  const catalogDefault = getCurrencyCatalog(settings).find((c) => c.isDefault);
  if (catalogDefault && list.some((c) => c.code === catalogDefault.code)) {
    return catalogDefault;
  }
  return list.find((c) => c.code === 'NPR') || list[0];
};

export const convertFromNpr = (amountNpr, currency) => {
  const npr = Number(amountNpr) || 0;
  if (!currency || currency.code === 'NPR') return npr;
  return npr * (Number(currency.rate) || 1);
};

export const formatMoney = (amount, currency) => {
  const sym = currency?.symbol || 'Rs.';
  const code = currency?.code || 'NPR';
  const decimals = code === 'NPR' ? 0 : 2;
  return `${sym} ${Number(amount).toLocaleString('en-NP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};
