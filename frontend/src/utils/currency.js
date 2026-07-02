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

export const getEnabledCurrencies = (settings) => {
  const multi = settings?.multi_currencies || { currencies: [] };
  const list = (multi.currencies || []).filter((c) => c.enabled !== false);
  if (list.length) return list;
  return [{ code: 'NPR', name: 'Nepalese Rupee', symbol: settings?.currency_symbol || 'Rs.', rate: 1, isDefault: true }];
};

export const getDefaultCurrency = (settings) => {
  const list = getEnabledCurrencies(settings);
  return list.find((c) => c.isDefault) || list.find((c) => c.code === 'NPR') || list[0];
};
