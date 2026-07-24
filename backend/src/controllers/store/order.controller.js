import * as orderService from '../../services/order.service.js';
import * as paymentService from '../../services/payment.service.js';
import * as deliveryService from '../../services/delivery.service.js';
import config from '../../config/index.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PAYMENT_METHODS } from '../../config/constants.js';

export const createOrder = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const orderData = {
    ...body,
    userId: req.user?._id,
    guestEmail: body.guestEmail || body.sender?.email || body.shippingAddress?.email,
    guestPhone: body.guestPhone || (body.sender ? `${body.sender.countryCode || ''}${body.sender.phone}` : body.shippingAddress?.phone),
  };

  const order = await orderService.createOrder(orderData);

  if (orderData.paymentMethod === PAYMENT_METHODS.COD) {
    return res.status(201).json(new ApiResponse(201, { order }, 'Order placed (COD)'));
  }

  if (orderData.paymentMethod === PAYMENT_METHODS.MANUAL_BANK) {
    return res.status(201).json(
      new ApiResponse(201, { order }, 'Order placed — complete your bank transfer to pay')
    );
  }

  const payment = await paymentService.initiatePayment(order, orderData.paymentMethod, {
    returnBaseUrl: req.get('origin') || config.clientUrl,
    serverBaseUrl: config.serverUrl,
  });

  // Persist gateway payment reference for later reconcile (Khalti pidx, sandboxNonce, etc.)
  if (payment && (payment.pidx || payment.payment_url || payment.paymentUrl || payment.sandboxNonce)) {
    try {
      order.payment = order.payment || {};
      order.payment.gatewayResponse = {
        ...(order.payment.gatewayResponse || {}),
        initiate: {
          ...(typeof payment === 'object' ? payment : {}),
          pidx: payment.pidx,
          purchaseOrderId: payment.purchaseOrderId || order.orderNumber,
          amount: payment.amount ?? order.total,
          environment: payment.environment,
          sandboxNonce: payment.sandboxNonce,
        },
      };
      await order.save();
    } catch (err) {
      console.warn('[payment] Could not persist initiate response:', err.message);
    }
  }

  res.status(201).json(new ApiResponse(201, { order, payment }, 'Order created'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, method, ...verificationData } = req.validated?.body || req.body;
  const result = await paymentService.processPaymentVerification(orderId, method, verificationData);

  if (result.outcome === 'success') {
    return res.json(new ApiResponse(200, result.order, result.message || 'Payment confirmed'));
  }
  if (result.outcome === 'failed') {
    return res.status(400).json(new ApiResponse(400, result.order, result.message || 'Payment failed'));
  }
  return res.status(202).json(new ApiResponse(202, result.order, result.message || 'Payment pending'));
});

/** NPS redirects here after card payment — auto-updates order then sends customer to storefront. */
export const cardPaymentReturn = asyncHandler(async (req, res) => {
  const merchantTxnId = req.query.MerchantTxnId || req.query.merchantTxnId;
  const gatewayTxnId = req.query.GatewayTxnId || req.query.gatewayTxnId;

  const allowedOrigins = new Set(
    [config.clientUrl, ...(config.corsOrigins || [])]
      .map((v) => {
        try {
          const raw = String(v || '').trim();
          if (!raw) return null;
          return new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`).origin;
        } catch {
          return null;
        }
      })
      .filter(Boolean)
  );

  const fallbackBase = `${String(config.clientUrl || '').replace(/\/$/, '')}/checkout/card/callback`;
  let redirectBase = fallbackBase;
  const redirectRaw = String(req.query.redirect || '').trim();
  if (redirectRaw) {
    try {
      const withProtocol = /^https?:\/\//i.test(redirectRaw) ? redirectRaw : `http://${redirectRaw}`;
      const parsed = new URL(withProtocol);
      if (allowedOrigins.has(parsed.origin)) {
        redirectBase = parsed.pathname && parsed.pathname !== '/'
          ? `${parsed.origin}${parsed.pathname}`.replace(/\/$/, '')
          : `${parsed.origin}/checkout/card/callback`;
      }
    } catch {
      redirectBase = fallbackBase;
    }
  }

  let outcome = 'pending';
  let message = 'Payment is being processed';

  console.log('[card-return]', { merchantTxnId, gatewayTxnId, redirectBase });

  try {
    const result = await paymentService.handleCardPaymentReturn({ merchantTxnId, gatewayTxnId });
    outcome = result.outcome;
    message = result.message || message;
    console.log('[card-return] outcome:', outcome, merchantTxnId);
  } catch (err) {
    outcome = 'error';
    message = err.message || 'Payment verification error';
    console.error('[card-return] error:', merchantTxnId, err.message);
  }

  const params = new URLSearchParams({
    payment: outcome,
    message,
    ...(merchantTxnId ? { MerchantTxnId: merchantTxnId } : {}),
    ...(gatewayTxnId ? { GatewayTxnId: gatewayTxnId } : {}),
  });

  res.redirect(`${redirectBase}?${params.toString()}`);
});

/** NPS OnePG server webhook — respond with plain text "received" / "already received". */
export const npsNotification = asyncHandler(async (req, res) => {
  const merchantTxnId =
    req.query.MerchantTxnId
    || req.query.merchantTxnId
    || req.body?.MerchantTxnId
    || req.body?.merchantTxnId;
  const gatewayTxnId =
    req.query.GatewayTxnId
    || req.query.gatewayTxnId
    || req.body?.GatewayTxnId
    || req.body?.gatewayTxnId;
  const result = await paymentService.handleNpsNotification({ merchantTxnId, gatewayTxnId });
  res.status(result.status).type('text/plain').send(result.body);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  await orderService.linkGuestOrdersToUser(req.user._id, req.user.email);
  const result = await orderService.getOrders({
    ...req.query,
    userId: req.user._id,
    excludeLeads: true,
  });
  res.json(new ApiResponse(200, result));
});

export const getMyOrder = asyncHandler(async (req, res) => {
  await orderService.linkGuestOrdersToUser(req.user._id, req.user.email);
  const order = await orderService.getOrderById(req.params.id, req.user._id);
  res.json(new ApiResponse(200, order));
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, email } = req.query;
  const order = await orderService.getOrderByNumber(orderNumber, email);
  res.json(new ApiResponse(200, order));
});

export const getDeliveryLocations = asyncHandler(async (req, res) => {
  const locations = await deliveryService.getDeliveryLocations();
  res.json(new ApiResponse(200, locations));
});

export const getDeliveryZones = asyncHandler(async (req, res) => {
  const groups = await deliveryService.getDeliveryGroups();
  res.json(new ApiResponse(200, groups));
});
