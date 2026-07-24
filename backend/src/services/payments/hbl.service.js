import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

function resolveEnv(env) {
  return env === 'production' ? 'production' : 'sandbox';
}

function buildSandboxUrl(order, method) {
  const params = new URLSearchParams({
    method,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    amount: String(order.total),
  });
  return `${config.clientUrl}/checkout/sandbox/pay?${params.toString()}`;
}

/**
 * HBL — sandbox uses local test checkout page.
 * Production requires merchant credentials from Himalayan Bank.
 */
export const initiatePayment = async (order, creds, env) => {
  const mode = resolveEnv(env);

  if (mode === 'sandbox') {
    return {
      merchantId: creds?.merchantId || 'HBL-SANDBOX',
      accessKey: creds?.accessKey || '',
      amount: order.total,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      returnUrl: `${config.clientUrl}/checkout/hbl/callback`,
      paymentUrl: buildSandboxUrl(order, 'hbl'),
      environment: 'sandbox',
      sandbox: true,
    };
  }

  if (!creds?.merchantId) {
    throw new ApiError(503, 'HBL payment is not configured');
  }

  return {
    merchantId: creds.merchantId,
    accessKey: creds.accessKey,
    amount: order.total,
    orderNumber: order.orderNumber,
    returnUrl: `${config.clientUrl}/checkout/hbl/callback`,
    paymentUrl: creds.paymentUrl || 'https://hbl.gateway.example/checkout',
    environment: 'production',
  };
};

export const verifyPayment = async (verificationData) => {
  if (verificationData?.sandbox === true || verificationData?.status === 'sandbox_success') {
    if (verificationData?.status === 'sandbox_failed') {
      throw new ApiError(400, 'HBL sandbox payment failed');
    }
    return {
      transactionId: verificationData.transactionId || `hbl-sandbox-${Date.now()}`,
      gatewayResponse: verificationData,
    };
  }

  if (!verificationData.transactionId) {
    throw new ApiError(400, 'HBL transaction reference is missing');
  }

  return {
    transactionId: verificationData.transactionId,
    gatewayResponse: verificationData,
  };
};
