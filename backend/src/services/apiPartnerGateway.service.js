import { Product, Order } from '../models/index.js';
import * as deliveryService from './delivery.service.js';
import * as couponService from './coupon.service.js';
import * as orderService from './order.service.js';
import * as comboService from './combo.service.js';
import { allowsBackorder } from '../utils/productStock.js';
import * as paymentGatewayService from './paymentGateway.service.js';
import { renderTemplate, sendEmail } from './email.service.js';
import { getSettings } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';
import {
  API_PARTNER_FIXED_CURRENCY,
  API_PARTNER_FIXED_PAYMENT_METHOD,
} from '../config/apiPartnerDefaults.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../config/constants.js';
import config from '../config/index.js';

const firstThreeWords = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(' ');
};

const formatPartnerProductLabel = (product) =>
  `${firstThreeWords(product.name)} — NPR ${Number(product.price || 0).toLocaleString('en-NP')}`;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (from, to) => {
  const ms = startOfDay(to) - startOfDay(from);
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const partnerAllowsLocation = (partner, locationId) => {
  const allowed = partner.allowedDeliveryLocations || [];
  if (!allowed.length) return false;
  return allowed.some((l) => String(l._id || l) === String(locationId));
};

const partnerAllowsProduct = (partner, productId) => {
  if (partner.allowAllProducts) return true;
  const allowed = partner.allowedProducts || [];
  if (!allowed.length) return false;
  return allowed.some((p) => String(p._id || p) === String(productId));
};

const getFieldConfig = (partner) => {
  const map = new Map();
  (partner.orderFields || []).forEach((f) => map.set(f.key, f));
  return map;
};

export const validatePartnerPayloadFields = (partner, payload) => {
  const fields = getFieldConfig(partner);
  const checks = [
    ['senderName', payload.sender?.fullName],
    ['senderEmail', payload.sender?.email],
    ['senderMobile', payload.sender?.phone],
    ['receiverName', payload.receiver?.fullName],
    ['receiverMobile', payload.receiver?.phone],
    ['deliveryAddress', payload.receiver?.address],
    ['giftMessage', payload.giftMessage],
    ['deliveryDate', payload.preferredDeliveryDate || payload.deliveryDate],
    ['timeSlot', payload.timeSlotId],
    ['occasion', payload.occasion],
    ['specialInstructions', payload.notes || payload.specialInstructions],
  ];

  for (const [key, value] of checks) {
    const cfg = fields.get(key);
    if (!cfg || !cfg.enabled) continue;
    if (cfg.required && !String(value || '').trim()) {
      throw new ApiError(400, `${cfg.label || key} is required`);
    }
  }
};

const isProductEligible = async (partner, product, locationId, deliveryDate) => {
  if (!product?.isActive) return false;
  if (!allowsBackorder(product)) {
    if (product.isHamper) {
      const available = await comboService.getComboAvailableStock(product);
      if (available <= 0) return false;
    } else if ((product.stock ?? 0) <= 0) {
      return false;
    }
  }
  if (!partnerAllowsProduct(partner, product._id)) return false;

  const groups = await deliveryService.findGroupsCoveringLocation(locationId);
  const eligible = groups.some((g) =>
    deliveryService.productMatchesGroup(product, product.category, g)
  );
  if (!eligible) return false;

  if (deliveryDate) {
    const minDays = 0;
    const groupsWithEta = groups.filter((g) =>
      deliveryService.productMatchesGroup(product, product.category, g)
    );
    let maxMinDays = 0;
    for (const g of groupsWithEta) {
      const d = deliveryService.resolveDeliveryForGroup(product, product.category, g);
      maxMinDays = Math.max(maxMinDays, d.estimatedDays?.min ?? 1);
    }
    const leadDays = Math.max(minDays, maxMinDays);
    const daysUntil = daysBetween(new Date(), deliveryDate);
    if (daysUntil < leadDays) return false;
  }

  return true;
};

export const getPartnerDeliveryLocations = async (partner) => {
  const all = await deliveryService.getDeliveryLocations();
  const allowedIds = new Set((partner.allowedDeliveryLocations || []).map((l) => String(l._id || l)));
  return all
    .filter((l) => allowedIds.has(String(l._id)))
    .map((l) => ({
      _id: l._id,
      name: l.name,
      deliveryFee: l.deliveryFee,
      timeSlotsEnabled: l.timeSlotsEnabled,
      timeSlots: (l.timeSlots || []).filter((s) => s.enabled !== false),
    }));
};

export const searchPartnerProducts = async (partner, { deliveryLocationId, deliveryDate, q = '' }) => {
  if (!deliveryLocationId) throw new ApiError(400, 'deliveryLocationId is required');
  if (!partnerAllowsLocation(partner, deliveryLocationId)) {
    throw new ApiError(403, 'Delivery location not allowed for this API partner');
  }

  const filter = { isActive: true };

  if (!partner.allowAllProducts) {
    const productIds = (partner.allowedProducts || []).map((p) => p._id || p);
    if (!productIds.length) return [];
    filter._id = { $in: productIds };
  }

  if (q?.trim()) {
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { tags: regex }, { sku: regex }];
  }

  const products = await Product.find(filter).populate('category').sort({ name: 1 }).limit(100);

  const eligible = [];
  for (const product of products) {
    if (await isProductEligible(partner, product, deliveryLocationId, deliveryDate)) {
      eligible.push({
        _id: product._id,
        name: product.name,
        displayLabel: formatPartnerProductLabel(product),
        price: product.price,
        currency: API_PARTNER_FIXED_CURRENCY,
        slug: product.slug,
        stock: product.stock,
      });
    }
  }

  return eligible;
};

