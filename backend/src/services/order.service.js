import * as comboService from './combo.service.js';
import * as couponService from './coupon.service.js';
import * as deliveryService from './delivery.service.js';
import { Product, Order, Settings } from '../models/index.js';
import { validateOrderPersonalization } from '../utils/personalization.js';
import { normalizeItemPersonalization, toStoredMediaUrl } from '../utils/mediaUrl.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';

const resolveCheckoutCurrency = async (code) => {
  const setting = await Settings.findOne({ key: 'multi_currencies' });
  const multi = setting?.value || { currencies: [] };
  const enabled = (multi.currencies || []).filter((c) => c.enabled !== false);
  const normalized = code ? String(code).toUpperCase() : null;
  const selected = normalized
    ? enabled.find((c) => c.code === normalized)
    : enabled.find((c) => c.isDefault) || enabled.find((c) => c.code === 'NPR');
  if (!selected) throw new ApiError(400, 'Invalid payout currency');
  return selected;
};

const buildShippingAddress = async (data) => {
  if (data.shippingAddress) return data.shippingAddress;
  if (!data.sender || !data.receiver) {
    throw new ApiError(400, 'Sender and receiver details are required');
  }

  let district = 'Nepal';
  if (data.deliveryLocationId) {
    const locations = await deliveryService.getDeliveryLocations();
    const loc = locations.find((l) => String(l._id) === String(data.deliveryLocationId));
    if (loc) district = loc.name;
  }

  return {
    fullName: data.receiver.fullName,
    phone: data.receiver.phone,
    email: data.sender.email,
    province: 'Nepal',
    district,
    street: data.receiver.address,
  };
};

export const createOrder = async (data) => {
  const {
    items,
    sender,
    receiver,
    userId,
  } = data;

  const shippingAddress = await buildShippingAddress(data);
  const guestEmail = data.guestEmail || sender?.email || shippingAddress.email;
  const guestPhone = data.guestPhone || (sender ? `${sender.countryCode || ''}${sender.phone}` : shippingAddress.phone);

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new ApiError(400, `Product not found: ${item.productId}`);
    }

    let price = product.price;
    let stock = product.stock;
    let sku = product.sku;
    let image = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;

    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (!variant || !variant.isActive) throw new ApiError(400, 'Variant not found');
      price = variant.price;
      stock = variant.stock;
      sku = variant.sku;
      if (variant.image?.url) image = variant.image.url;
    } else if (item.unitPrice != null) {
      price = Number(item.unitPrice);
    }

    if (product.isHamper && product.comboItems?.length) {
      await comboService.assertComboStock(product, item.quantity);
    } else if (stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    const personalizationError = validateOrderPersonalization(product, item.personalization);
    if (personalizationError) throw new ApiError(400, personalizationError);

    const normalizedPersonalization = normalizeItemPersonalization(item.personalization);

    orderItems.push({
      product: product._id,
      variantId: item.variantId,
      name: product.name,
      sku,
      image,
      price,
      quantity: item.quantity,
      giftWrap: item.giftWrap || false,
      giftMessage: item.giftMessage || normalizedPersonalization?.giftMessage || normalizedPersonalization?.cakeMessage,
      personalization: normalizedPersonalization,
    });

    subtotal += price * item.quantity;
  }

  const checkoutCurrency = await resolveCheckoutCurrency(data.checkoutCurrency);

  let shippingFee = 0;
  let deliveryGroup = null;
  let deliveryLocationDoc = null;
  let estimatedDeliveryDays = null;
  let deliveryCheck = null;
  let timeSlot = null;

  const locationId = data.deliveryLocationId || data.deliveryZoneId;

  if (locationId) {
    deliveryCheck = await deliveryService.validateOrderDelivery(
      items.map((item) => ({ productId: item.productId })),
      locationId,
      data.deliveryGroupId,
      data.timeSlotId
    );

    deliveryGroup = deliveryCheck.group;
    deliveryLocationDoc = deliveryCheck.location;
    estimatedDeliveryDays = deliveryCheck.estimatedDeliveryDays;
    shippingFee = deliveryCheck.fee;
    timeSlot = deliveryCheck.timeSlot || null;
  }

  const addonEntries = data.serviceAddons?.length
    ? data.serviceAddons
    : (data.serviceAddonIds || []).map((id) => ({ id }));
  const { addons, total: addonsTotal } = await couponService.resolveServiceAddons(addonEntries);
  const normalizedAddons = addons.map((addon) => ({
    ...addon,
    photoUrl: addon.photoUrl ? toStoredMediaUrl(addon.photoUrl) : undefined,
  }));
  subtotal += addonsTotal;

  let discount = 0;
  let subtotalDiscount = 0;
  let shippingDiscount = 0;
  let couponSnapshot = undefined;

  if (data.couponCode) {
    const addonIdsForQuote = data.serviceAddons?.length
      ? data.serviceAddons.map((a) => a.id)
      : data.serviceAddonIds;
    const quote = await couponService.validateCouponForCheckout({
      code: data.couponCode,
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: orderItems.find((o) => String(o.product) === String(item.productId))?.price,
      })),
      paymentMethod: data.paymentMethod,
      deliveryLocationId: locationId,
      deliveryGroupId: data.deliveryGroupId,
      serviceAddonIds: addonIdsForQuote,
      timeSlotId: data.timeSlotId,
      userId,
    });
    subtotal = quote.subtotal;
    shippingFee = quote.shippingFee;
    discount = quote.discount;
    subtotalDiscount = quote.subtotalDiscount;
    shippingDiscount = quote.shippingDiscount;
    couponSnapshot = {
      couponId: quote.coupon._id,
      code: quote.coupon.code,
      name: quote.coupon.name,
      discountType: quote.coupon.discountType,
      appliesTo: quote.coupon.appliesTo,
    };
  }

  const tax = data.tax || 0;
  const total = Math.max(0, subtotal + shippingFee - discount + tax);

  const order = await Order.create({
    user: userId || undefined,
    guestEmail,
    guestPhone,
    isGuest: !userId,
    sender: sender || undefined,
    receiver: receiver || undefined,
    items: orderItems,
    shippingAddress,
    serviceAddons: normalizedAddons,
    addonsTotal,
    preferredDeliveryDate: data.preferredDeliveryDate ? new Date(data.preferredDeliveryDate) : undefined,
    timeSlot: timeSlot || undefined,
    checkoutCurrency: checkoutCurrency.code,
    checkoutCurrencyRate: checkoutCurrency.rate || 1,
    deliveryZone: deliveryGroup?._id,
    deliveryGroup: deliveryGroup?._id,
    deliveryLocation: deliveryLocationDoc?._id,
    sameDayDelivery: deliveryCheck?.estimatedDeliveryDays?.min === 0,
    estimatedDeliveryDays,
    deliveryWarnings: deliveryCheck?.warnings || [],
    deliveryConstraintsMet: deliveryCheck?.deliveryConstraintsMet !== false,
    subtotal,
    shippingFee,
    discount,
    discountBreakdown: { subtotalDiscount, shippingDiscount },
    coupon: couponSnapshot,
    tax,
    total,
    payment: { method: data.paymentMethod, status: PAYMENT_STATUS.PENDING, amount: total },
    notes: data.notes,
    isLead: data.paymentMethod !== PAYMENT_METHODS.COD,
    statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Order placed' }],
  });

  if (couponSnapshot?.couponId) {
    await couponService.recordCouponRedemption(couponSnapshot);
  }

  return order;
};

