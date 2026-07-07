import { PAYMENT_METHODS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import * as khaltiService from './payments/khalti.service.js';
import * as esewaService from './payments/esewa.service.js';
import * as fonepayService from './payments/fonepay.service.js';
import * as stripeService from './payments/stripe.service.js';
import * as imepayService from './payments/imepay.service.js';
import * as hblService from './payments/hbl.service.js';
import * as orderService from './order.service.js';
import * as paymentGatewayService from './paymentGateway.service.js';

const paymentServices = {
  [PAYMENT_METHODS.KHALTI]: khaltiService,
  [PAYMENT_METHODS.ESEWA]: esewaService,
  [PAYMENT_METHODS.IMEPAY]: imepayService,
  [PAYMENT_METHODS.FONEPAY]: fonepayService,
  [PAYMENT_METHODS.CARD]: stripeService,
  [PAYMENT_METHODS.HBL]: hblService,
};

export const initiatePayment = async (order, method) => {
  const gateway = await paymentGatewayService.getGatewayRuntimeCredentials(method);
  if (!gateway) throw new ApiError(400, 'Payment method not available');

  if (method === PAYMENT_METHODS.MANUAL_BANK || method === PAYMENT_METHODS.COD) {
    return { type: method, gateway };
  }

  const service = paymentServices[method];
  if (!service) throw new ApiError(400, 'Unsupported payment method');

  const creds = gateway.credentials || {};
  const env = gateway.environment;

  if (method === PAYMENT_METHODS.CARD) {
    return stripeService.createPaymentIntent(order, creds, env);
  }
  return service.initiatePayment(order, creds, env);
};

export const verifyAndCompletePayment = async (orderId, method, verificationData) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.payment?.status === 'paid') return order;
  if (order.payment?.method && order.payment.method !== method) {
    throw new ApiError(400, 'Payment method does not match the order');
  }

  const gateway = await paymentGatewayService.getGatewayRuntimeCredentials(method);
  const creds = gateway?.credentials || {};

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
      if (Number(verificationData.totalAmount) !== Number(order.total.toFixed(2))) {
        throw new ApiError(400, 'eSewa payment amount does not match order total');
      }
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
    case PAYMENT_METHODS.CARD:
      result = await stripeService.verifyPaymentIntent(verificationData.paymentIntentId, creds);
      break;
    default:
      throw new ApiError(400, 'Unsupported payment method');
  }

  return orderService.markPaymentPaid(orderId, result.transactionId, result.gatewayResponse);
};
