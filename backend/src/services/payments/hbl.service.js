import { ApiError } from '../../utils/ApiError.js';
import config from '../../config/index.js';

export const initiatePayment = async (order, creds) => {
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
  };
};

export const verifyPayment = async (verificationData) => ({
  transactionId: verificationData.transactionId,
  gatewayResponse: verificationData,
});
