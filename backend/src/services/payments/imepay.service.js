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
 * IME Pay — sandbox uses local test checkout page.
 * Production requires merchant credentials + hosted payment URL from IME.
 */
export const initiatePayment = async (order, creds, env) => {
  const mode = resolveEnv(env);

  if (mode === 'sandbox') {
    return {
      merchantId: creds?.merchantId || 'IME-SANDBOX',
      amount: order.total,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      returnUrl: `${config.clientUrl}/checkout/imepay/callback`,
      paymentUrl: buildSandboxUrl(order, 'imepay'),
      environment: 'sandbox',
      sandbox: true,
    };
  }

  if (!creds?.merchantId) {
    throw new ApiError(503, 'IME Pay is not configured');
  }

  return {
    merchantId: creds.merchantId,
    amount: order.total,
    orderNumber: order.orderNumber,
    returnUrl: `${config.clientUrl}/checkout/imepay/callback`,
    paymentUrl: creds.paymentUrl || 'https://payment.imepay.com.np',
    environment: 'production',
  };
};

export const verifyPayment = async (verificationData) => {
  if (verificationData?.sandbox === true || verificationData?.status === 'sandbox_success') {
    if (verificationData?.status === 'sandbox_failed') {
      throw new ApiError(400, 'IME Pay sandbox payment failed');
    }
    return {
      transactionId: verificationData.transactionId || verificationData.refId || `ime-sandbox-${Date.now()}`,
      gatewayResponse: verificationData,
    };
  }

  const transactionId = verificationData.transactionId || verificationData.refId;
  if (!transactionId) {
    throw new ApiError(400, 'IME Pay transaction reference is missing');
  }

  return {
    transactionId,
    gatewayResponse: verificationData,
  };
};