export const buildLeadFilter = () => ({
  $or: [
    { isLead: true },
    {
      isLead: { $ne: false },
      'payment.status': { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED] },
      'payment.method': { $ne: PAYMENT_METHODS.COD },
      status: ORDER_STATUS.PENDING,
    },
  ],
});

export const isLeadOrder = (order) => {
  if (!order) return false;
  if (order.isLead === true) return true;
  if (order.isLead === false) return false;
  const method = order.payment?.method;
  const payStatus = order.payment?.status;
  return (
    method !== PAYMENT_METHODS.COD
    && [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.FAILED].includes(payStatus)
    && order.status === ORDER_STATUS.PENDING
  );
};

export const getOrders = async ({ page = 1, limit = 20, status, userId, search, lead, excludeLeads }) => {
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;
  if (lead === 'true' || lead === true) {
    Object.assign(filter, buildLeadFilter());
  } else if (excludeLeads === 'true' || excludeLeads === true || lead === 'false') {
    filter.$nor = [buildLeadFilter()];
  }
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { guestEmail: { $regex: search, $options: 'i' } },
      { guestPhone: { $regex: search, $options: 'i' } },
      { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: search, $options: 'i' } },
      { 'shippingAddress.email': { $regex: search, $options: 'i' } },
      { 'sender.fullName': { $regex: search, $options: 'i' } },
      { 'sender.email': { $regex: search, $options: 'i' } },
      { 'receiver.fullName': { $regex: search, $options: 'i' } },
      { 'receiver.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .populate('deliveryZone', 'name estimatedDeliveryLabel')
      .populate('deliveryLocation', 'name deliveryFee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getOrderById = async (id, userId = null) => {
  const order = await Order.findById(id)
    .populate('user', 'name email phone')
    .populate('items.product', 'name slug images sku')
    .populate('deliveryZone', 'name deliveryFee estimatedDays')
    .populate('deliveryLocation', 'name deliveryFee')
    .populate('statusHistory.updatedBy', 'name email');

  if (!order) throw new ApiError(404, 'Order not found');
  if (userId && order.user?.toString() !== userId.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  return order;
};

export const getTrackingEmail = (order) =>
  order.guestEmail || order.sender?.email || order.shippingAddress?.email || order.user?.email || '';

export const getOrderByNumber = async (orderNumber, email) => {
  const filter = { orderNumber };
  if (email) {
    filter.$or = [
      { guestEmail: new RegExp(`^${email.trim()}$`, 'i') },
      { 'shippingAddress.email': new RegExp(`^${email.trim()}$`, 'i') },
      { 'sender.email': new RegExp(`^${email.trim()}$`, 'i') },
    ];
  }
  const order = await Order.findOne(filter)
    .populate('items.product', 'name slug images')
    .populate('deliveryLocation', 'name');
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
};

export const updateOrderStatus = async (id, { status, note }, userId) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  order.status = status;
  order.statusHistory.push({ status, note, updatedBy: userId });
  await order.save();
  return getOrderById(id);
};

export const updatePaymentStatus = async (id, { status, transactionId, note }, userId) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  const wasPaid = order.payment?.status === PAYMENT_STATUS.PAID;

  if (status === PAYMENT_STATUS.PAID && !wasPaid) {
    const updated = await markPaymentPaid(
      id,
      transactionId || `manual-${Date.now()}`,
      { admin: true, note: note || 'Marked paid by admin' }
    );
    if (note) {
      updated.statusHistory.push({
        status: updated.status,
        note: `Payment: ${note}`,
        updatedBy: userId,
      });
      await updated.save();
    }
    return getOrderById(id);
  }

  order.payment.status = status;
  if (transactionId) order.payment.transactionId = transactionId;
  if (status === PAYMENT_STATUS.PAID) order.payment.paidAt = order.payment.paidAt || new Date();
  if (note) {
    order.statusHistory.push({
      status: order.status,
      note: `Payment: ${note}`,
      updatedBy: userId,
    });
  }
  await order.save();
  return getOrderById(id);
};

