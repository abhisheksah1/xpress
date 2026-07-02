import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

export const initiatePayment = async (order) => {
  if (!config.payments.khalti.secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }

  return {
    pidx: null,
    paymentUrl: `https://khalti.com/payment/initiate/`,
    amount: order.total * 100,
    purchaseOrderId: order.orderNumber,
    purchaseOrderName: `Order ${order.orderNumber}`,
    returnUrl: `${config.clientUrl}/checkout/khalti/callback`,
    websiteUrl: config.clientUrl,
    publicKey: config.payments.khalti.publicKey,
  };
};

export const verifyPayment = async (token, amount) => {
  if (!config.payments.khalti.secretKey) {
    throw new ApiError(503, 'Khalti is not configured');
  }

  const response = await fetch(config.payments.khalti.verifyUrl, {
    method: 'POST',
    headers: {
      Authorization: `Key ${config.payments.khalti.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, amount }),
  });

  const data = await response.json();
  if (!response.ok || !data.idx) {
    throw new ApiError(400, data.detail || 'Khalti payment verification failed');
  }

  return {
    transactionId: data.idx,
    gatewayResponse: data,
  };
};
