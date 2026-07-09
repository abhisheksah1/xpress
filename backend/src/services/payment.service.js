import { Order } from '../models/index.js';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import * as khaltiService from './payments/khalti.service.js';
import * as esewaService from './payments/esewa.service.js';
import * as fonepayService from './payments/fonepay.service.js';
import * as npsService from './payments/nps.service.js';
import * as imepayService from './payments/imepay.service.js';
import * as hblService from './payments/hbl.service.js';
import * as orderService from './order.service.js';
import * as paymentGatewayService from './paymentGateway.service.js';

const paymentServices = {
  [PAYMENT_METHODS.KHALTI]: khaltiService,
  [PAYMENT_METHODS.ESEWA]: esewaService,
  [PAYMENT_METHODS.IMEPAY]: imepayService,
  [PAYMENT_METHODS.FONEPAY]: fonepayService,
  [PAYMENT_METHODS.CARD]: npsService,
  [PAYMENT_METHODS.HBL]: hblService,
};

export const initiatePayment = async (order, method, options = {}) => {
  const gateway = await paymentGatewayService.getGatewayRuntimeCredentials(method);
  if (!gateway) throw new ApiError(400, 'Payment method not available');

  if (method === PAYMENT_METHODS.MANUAL_BANK || method === PAYMENT_METHODS.COD) {
    return { type: method, gateway };
  }

  const service = paymentServices[method];
  if (!service) throw new ApiError(400, 'Unsupported payment method');

  const creds = gateway.credentials || {};
  const env = gateway.environment;

  return service.initiatePayment(order, creds, env, options);
};

const resolveOrderIdForVerification = async (orderId, verificationData) => {
  if (orderId) return orderId;

  const merchantTxnId = verificationData?.merchantTxnId || verificationData?.MerchantTxnId;
  if (!merchantTxnId) return null;

  const order = await Order.findOne({ orderNumber: String(merchantTxnId) });
  return order?._id?.toString() || null;
};

const processCardGatewayPayment = async (order, creds, env, verificationData, options = {}) => {
  const result = await npsService.resolvePaymentOutcome(
    {
      merchantTxnId: verificationData.merchantTxnId || order.orderNumber,
      gatewayTxnId: verificationData.gatewayTxnId,
    },
    creds,
    env,
    options.reconcile ? { maxAttempts: 1, delayMs: 0 } : undefined
  );

  if (result.outcome === 'success') {
    const updated = await orderService.markPaymentPaid(
      order._id,
      result.transactionId,
      result.gatewayResponse
    );
    return { order: updated, outcome: 'success', message: 'Payment confirmed' };
  }

  if (result.outcome === 'failed') {
    const updated = await orderService.markPaymentFailed(
      order._id,
      result.gatewayResponse,
      result.message || 'Card payment failed at gateway'
    );
    return { order: updated, outcome: 'failed', message: result.message || 'Payment failed' };
  }

  return {
    order,
    outcome: 'pending',
    message: result.message || 'Payment is still processing',
  };
};

/** Auto-process payment: paid → confirmed order, failed → lead with failed payment. */
export const processPaymentVerification = async (orderId, method, verificationData, options = {}) => {
  const resolvedOrderId = await resolveOrderIdForVerification(orderId, verificationData);
  if (!resolvedOrderId) throw new ApiError(404, 'Order not found for payment verification');

  const order = await Order.findById(resolvedOrderId);
  if (!order) throw new ApiError(404, 'Order not found');

  if (order.payment?.status === PAYMENT_STATUS.PAID) {
    return { order, outcome: 'success', message: 'Payment already confirmed' };
  }

  if (order.payment?.method && order.payment.method !== method) {
    throw new ApiError(400, 'Payment method does not match the order');
  }

  const gateway = await paymentGatewayService.getGatewayRuntimeCredentials(method);
  const creds = gateway?.credentials || {};
  const env = gateway?.environment || 'sandbox';

  if (method === PAYMENT_METHODS.CARD) {
    return processCardGatewayPayment(order, creds, env, verificationData, options);
  }

  const service = paymentServices[method];
  if (!service) throw new ApiError(400, 'Unsupported payment method');

  let result;
  switch (method) {
    case PAYMENT_METHODS.KHALTI:
      result = await khaltiService.verifyPayment(
        verificationData.token,
        Math.round(order.total * 100),
        creds
      );
      break;
    case PAYMENT_METHODS.ESEWA:
      result = await esewaService.verifyPayment(
        verificationData.productCode,
        verificationData.totalAmount,
        verificationData.transactionUuid,
        creds
      );
      break;
    case PAYMENT_METHODS.FONEPAY:
      result = await fonepayService.verifyPayment(verificationData);
      break;
    case PAYMENT_METHODS.IMEPAY:
      result = await imepayService.verifyPayment(verificationData);
      break;
    case PAYMENT_METHODS.HBL:
      result = await hblService.verifyPayment(verificationData);
      break;
    default:
      throw new ApiError(400, 'Unsupported payment method');
  }

  const updated = await orderService.markPaymentPaid(
    resolvedOrderId,
    result.transactionId,
    result.gatewayResponse
  );
  return { order: updated, outcome: 'success', message: 'Payment confirmed' };
};

export const verifyAndCompletePayment = async (orderId, method, verificationData) => {
  const result = await processPaymentVerification(orderId, method, verificationData);
  if (result.outcome === 'failed') {
    throw new ApiError(400, result.message || 'Payment failed');
  }
  if (result.outcome === 'pending') {
    throw new ApiError(400, result.message || 'Payment is still pending');
  }
  return result.order;
};

export const syncOrderPaymentStatus = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.payment?.status === PAYMENT_STATUS.PAID) return order;

  const method = order.payment?.method;
  if (![PAYMENT_METHODS.CARD, PAYMENT_METHODS.HBL].includes(method)) {
    throw new ApiError(400, 'Payment sync is only supported for card/HBL gateway orders');
  }

  const result = await processPaymentVerification(orderId, method, {
    merchantTxnId: order.orderNumber,
  });

  if (result.outcome === 'failed') {
    throw new ApiError(400, result.message || 'Payment failed at gateway');
  }
  if (result.outcome === 'pending') {
    throw new ApiError(400, result.message || 'Payment is still pending at gateway');
  }
  return result.order;
};

/** NPS return URL + webhook — auto mark paid or failed. */
export const handleCardPaymentReturn = async ({ merchantTxnId, gatewayTxnId }) => {
  return processPaymentVerification(null, PAYMENT_METHODS.CARD, { merchantTxnId, gatewayTxnId });
};

export const handleNpsNotification = async ({ merchantTxnId, gatewayTxnId }) => {
  if (!merchantTxnId) return { body: 'error', status: 400 };

  try {
    const result = await handleCardPaymentReturn({ merchantTxnId, gatewayTxnId });
    if (result.outcome === 'success') return { body: 'received', status: 200 };
    if (result.outcome === 'failed') return { body: 'received', status: 200 };
    return { body: 'pending', status: 200 };
  } catch (err) {
    console.error('[NPS webhook]', merchantTxnId, err.message);
    return { body: 'error', status: 500 };
  }
};
