import { ApiError } from '../../utils/ApiError.js';
import config from '../../config/index.js';

export const initiatePayment = async (order, creds) => {
  if (!creds?.merchantId) {
    throw new ApiError(503, 'IME Pay is not configured');
  }

  return {
    merchantId: creds.merchantId,
    amount: order.total,
    orderNumber: order.orderNumber,
    returnUrl: `${config.clientUrl}/checkout/imepay/callback`,
    paymentUrl: creds.paymentUrl || 'https://payment.imepay.com.np',
  };
};

export const verifyPayment = async (verificationData) => ({
  transactionId: verificationData.transactionId || verificationData.refId,
  gatewayResponse: verificationData,
});
