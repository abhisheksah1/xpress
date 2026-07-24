import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

function resolveEnv(env) {
  return env === 'production' ? 'production' : 'sandbox';
}

function buildSandboxUrl(order, method, sandboxNonce) {
  const params = new URLSearchParams({
    method,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    amount: String(order.total),
    sandboxNonce,
  });
  return `${config.clientUrl}/checkout/sandbox/pay?${params.toString()}`;
}

/**
 * IME Pay — sandbox uses local test checkout page with one-time nonce.
 * Production requires merchant credentials; auto-verify is not supported without IME API.
 */
export const initiatePayment = async (order, creds, env) => {
  const mode = resolveEnv(env);

  if (mode === 'sandbox') {
    const sandboxNonce = crypto.randomBytes(24).toString('hex');
    return {
      merchantId: creds?.merchantId || 'IME-SANDBOX',
      amount: order.total,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      returnUrl: `${config.clientUrl}/checkout/imepay/callback`,
      paymentUrl: buildSandboxUrl(order, 'imepay', sandboxNonce),
      environment: 'sandbox',
      sandbox: true,
      sandboxNonce,
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

export const verifyPayment = async (verificationData, env = 'sandbox', order = null) => {
  const mode = resolveEnv(env);
  const wantsSandbox =
    verificationData?.sandbox === true
    || verificationData?.status === 'sandbox_success'
    || verificationData?.status === 'sandbox_failed';

  if (wantsSandbox) {
    if (mode !== 'sandbox') {
      throw new ApiError(400, 'Sandbox payment tokens are not valid in production');
    }
    if (verificationData?.status === 'sandbox_failed') {
      throw new ApiError(400, 'IME Pay sandbox payment failed');
    }
    const expected = order?.payment?.gatewayResponse?.initiate?.sandboxNonce;
    if (!expected || verificationData?.sandboxNonce !== expected) {
      throw new ApiError(400, 'Invalid or expired sandbox payment token');
    }
    return {
      transactionId: verificationData.transactionId || verificationData.refId || `ime-sandbox-${Date.now()}`,
      gatewayResponse: verificationData,
    };
  }

  if (mode === 'sandbox') {
    throw new ApiError(400, 'Complete the sandbox payment page to confirm this test order');
  }

  throw new ApiError(
    503,
    'IME Pay automatic verification is not available. Our team will confirm your payment shortly.'
  );
};
