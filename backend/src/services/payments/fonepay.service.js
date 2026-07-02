import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

export const initiatePayment = async (order, creds) => {
  const merchantCode = creds?.merchantId || config.payments.fonepay.merchantCode;
  const secretKey = creds?.secretKey || config.payments.fonepay.secretKey;
  if (!merchantCode) {
    throw new ApiError(503, 'Fonepay is not configured');
  }

  const prn = order.orderNumber;
  const amount = order.total.toFixed(2);
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
    paymentUrl: 'https://clientapi.fonepay.com/api/merchantRequest',
  };
};

export const verifyPayment = async ({ prn, amount, statusCode }) => {
  if (statusCode !== 'success' && statusCode !== '200') {
    throw new ApiError(400, 'Fonepay payment verification failed');
  }

  return {
    transactionId: prn,
    gatewayResponse: { prn, amount, statusCode },
  };
};
