import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const API_BASE = {
  sandbox: 'https://apisandbox.nepalpayment.com',
  production: 'https://api.nepalpayment.com',
};

const GATEWAY_URL = {
  sandbox: 'https://gatewaysandbox.nepalpayment.com/Payment/Index',
  production: 'https://gateway.nepalpayment.com/Payment/Index',
};

/** HMAC-SHA512 signature: alphabetical keys → concatenated values → hex digest. */
export function generateSignature(payload, secretKey) {
  const keys = Object.keys(payload)
    .filter((k) => k !== 'Signature' && payload[k] != null && payload[k] !== '')
    .sort((a, b) => a.localeCompare(b));
  const value = keys.map((k) => String(payload[k])).join('');
  return crypto.createHmac('sha512', secretKey).update(value, 'utf8').digest('hex');
}

function resolveCreds(creds = {}) {
  const merchantId = creds.merchantId || config.payments?.nps?.merchantId;
  const merchantName = creds.merchantName || creds.merchantEmail || config.payments?.nps?.merchantName;
  const secretKey = creds.secretKey || config.payments?.nps?.secretKey;
  const apiUsername = creds.apiUsername || config.payments?.nps?.apiUsername;
  const apiPassword = creds.apiPassword || config.payments?.nps?.apiPassword;
  const instrumentCode = creds.instrumentCode || config.payments?.nps?.instrumentCode || '';

  if (!merchantId || !merchantName || !secretKey) {
    throw new ApiError(503, 'NPS OnePG (card) is not configured — set Merchant ID, Merchant Name, and Secret Key');
  }
  if (!apiUsername || !apiPassword) {
    throw new ApiError(503, 'NPS OnePG (card) is not configured — set API Username and API Password');
  }

  return { merchantId, merchantName, secretKey, apiUsername, apiPassword, instrumentCode };
}

function authHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function apiBase(env) {
  return env === 'production' ? API_BASE.production : API_BASE.sandbox;
}

function gatewayUrl(env) {
  return env === 'production' ? GATEWAY_URL.production : GATEWAY_URL.sandbox;
}

async function postNps(path, body, creds, env) {
  const { secretKey, apiUsername, apiPassword } = resolveCreds(creds);
  const payload = { ...body };
  payload.Signature = generateSignature(payload, secretKey);

  const response = await fetch(`${apiBase(env)}${path}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(apiUsername, apiPassword),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(502, 'Invalid response from NPS OnePG');
  }

  const code = String(data?.code ?? data?.Code ?? '');
  if (!response.ok || code === '1') {
    const errMsg =
      data?.errors?.[0]?.error_message
      || data?.Errors?.[0]?.error_message
      || data?.message
      || data?.Message
      || 'NPS OnePG request failed';
    throw new ApiError(400, errMsg);
  }

  return data?.data ?? data?.Data ?? data;
}

export const initiatePayment = async (order, creds, env = 'sandbox') => {
  const { merchantId, merchantName, secretKey, instrumentCode } = resolveCreds(creds);
  const amount = Number(order.total).toFixed(2);
  const merchantTxnId = String(order.orderNumber);

  const processData = await postNps(
    '/GetProcessId',
    {
      MerchantId: String(merchantId),
      MerchantName: String(merchantName),
      Amount: amount,
      MerchantTxnId: merchantTxnId,
    },
    creds,
    env
  );

  const processId = processData?.ProcessId || processData?.processId;
  if (!processId) {
    throw new ApiError(400, 'NPS OnePG did not return a ProcessId');
  }

  const responseUrl = `${config.clientUrl}/checkout/card/callback`;

  return {
    type: 'nps_onepg',
    paymentUrl: gatewayUrl(env),
    MerchantId: String(merchantId),
    MerchantName: String(merchantName),
    Amount: amount,
    MerchantTxnId: merchantTxnId,
    ProcessId: processId,
    InstrumentCode: instrumentCode || '',
    TransactionRemarks: `Order ${merchantTxnId}`,
    ResponseUrl: responseUrl,
    environment: env || 'sandbox',
  };
};

export const checkTransactionStatus = async (merchantTxnId, creds, env = 'sandbox') => {
  const { merchantId, merchantName } = resolveCreds(creds);
  return postNps(
    '/CheckTransactionStatus',
    {
      MerchantId: String(merchantId),
      MerchantName: String(merchantName),
      MerchantTxnId: String(merchantTxnId),
    },
    creds,
    env
  );
};

export const verifyPayment = async (verificationData, creds, env = 'sandbox') => {
  const merchantTxnId = verificationData?.merchantTxnId || verificationData?.MerchantTxnId;
  if (!merchantTxnId) {
    throw new ApiError(400, 'Missing MerchantTxnId for NPS verification');
  }

  const data = await checkTransactionStatus(merchantTxnId, creds, env);
  const status = String(data?.Status || data?.status || '').toLowerCase();

  if (status === 'pending') {
    throw new ApiError(400, 'NPS payment is still pending. Please wait or try again.');
  }
  if (status !== 'success') {
    throw new ApiError(400, data?.CbsMessage || 'NPS card payment failed or was not completed');
  }

  return {
    transactionId:
      data?.GatewayReferenceNo
      || verificationData?.gatewayTxnId
      || verificationData?.GatewayTxnId
      || merchantTxnId,
    gatewayResponse: data,
  };
};
