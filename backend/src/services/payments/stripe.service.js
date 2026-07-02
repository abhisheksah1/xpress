import Stripe from 'stripe';
import config from '../../config/index.js';
import { ApiError } from '../../utils/ApiError.js';

const getStripe = (secretKey) => {
  const key = secretKey || config.payments.stripe.secretKey;
  if (!key) {
    throw new ApiError(503, 'Card payments are not configured');
  }
  return new Stripe(key);
};

export const createPaymentIntent = async (order, creds) => {
  const client = getStripe(creds?.secretKey);
  const paymentIntent = await client.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: config.payments.stripe.currency || 'usd',
    metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

export const verifyPaymentIntent = async (paymentIntentId, creds) => {
  const client = getStripe(creds?.secretKey);
  const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== 'succeeded') {
    throw new ApiError(400, 'Card payment not completed');
  }

  return {
    transactionId: paymentIntent.id,
    gatewayResponse: paymentIntent,
  };
};

export const initiatePayment = createPaymentIntent;
export const verifyPayment = verifyPaymentIntent;

export const handleWebhook = (rawBody, signature) => {
  const client = getStripe();
  return client.webhooks.constructEvent(
    rawBody,
    signature,
    config.payments.stripe.webhookSecret
  );
};