export const buildPartnerQuote = async (partner, payload) => {
  validatePartnerPayloadFields(partner, payload);

  const deliveryLocationId = payload.deliveryLocationId;
  if (!partnerAllowsLocation(partner, deliveryLocationId)) {
    throw new ApiError(403, 'Delivery location not allowed for this API partner');
  }

  const items = payload.items || [];
  if (!items.length) throw new ApiError(400, 'At least one product item is required');

  for (const item of items) {
    if (!partnerAllowsProduct(partner, item.productId)) {
      throw new ApiError(403, `Product ${item.productId} is not allowed for this API partner`);
    }
    const product = await Product.findById(item.productId).populate('category');
    if (!product) throw new ApiError(400, `Product not found: ${item.productId}`);
    const ok = await isProductEligible(
      partner,
      product,
      deliveryLocationId,
      payload.preferredDeliveryDate || payload.deliveryDate
    );
    if (!ok) throw new ApiError(400, `${product.name} is not available for the selected location/date`);
  }

  const quote = await couponService.validateCouponForCheckout({
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      variantId: i.variantId,
    })),
    paymentMethod: API_PARTNER_FIXED_PAYMENT_METHOD,
    deliveryLocationId,
    timeSlotId: payload.timeSlotId,
    serviceAddonIds: payload.serviceAddonIds,
  });

  return {
    currency: API_PARTNER_FIXED_CURRENCY,
    paymentMethod: API_PARTNER_FIXED_PAYMENT_METHOD,
    itemsSubtotal: quote.itemsSubtotal,
    addonsTotal: quote.addonsTotal ?? 0,
    subtotal: quote.subtotal,
    baseDeliveryFee: quote.baseDeliveryFee,
    slotFee: quote.slotFee ?? 0,
    shippingFee: quote.shippingFee,
    tax: 0,
    discount: quote.discount ?? 0,
    total: quote.total,
    deliveryWarnings: quote.deliveryWarnings || [],
    timeSlot: quote.timeSlot || null,
  };
};

export const createPartnerOrder = async (partner, payload) => {
  const quote = await buildPartnerQuote(partner, payload);

  if (payload.expectedTotal != null && Number(payload.expectedTotal) !== Number(quote.total)) {
    throw new ApiError(409, 'Price has changed. Please request a new quote before confirming.');
  }

  const orderPayload = {
    ...payload,
    paymentMethod: API_PARTNER_FIXED_PAYMENT_METHOD,
    checkoutCurrency: API_PARTNER_FIXED_CURRENCY,
    preferredDeliveryDate: payload.preferredDeliveryDate || payload.deliveryDate,
    notes: [payload.notes, payload.specialInstructions, payload.occasion && `Occasion: ${payload.occasion}`]
      .filter(Boolean)
      .join('\n'),
    items: (payload.items || []).map((item) => ({
      ...item,
      giftMessage: item.giftMessage || payload.giftMessage,
    })),
  };

  const order = await orderService.createOrder(orderPayload);

  order.apiPartner = partner._id;
  order.partnerExternalRef = payload.externalReference || payload.partnerOrderRef;
  order.orderSource = 'api_partner';
  order.checkoutCurrency = API_PARTNER_FIXED_CURRENCY;
  order.checkoutCurrencyRate = 1;
  await order.save();

  const trackingUrl = `${config.clientUrl}/track?orderNumber=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(order.guestEmail || order.sender?.email || '')}`;

  await sendPartnerOrderEmails(order, trackingUrl);

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.payment?.status,
    currency: API_PARTNER_FIXED_CURRENCY,
    total: order.total,
    trackingUrl,
    manualPaymentInstructions: await getManualPaymentInstructions(),
  };
};

