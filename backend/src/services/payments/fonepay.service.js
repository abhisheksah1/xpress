import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const FONEPAY_URLS = {
  sandbox: 'https://dev-clientapi.fonepay.com/api/merchantRequest',
  production: 'https://clientapi.fonepay.com/api/merchantRequest',
};

function resolveEnv(env) {
  return env === 'production' ? 'production' : 'sandbox';
}

export const initiatePayment = async (order, creds, env) => {
  const mode = resolveEnv(env);
  const merchantCode = creds?.merchantId || config.payments.fonepay.merchantCode;
  const secretKey = creds?.secretKey || config.payments.fonepay.secretKey;
  if (!merchantCode || !secretKey) {
    throw new ApiError(503, 'Fonepay is not configured');
  }

  const prn = String(order.orderNumber).slice(0, 25);
  const amount = Number(order.total).toFixed(2);
  const date = new Date().toISOString().split('T')[0];

  const dataToSign = `${merchantCode},${prn},${amount},${date}`;
  const dv = crypto
    .createHmac('sha512', secretKey)
    .update(dataToSign)
    .digest('hex');

  return {
    merchantCode,
    prn,
    amount,
    date,
    dv,
    returnUrl: `${config.clientUrl}/checkout/fonepay/callback`,
    paymentUrl: FONEPAY_URLS[mode],
    environment: mode,
  };
};

export const verifyPayment = async ({ prn, amount, statusCode, BID, UID }) => {
  const ok = statusCode === 'success'
    || statusCode === '200'
    || String(statusCode).toLowerCase() === 'true'
    || Boolean(BID || UID);

  if (!ok) {
    throw new ApiError(400, 'Fonepay payment verification failed');
  }

  return {
    transactionId: prn || BID || UID || `fonepay-${Date.now()}`,
    gatewayResponse: { prn, amount, statusCode, BID, UID },
  };
};
