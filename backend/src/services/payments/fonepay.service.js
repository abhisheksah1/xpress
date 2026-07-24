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

export const verifyPayment = async (verificationData, order = null) => {
  const prn = String(verificationData?.prn || '').trim();
  const expectedPrn = order?.orderNumber ? String(order.orderNumber).slice(0, 25) : '';

  if (!prn) {
    throw new ApiError(400, 'Fonepay payment reference (PRN) is missing');
  }
  if (expectedPrn && prn !== expectedPrn) {
    throw new ApiError(400, 'Fonepay PRN does not match this order');
  }

  const status = String(verificationData?.statusCode || '').toLowerCase();
  const ok = status === 'success' || status === '200' || status === 'successful' || status === '0';
  if (!ok) {
    throw new ApiError(400, 'Fonepay payment verification failed');
  }

  if (verificationData?.amount != null && order?.total != null) {
    const paid = Number(verificationData.amount);
    const expected = Number(order.total);
    if (Number.isFinite(paid) && Number.isFinite(expected) && Math.abs(paid - expected) > 1) {
      throw new ApiError(400, `Fonepay amount mismatch (paid ${paid}, expected ${expected})`);
    }
  }

  return {
    transactionId: prn || verificationData.BID || verificationData.UID || `fonepay-${Date.now()}`,
    gatewayResponse: {
      prn,
      amount: verificationData.amount,
      statusCode: verificationData.statusCode,
      BID: verificationData.BID,
      UID: verificationData.UID,
    },
  };
};