export const lookupPartnerOrderForPayment = async (partner, orderNumber, { receiverName, receiverMobile }) => {
  if (!orderNumber?.trim()) throw new ApiError(400, 'orderNumber is required');
  if (!receiverName?.trim() || !receiverMobile?.trim()) {
    throw new ApiError(400, 'receiverName and receiverMobile are required');
  }

  const order = await Order.findOne({ orderNumber: orderNumber.trim() });
  if (!order) throw new ApiError(404, 'Order not found');

  const nameMatch = String(order.receiver?.fullName || order.shippingAddress?.fullName || '')
    .trim()
    .toLowerCase() === receiverName.trim().toLowerCase();
  const phoneNorm = (v) => String(v || '').replace(/\D/g, '').slice(-10);
  const phoneMatch = phoneNorm(order.receiver?.phone || order.shippingAddress?.phone) === phoneNorm(receiverMobile);

  if (!nameMatch || !phoneMatch) throw new ApiError(400, 'Receiver details do not match this order');

  if (order.payment?.status === PAYMENT_STATUS.PAID) {
    throw new ApiError(400, 'Order is already paid');
  }

  return {
    orderNumber: order.orderNumber,
    currency: API_PARTNER_FIXED_CURRENCY,
    paymentMethod: order.payment?.method,
    paymentStatus: order.payment?.status,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    status: order.status,
  };
};

export const confirmPartnerOrderPayment = async (partner, orderNumber, payload) => {
  const lookup = await lookupPartnerOrderForPayment(partner, orderNumber, {
    receiverName: payload.receiverName,
    receiverMobile: payload.receiverMobile,
  });

  if (payload.expectedTotal != null && Number(payload.expectedTotal) !== Number(lookup.total)) {
    throw new ApiError(409, 'Order total mismatch. Refresh price before confirming payment.');
  }

  const order = await Order.findOne({ orderNumber: orderNumber.trim() });
  const txnId = payload.transactionReference || payload.transactionId || `partner-${partner.apiUsername}-${Date.now()}`;

  const updated = await orderService.markPaymentPaid(order._id, txnId, {
    source: 'api_partner',
    partnerId: partner._id,
    partnerUsername: partner.apiUsername,
    confirmedAt: new Date().toISOString(),
  });

  return {
    orderNumber: updated.orderNumber,
    paymentStatus: updated.payment?.status,
    status: updated.status,
    total: updated.total,
    currency: API_PARTNER_FIXED_CURRENCY,
    message: 'Payment recorded successfully',
  };
};

export const getManualPaymentInstructions = async () => {
  const gateways = await paymentGatewayService.getCheckoutGateways(API_PARTNER_FIXED_CURRENCY);
  const manual = gateways.find((g) => g.id === API_PARTNER_FIXED_PAYMENT_METHOD);
  const settings = await getSettings('general');
  const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  return {
    paymentMethod: API_PARTNER_FIXED_PAYMENT_METHOD,
    bankName: manual?.credentials?.bankName || '',
    accountName: manual?.credentials?.accountHolder || '',
    accountNumber: manual?.credentials?.accountNumber || '',
    branchName: manual?.credentials?.branchName || '',
    qrCodeImage: manual?.credentials?.qrCodeImage || '',
    instructions: manual?.credentials?.instruction || '',
    csrWhatsApp: map.registry_helpdesk_whatsapp || map.plugins_config?.whatsapp_number || '',
  };
};

const sendPartnerOrderEmails = async (order, trackingUrl) => {
  try {
    const emailSettings = await getSettings('email');
    const map = emailSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    const tpl = map.email_templates?.order_confirmation || {
      subject: 'Order {{order_number}} — Pending Payment',
      body: 'Hi {{customer_name}},\n\nYour order {{order_number}} has been received. Total: NPR {{total}}.\nTrack: {{tracking_url}}\n\n{{payment_instructions}}',
    };

    const manual = await getManualPaymentInstructions();
    const paymentInstructions = [
      manual.bankName && `Bank: ${manual.bankName}`,
      manual.accountName && `Account: ${manual.accountName}`,
      manual.accountNumber && `A/C No: ${manual.accountNumber}`,
      manual.instructions,
      manual.csrWhatsApp && `WhatsApp: ${manual.csrWhatsApp}`,
    ].filter(Boolean).join('\n');

    const vars = {
      customer_name: order.sender?.fullName || order.shippingAddress?.fullName || 'Customer',
      order_number: order.orderNumber,
      total: Number(order.total).toLocaleString('en-NP'),
      tracking_url: trackingUrl,
      payment_instructions: paymentInstructions,
    };

    const to = order.guestEmail || order.sender?.email;
    if (!to) return;

    const subject = renderTemplate(tpl.subject, vars);
    const body = renderTemplate(tpl.body, vars);
    await sendEmail({ to, subject, text: body, html: body.replace(/\n/g, '<br>') });
  } catch {
    /* email optional */
  }
};