export const getLeadOrderCount = async () => {
  const count = await Order.countDocuments(buildLeadFilter());
  return { count };
};

export const confirmLeadOrder = async (id, { transactionId, note }, userId) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!isLeadOrder(order)) {
    throw new ApiError(400, 'This order is not an unpaid lead');
  }
  if (order.payment?.status === PAYMENT_STATUS.PAID) {
    throw new ApiError(400, 'Order is already paid');
  }

  await markPaymentPaid(
    id,
    transactionId || `manual-${Date.now()}`,
    { admin: true, source: 'lead_confirmation' }
  );

  const updated = await Order.findById(id);
  updated.isLead = false;
  updated.statusHistory.push({
    status: updated.status,
    note: note ? `Lead confirmed: ${note}` : 'Lead converted to confirmed order after follow-up',
    updatedBy: userId,
  });
  await updated.save();
  return getOrderById(id);
};

export const cancelLeadOrder = async (id, { note }, userId) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!isLeadOrder(order)) {
    throw new ApiError(400, 'This order is not an unpaid lead');
  }
  if (order.payment?.status === PAYMENT_STATUS.PAID) {
    throw new ApiError(400, 'Cannot cancel a paid order');
  }

  order.status = ORDER_STATUS.CANCELLED;
  if (order.payment.status === PAYMENT_STATUS.PENDING) {
    order.payment.status = PAYMENT_STATUS.FAILED;
  }
  order.isLead = false;
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    note: note || 'Lead cancelled by admin after follow-up',
    updatedBy: userId,
  });
  await order.save();
  return getOrderById(id);
};

export const markPaymentPaid = async (orderId, transactionId, gatewayResponse) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  order.payment.status = PAYMENT_STATUS.PAID;
  order.payment.transactionId = transactionId;
  order.payment.gatewayResponse = gatewayResponse;
  order.payment.paidAt = new Date();
  order.isLead = false;
  if (order.status === ORDER_STATUS.PENDING) {
    order.status = ORDER_STATUS.CONFIRMED;
    order.statusHistory.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment confirmed' });
  }

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (product.isHamper && product.comboItems?.length) {
      await comboService.deductComboComponentStock({
        product,
        quantity: item.quantity,
        reference: order.orderNumber,
        userId: null,
      });
      product.stock = await comboService.getComboAvailableStock(product);
      await product.save();
      continue;
    }

    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (variant) variant.stock = Math.max(0, variant.stock - item.quantity);
    } else {
      product.stock = Math.max(0, product.stock - item.quantity);
    }
    await product.save();
  }

  await order.save();
  return order;
};

export const getDeliveryZones = (options) => deliveryService.getDeliveryGroups(options);
export const createDeliveryZone = (data) => deliveryService.createDeliveryGroup(data);
export const updateDeliveryZone = (id, data) => deliveryService.updateDeliveryGroup(id, data);
export const deleteDeliveryZone = (id) => deliveryService.deleteDeliveryGroup(id);
