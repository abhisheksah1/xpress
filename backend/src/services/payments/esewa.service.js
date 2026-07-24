import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const ESEWA_URLS = {
  sandbox: {
    payment: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    verify: 'https://rc-epay.esewa.com.np/api/epay/transaction/status/',
  },
  production: {
    payment: 'https://epay.esewa.com.np/api/epay/main/v2/form',
    verify: 'https://epay.esewa.com.np/api/epay/transaction/status/',
  },
};

/** Official eSewa UAT merchant credentials (test only). */
const SANDBOX_DEFAULTS = {
  merchantCode: 'EPAYTEST',
  secretKey: '8gBm/:&EnhH.1/q',
};

function resolveEnv(env) {
  return env === 'production' ? 'production' : 'sandbox';
}

function resolveCreds(creds = {}, env) {
  const mode = resolveEnv(env);
  const merchantCode =
    creds?.merchantId || creds?.merchantCode || config.payments.esewa.merchantCode
    || (mode === 'sandbox' ? SANDBOX_DEFAULTS.merchantCode : '');
  const secretKey =
    creds?.secretKey || config.payments.esewa.secretKey
    || (mode === 'sandbox' ? SANDBOX_DEFAULTS.secretKey : '');

  if (!merchantCode || !secretKey) {
    throw new ApiError(503, 'eSewa is not configured');
  }

  return { merchantCode, secretKey, mode };
}

export const initiatePayment = async (order, creds, env) => {
  const { merchantCode, secretKey, mode } = resolveCreds(creds, env);
  const urls = ESEWA_URLS[mode];

  const transactionUuid = `${order.orderNumber}-${Date.now()}`;
  const amount = Number(order.total).toFixed(2);

  const signatureData = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${merchantCode}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureData)
    .digest('base64');

  return {
    amount,
    tax_amount: '0',
    total_amount: amount,
    transaction_uuid: transactionUuid,
    product_code: merchantCode,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: `${config.clientUrl}/checkout/esewa/success`,
    failure_url: `${config.clientUrl}/checkout/esewa/failure`,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
    paymentUrl: urls.payment,
    environment: mode,
  };
};

export const verifyPayment = async (productCode, totalAmount, transactionUuid, creds, env) => {
  const { merchantCode, mode } = resolveCreds(creds, env);
  const code = productCode || merchantCode;
  const urls = ESEWA_URLS[mode];
  const configuredVerify = String(config.payments.esewa.verifyUrl || '').trim();
  const verifyBase = configuredVerify || urls.verify;
  const url = `${verifyBase}?product_code=${encodeURIComponent(code)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (data.status !== 'COMPLETE') {
    throw new ApiError(400, 'eSewa payment verification failed');
  }

  return {
    transactionId: transactionUuid,
    gatewayResponse: data,
  };
};
