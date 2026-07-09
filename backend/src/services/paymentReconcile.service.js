import { Order } from '../models/index.js';
import { PAYMENT_METHODS, PAYMENT_STATUS } from '../config/constants.js';
import * as paymentService from './payment.service.js';

const RECONCILE_INTERVAL_MS = 30_000;
const MAX_AGE_HOURS = 72;

/** Auto-confirm paid card orders that missed the browser return callback. */
export const reconcilePendingCardPayments = async () => {
  const since = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);

  const orders = await Order.find({
    'payment.method': PAYMENT_METHODS.CARD,
    'payment.status': PAYMENT_STATUS.PENDING,
    createdAt: { $gte: since },
  }).sort({ createdAt: -1 });

  if (!orders.length) return { checked: 0, confirmed: 0, failed: 0 };

  let confirmed = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      const result = await paymentService.processPaymentVerification(
        order._id.toString(),
        PAYMENT_METHODS.CARD,
        { merchantTxnId: order.orderNumber }
      );

      if (result.outcome === 'success') {
        confirmed++;
        console.log(`[payment-reconcile] Confirmed ${order.orderNumber}`);
      } else if (result.outcome === 'failed') {
        failed++;
        console.log(`[payment-reconcile] Failed ${order.orderNumber}: ${result.message}`);
      }
    } catch (err) {
      console.warn(`[payment-reconcile] ${order.orderNumber}:`, err.message);
    }
  }

  return { checked: orders.length, confirmed, failed };
};

export const startPaymentReconcileScheduler = () => {
  const run = async () => {
    try {
      const stats = await reconcilePendingCardPayments();
      if (stats.confirmed > 0 || stats.failed > 0) {
        console.log('[payment-reconcile]', stats);
      }
    } catch (err) {
      console.error('[payment-reconcile] error:', err.message);
    }
  };

  run();
  return setInterval(run, RECONCILE_INTERVAL_MS);
};
