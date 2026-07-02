import { Order, Product, DeliveryZone } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../config/constants.js';

export const createOrder = async (data) => {
  const { items, shippingAddress, deliveryZoneId, userId, guestEmail, guestPhone } = data;

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
    }

    if (stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    orderItems.push({
      product: product._id,
      variantId: item.variantId,
      name: product.name,
      sku,
      image,
      price,
      quantity: item.quantity,
      giftWrap: item.giftWrap || false,
      giftMessage: item.giftMessage,
    });

    subtotal += price * item.quantity;
  }

  let shippingFee = 0;
  let deliveryZone = null;
  if (deliveryZoneId) {
    deliveryZone = await DeliveryZone.findById(deliveryZoneId);
    if (!deliveryZone || !deliveryZone.isActive) {
      throw new ApiError(400, 'Invalid delivery zone');
    }
    shippingFee =
      deliveryZone.freeShippingThreshold > 0 && subtotal >= deliveryZone.freeShippingThreshold
        ? 0
        : deliveryZone.deliveryFee;
  }

  const total = subtotal + shippingFee - (data.discount || 0) + (data.tax || 0);

  const order = await Order.create({
    user: userId || undefined,
    guestEmail,
    guestPhone,
    isGuest: !userId,
    items: orderItems,
    shippingAddress,
    deliveryZone: deliveryZone?._id,
    subtotal,
    shippingFee,
    discount: data.discount || 0,
    tax: data.tax || 0,
    total,
    payment: { method: data.paymentMethod, status: PAYMENT_STATUS.PENDING, amount: total },
    notes: data.notes,
    statusHistory: [{ status: ORDER_STATUS.PENDING, note: 'Order placed' }],
  });

  return order;
};

export const getOrders = async ({ page = 1, limit = 20, status, userId, search }) => {
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { guestEmail: { $regex: search, $options: 'i' } },
      { guestPhone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .populate('deliveryZone', 'name deliveryFee')
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
    .populate('items.product', 'name slug images')
    .populate('deliveryZone', 'name deliveryFee estimatedDays');

  if (!order) throw new ApiError(404, 'Order not found');
  if (userId && order.user?.toString() !== userId.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  return order;
};

export const getOrderByNumber = async (orderNumber, email) => {
  const filter = { orderNumber };
  if (email) filter.$or = [{ guestEmail: email }, { 'shippingAddress.email': email }];
  const order = await Order.findOne(filter).populate('items.product', 'name slug images');
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
};

export const updateOrderStatus = async (id, { status, note }, userId) => {
  const order = await Order.findById(id);
  if (!order) throw new ApiError(404, 'Order not found');

  order.status = status;
  order.statusHistory.push({ status, note, updatedBy: userId });
  await order.save();
  return order;
};

export const markPaymentPaid = async (orderId, transactionId, gatewayResponse) => {
  const order = await Order.findById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');

  order.payment.status = PAYMENT_STATUS.PAID;
  order.payment.transactionId = transactionId;
  order.payment.gatewayResponse = gatewayResponse;
  order.payment.paidAt = new Date();
  if (order.status === ORDER_STATUS.PENDING) {
    order.status = ORDER_STATUS.CONFIRMED;
    order.statusHistory.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment confirmed' });
  }

  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;
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

export const getDeliveryZones = async () => {
  return DeliveryZone.find({ isActive: true }).sort({ province: 1, name: 1 });
};

export const createDeliveryZone = async (data) => DeliveryZone.create(data);
export const updateDeliveryZone = async (id, data) => {
  const zone = await DeliveryZone.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!zone) throw new ApiError(404, 'Delivery zone not found');
  return zone;
};
export const deleteDeliveryZone = async (id) => {
  const zone = await DeliveryZone.findByIdAndDelete(id);
  if (!zone) throw new ApiError(404, 'Delivery zone not found');
};
