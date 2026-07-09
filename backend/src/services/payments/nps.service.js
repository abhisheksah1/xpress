import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const API_BASE = {
  sandbox: 'https://apisandbox.nepalpayment.com',
  production: 'https://apigateway.nepalpayment.com',
};

const GATEWAY_URL = {
  sandbox: 'https://gatewaysandbox.nepalpayment.com/Payment/Index',
  production: 'https://gateway.nepalpayment.com/payment/index',
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

export const initiatePayment = async (order, creds, env = 'sandbox', options = {}) => {
  const { merchantId, merchantName, instrumentCode } = resolveCreds(creds);
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

  const returnBase = String(options.returnBaseUrl || config.clientUrl).replace(/\/$/, '');
  const serverBase = String(options.serverBaseUrl || config.serverUrl).replace(/\/$/, '');
  const responseUrl = `${serverBase}/api/${config.apiVersion}/store/payments/card/return?redirect=${encodeURIComponent(`${returnBase}/checkout/card/callback`)}`;

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

/** 4.1 Get Payment Instrument Details */
export const getPaymentInstruments = async (creds, env = 'sandbox') => {
  const { merchantId, merchantName } = resolveCreds(creds);
  const data = await postNps(
    '/GetPaymentInstrumentDetails',
    {
      MerchantId: String(merchantId),
      MerchantName: String(merchantName),
    },
    creds,
    env
  );
  return Array.isArray(data) ? data : [];
};

/** 4.2 Get Service Charge */
export const getServiceCharge = async ({ amount, instrumentCode }, creds, env = 'sandbox') => {
  const { merchantId, merchantName } = resolveCreds(creds);
  return postNps(
    '/GetServiceCharge',
    {
      MerchantId: String(merchantId),
      MerchantName: String(merchantName),
      Amount: Number(amount).toFixed(2),
      InstrumentCode: String(instrumentCode),
    },
    creds,
    env
  );
};

/** Test API connectivity using GetPaymentInstrumentDetails. */
export const testConnection = async (creds, env = 'sandbox') => {
  const instruments = await getPaymentInstruments(creds, env);
  return {
    ok: true,
    instrumentCount: instruments.length,
    instruments: instruments.map((item) => ({
      institutionName: item.InstitutionName || item.institutionName,
      instrumentName: item.InstrumentName || item.instrumentName,
      instrumentCode: item.InstrumentCode || item.instrumentCode,
      bankType: item.BankType || item.bankType,
      logoUrl: item.LogoUrl || item.logoUrl,
    })),
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Returns gateway outcome without throwing on fail/pending. */
export const resolvePaymentOutcome = async (verificationData, creds, env = 'sandbox', options = {}) => {
  const merchantTxnId = verificationData?.merchantTxnId || verificationData?.MerchantTxnId;
  if (!merchantTxnId) {
    throw new ApiError(400, 'Missing MerchantTxnId for NPS verification');
  }

  const maxAttempts = options.maxAttempts ?? 6;
  const delayMs = options.delayMs ?? 2000;
  let lastData = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const data = await checkTransactionStatus(merchantTxnId, creds, env);
    lastData = data;
    const status = String(data?.Status || data?.status || '').toLowerCase();

    if (status === 'success') {
      return {
        outcome: 'success',
        transactionId:
          data?.GatewayReferenceNo
          || verificationData?.gatewayTxnId
          || verificationData?.GatewayTxnId
          || merchantTxnId,
        gatewayResponse: data,
      };
    }

    if (status === 'fail' || status === 'failed') {
      return {
        outcome: 'failed',
        message: data?.CbsMessage || 'Card payment failed',
        gatewayResponse: data,
      };
    }

    if (status === 'pending' && attempt < maxAttempts) {
      await sleep(delayMs);
      continue;
    }

    if (status === 'pending') {
      return { outcome: 'pending', message: 'Payment is still processing', gatewayResponse: data };
    }

    return {
      outcome: 'failed',
      message: data?.CbsMessage || 'Card payment was not completed',
      gatewayResponse: data,
    };
  }

  return {
    outcome: 'pending',
    message: lastData?.CbsMessage || 'Payment verification timed out',
    gatewayResponse: lastData,
  };
};

export const verifyPayment = async (verificationData, creds, env = 'sandbox', options = {}) => {
  const result = await resolvePaymentOutcome(verificationData, creds, env, options);
  if (result.outcome === 'success') {
    return { transactionId: result.transactionId, gatewayResponse: result.gatewayResponse };
  }
  if (result.outcome === 'pending') {
    throw new ApiError(400, result.message || 'NPS payment is still pending');
  }
  throw new ApiError(400, result.message || 'NPS card payment failed');
};
