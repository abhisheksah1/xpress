import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const initiateUrl = (env) =>
  env === 'production'
    ? 'https://khalti.com/api/v2/epayment/initiate/'
    : 'https://dev.khalti.com/api/v2/epayment/initiate/';

/** ePayment v2 lookup — never use legacy /payment/verify/ (widget API). */
const lookupUrl = (env) => {
  const configured = String(config.payments.khalti.verifyUrl || '').trim();
  const isLegacyWidget = /\/payment\/verify\/?$/i.test(configured);
  const isLookup = /epayment\/lookup/i.test(configured);

  if (configured && !isLegacyWidget && isLookup) {
    if (env === 'production') {
      return configured.replace('https://dev.khalti.com', 'https://khalti.com');
    }
    return configured.replace('https://khalti.com', 'https://dev.khalti.com');
  }

  return env === 'production'
    ? 'https://khalti.com/api/v2/epayment/lookup/'
    : 'https://dev.khalti.com/api/v2/epayment/lookup/';
};

export const initiatePayment = async (order, creds, env) => {
  const secretKey = creds?.secretKey || config.payments.khalti.secretKey;
  const publicKey = creds?.publicKey || config.payments.khalti.publicKey;
  if (!secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }

  const amountPaisa = Math.round(Number(order.total) * 100);
  const response = await fetch(initiateUrl(env), {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: `${config.clientUrl}/checkout/khalti/callback`,
      website_url: config.clientUrl,
      amount: amountPaisa,
      purchase_order_id: order.orderNumber,
      purchase_order_name: `Order ${order.orderNumber}`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.pidx) {
    throw new ApiError(400, data?.detail || data?.error_key || data?.message || 'Khalti payment initiation failed');
  }

  return {
    pidx: data.pidx,
    payment_url: data.payment_url,
    paymentUrl: data.payment_url,
    amount: amountPaisa,
    purchaseOrderId: order.orderNumber,
    purchaseOrderName: `Order ${order.orderNumber}`,
    returnUrl: `${config.clientUrl}/checkout/khalti/callback`,
    websiteUrl: config.clientUrl,
    publicKey,
    environment: env || 'sandbox',
  };
};

/**
 * Verify Khalti ePayment using Payment Lookup API.
 * Body must be { pidx } only — not the legacy widget { token, amount }.
 */
export const verifyPayment = async (pidx, expectedAmountPaisa, creds, env = 'production') => {
  const secretKey = creds?.secretKey || config.payments.khalti.secretKey;
  if (!secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }
  if (!pidx) {
    throw new ApiError(400, 'Khalti payment reference (pidx) is missing');
  }

  const verifyUrl = lookupUrl(env);
  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(400, data.detail || data.error_key || data.message || 'Khalti payment verification failed');
  }

  const status = String(data.status || '');
  if (status !== 'Completed') {
    if (['Pending', 'Initiated'].includes(status)) {
      const err = new ApiError(202, `Khalti payment is still ${status.toLowerCase()}. Please wait a moment.`);
      err.outcome = 'pending';
      throw err;
    }
    throw new ApiError(400, `Khalti payment ${status || 'not completed'}`);
  }

  const paidPaisa = Number(data.total_amount);
  if (
    Number.isFinite(expectedAmountPaisa)
    && Number.isFinite(paidPaisa)
    && Math.abs(paidPaisa - expectedAmountPaisa) > 1
  ) {
    throw new ApiError(
      400,
      `Khalti amount mismatch (paid ${paidPaisa} paisa, expected ${expectedAmountPaisa} paisa)`
    );
  }

  return {
    transactionId: data.transaction_id || data.idx || pidx,
    gatewayResponse: data,
    outcome: 'success',
  };
};
