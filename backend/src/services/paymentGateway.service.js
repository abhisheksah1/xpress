import { Settings } from '../models/index.js';
import {
  getDefaultPaymentGateways,
  GATEWAY_CREDENTIAL_FIELDS,
  getNpsEnvCredentials,
  hasNpsEnvConfig,
} from '../config/paymentGatewayDefaults.js';

const SECRET_KEYS = new Set(
  Object.values(GATEWAY_CREDENTIAL_FIELDS).flatMap((fields) =>
    fields.filter((f) => f.secret).map((f) => f.key)
  )
);

const mergeWithDefaults = (stored) => {
  const defaults = getDefaultPaymentGateways();
  if (!Array.isArray(stored) || !stored.length) return defaults;

  return defaults.map((def) => {
    const saved = stored.find((g) => g.id === def.id);
    if (!saved) return def;
    return {
      ...def,
      ...saved,
      credentials: { ...def.credentials, ...(saved.credentials || {}) },
    };
  });
};

export const getPaymentGatewaysConfig = async () => {
  const setting = await Settings.findOne({ key: 'payment_gateways' });
  return mergeWithDefaults(setting?.value);
};

export const savePaymentGatewaysConfig = async (gateways, userId) => {
  const merged = mergeWithDefaults(gateways);
  return Settings.findOneAndUpdate(
    { key: 'payment_gateways' },
    { value: merged, updatedBy: userId, group: 'payment', label: 'Payment Gateways' },
    { new: true, upsert: true }
  );
};

export const getGatewayById = async (id) => {
  const gateways = await getPaymentGatewaysConfig();
  return gateways.find((g) => g.id === id);
};

const sanitizeCredentials = (gateway) => {
  const creds = { ...(gateway.credentials || {}) };
  for (const key of SECRET_KEYS) {
    if (key in creds) delete creds[key];
  }
  return creds;
};

export const sanitizeGatewayForCheckout = (gateway) => ({
  id: gateway.id,
  type: gateway.type,
  sortOrder: gateway.sortOrder,
  displayLabel: gateway.displayLabel,
  logoUrl: gateway.logoUrl,
  environment: gateway.environment,
  currencies: gateway.currencies,
  credentials: sanitizeCredentials(gateway),
});

export const getCheckoutGateways = async (currency) => {
  const gateways = await getPaymentGatewaysConfig();
  const code = currency?.toUpperCase();

  return gateways
    .filter((g) => g.enabled)
    .filter((g) => {
      if (!code) return true;
      if (!g.currencies?.length) return true;
      return g.currencies.includes(code);
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(sanitizeGatewayForCheckout);
};

const mergeCredentialFields = (saved = {}, fallback = {}) => {
  const merged = { ...fallback, ...saved };
  for (const key of Object.keys(fallback)) {
    if (!merged[key]) merged[key] = fallback[key];
  }
  return merged;
};

export const getGatewayRuntimeCredentials = async (id) => {
  const gateway = await getGatewayById(id);
  if (!gateway?.enabled) return null;

  if (id === 'card' && hasNpsEnvConfig()) {
    return {
      ...gateway,
      credentials: mergeCredentialFields(gateway.credentials, getNpsEnvCredentials()),
    };
  }
  return gateway;
};

export const syncPaymentGatewaysFromEnv = async () => {
  if (!hasNpsEnvConfig()) return;

  const envCreds = getNpsEnvCredentials();
  const envMode = process.env.NPS_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const gateways = await getPaymentGatewaysConfig();

  const updated = gateways.map((g) => {
    if (g.id !== 'card') return g;
    const neverConfigured = !g.credentials?.merchantId;
    return {
      ...g,
      ...(neverConfigured ? { enabled: true, environment: envMode } : {}),
      credentials: mergeCredentialFields(g.credentials, envCreds),
    };
  });

  await Settings.findOneAndUpdate(
    { key: 'payment_gateways' },
    { value: updated, group: 'payment', label: 'Integrated Payment Gateways' },
    { upsert: true }
  );
  await syncLegacyPaymentFlags(updated);
};

export const syncLegacyPaymentFlags = async (gateways) => {
  const map = Object.fromEntries(gateways.map((g) => [g.id, g.enabled]));
  const updates = [
    { key: 'khalti_enabled', value: !!map.khalti },
    { key: 'esewa_enabled', value: !!map.esewa },
    { key: 'fonepay_enabled', value: !!map.fonepay },
    { key: 'card_enabled', value: !!map.card },
    { key: 'cod_enabled', value: !!map.cod },
    { key: 'payment_test_mode', value: gateways.some((g) => g.enabled && g.environment === 'sandbox') },
  ];

  for (const item of updates) {
    await Settings.findOneAndUpdate({ key: item.key }, { value: item.value });
  }
};
