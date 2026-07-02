import crypto from 'crypto';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

export const initiatePayment = async (order) => {
  if (!config.payments.esewa.merchantCode) {
    throw new ApiError(503, 'eSewa is not configured');
  }

  const transactionUuid = `${order.orderNumber}-${Date.now()}`;
  const amount = order.total.toFixed(2);

  const signatureData = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${config.payments.esewa.merchantCode}`;
  const signature = crypto
    .createHmac('sha256', config.payments.esewa.secretKey)
    .update(signatureData)
    .digest('base64');

  return {
    amount,
    tax_amount: '0',
    total_amount: amount,
    transaction_uuid: transactionUuid,
    product_code: config.payments.esewa.merchantCode,
    product_service_charge: '0',
    product_delivery_charge: order.shippingFee.toFixed(2),
    success_url: `${config.clientUrl}/checkout/esewa/success`,
    failure_url: `${config.clientUrl}/checkout/esewa/failure`,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature,
    paymentUrl: 'https://esewa.com.np/epay/main',
  };
};

export const verifyPayment = async (productCode, totalAmount, transactionUuid) => {
  const url = `${config.payments.esewa.verifyUrl}?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'COMPLETE') {
    throw new ApiError(400, 'eSewa payment verification failed');
  }

  return {
    transactionId: transactionUuid,
    gatewayResponse: data,
  };
};
