import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const initiateUrl = (env) =>
  env === 'production'
    ? 'https://khalti.com/api/v2/epayment/initiate/'
    : 'https://dev.khalti.com/api/v2/epayment/initiate/';

export const initiatePayment = async (order, creds, env) => {
  const secretKey = creds?.secretKey || config.payments.khalti.secretKey;
  const publicKey = creds?.publicKey || config.payments.khalti.publicKey;
  if (!secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }

  const amountPaisa = Math.round(order.total * 100);
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

  const data = await response.json();
  if (!response.ok || !data?.pidx) {
    throw new ApiError(400, data?.detail || data?.error_key || 'Khalti payment initiation failed');
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

export const verifyPayment = async (token, amount, creds) => {
  const secretKey = creds?.secretKey || config.payments.khalti.secretKey;
  if (!secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }

  const verifyUrl = config.payments.khalti.verifyUrl || 'https://khalti.com/api/v2/epayment/lookup/';
  const response = await fetch(verifyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx: token, amount }),
  });

  const data = await response.json();
  if (!response.ok || data.status !== 'Completed') {
    throw new ApiError(400, data.detail || data.error_key || 'Khalti payment verification failed');
  }

  return {
    transactionId: data.transaction_id || data.idx || token,
    gatewayResponse: data,
  };
};
