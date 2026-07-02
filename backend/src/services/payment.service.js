import { PAYMENT_METHODS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import * as khaltiService from './payments/khalti.service.js';
import * as esewaService from './payments/esewa.service.js';
import * as fonepayService from './payments/fonepay.service.js';
import * as stripeService from './payments/stripe.service.js';
import * as orderService from './order.service.js';

const paymentServices = {
  [PAYMENT_METHODS.KHALTI]: khaltiService,
  [PAYMENT_METHODS.ESEWA]: esewaService,
  [PAYMENT_METHODS.FONEPAY]: fonepayService,
  [PAYMENT_METHODS.CARD]: stripeService,
};

export const initiatePayment = async (order, method) => {
  const service = paymentServices[method];
  if (!service) throw new ApiError(400, 'Unsupported payment method');

  if (method === PAYMENT_METHODS.CARD) {
    return stripeService.createPaymentIntent(order);
  }
  return service.initiatePayment(order);
};

export const verifyAndCompletePayment = async (orderId, method, verificationData) => {
  const service = paymentServices[method];
  if (!service) throw new ApiError(400, 'Unsupported payment method');

  let result;
  switch (method) {
    case PAYMENT_METHODS.KHALTI:
      result = await khaltiService.verifyPayment(verificationData.token, verificationData.amount);
      break;
    case PAYMENT_METHODS.ESEWA:
      result = await esewaService.verifyPayment(
        verificationData.productCode,
        verificationData.totalAmount,
        verificationData.transactionUuid
      );
      break;
    case PAYMENT_METHODS.FONEPAY:
      result = await fonepayService.verifyPayment(verificationData);
      break;
    case PAYMENT_METHODS.CARD:
      result = await stripeService.verifyPaymentIntent(verificationData.paymentIntentId);
      break;
    default:
      throw new ApiError(400, 'Unsupported payment method');
  }

  return orderService.markPaymentPaid(orderId, result.transactionId, result.gatewayResponse);
};
