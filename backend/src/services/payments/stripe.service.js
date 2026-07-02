import Stripe from 'stripe';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

let stripe = null;

const getStripe = () => {
  if (!config.payments.stripe.secretKey) {
    throw new ApiError(503, 'Stripe (card payments) is not configured');
  }
  if (!stripe) stripe = new Stripe(config.payments.stripe.secretKey);
  return stripe;
};

export const createPaymentIntent = async (order) => {
  const client = getStripe();
  const paymentIntent = await client.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: config.payments.stripe.currency,
    metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

export const verifyPaymentIntent = async (paymentIntentId) => {
  const client = getStripe();
  const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new ApiError(400, 'Card payment not completed');
  }

  return {
    transactionId: paymentIntent.id,
    gatewayResponse: paymentIntent,
  };
};

export const handleWebhook = (rawBody, signature) => {
  const client = getStripe();
  return client.webhooks.constructEvent(
    rawBody,
    signature,
    config.payments.stripe.webhookSecret
  );
};
