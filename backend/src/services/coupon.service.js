import { Coupon, Product, Order, Settings } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import * as deliveryService from './delivery.service.js';

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

export const calculateDiscountAmount = (baseAmount, { discountType, value, maxDiscount }) => {
  const base = Math.max(0, Number(baseAmount) || 0);
  if (!base || !value) return 0;

  if (discountType === 'flat') {
    return Math.min(value, base);
  }
  if (discountType === 'percent') {
    return Math.min(base, Math.round((base * value) / 100));
  }
  if (discountType === 'percent_capped') {
    const raw = Math.round((base * value) / 100);
    const cap = maxDiscount != null ? maxDiscount : raw;
    return Math.min(base, raw, cap);
  }
  return 0;
};

const assertCouponWindow = (coupon) => {
  const now = new Date();
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    throw new ApiError(400, 'This coupon is not active yet');
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    throw new ApiError(400, 'This coupon has expired');
  }
};

const assertCouponUsage = async (coupon, userId) => {
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }
  if (userId && coupon.perUserLimit != null) {
    const userUses = await Order.countDocuments({
      user: userId,
      'coupon.couponId': coupon._id,
    });
    if (userUses >= coupon.perUserLimit) {
      throw new ApiError(400, 'You have already used this coupon');
    }
  }
};

const resolveLineItems = async (items = []) => {
  const resolved = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new ApiError(400, `Product not found: ${item.productId}`);
    }

    let price = product.price;
    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (!variant || !variant.isActive) throw new ApiError(400, 'Variant not found');
      price = variant.price;
    } else if (item.unitPrice != null) {
      price = Number(item.unitPrice);
    }

    const qty = Math.max(1, Number(item.quantity) || 1);
    resolved.push({
      productId: product._id,
      categoryId: product.category,
      categories: product.categories || [],
      name: product.name,
      price,
      quantity: qty,
      lineTotal: price * qty,
    });
  }
  return resolved;
};

const getEligibleSubtotal = (lineItems, categoryIds = []) => {
  if (!categoryIds.length) {
    return lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  }
  const allowed = new Set(categoryIds.map(String));
  return lineItems.reduce((sum, item) => {
    const inPrimary = allowed.has(String(item.categoryId));
    const inExtra = (item.categories || []).some((id) => allowed.has(String(id)));
    return inPrimary || inExtra ? sum + item.lineTotal : sum;
  }, 0);
};

export const getCouponByCode = async (code) => {
  const coupon = await Coupon.findOne({ code: normalizeCode(code), isActive: true })
    .populate('categoryIds', 'name slug');
  if (!coupon) throw new ApiError(404, 'Invalid coupon code');
  return coupon;
};

const normalizeAddonEntries = (entries = []) => {
  if (!entries?.length) return [];
  return entries.map((entry) => (typeof entry === 'string' ? { id: entry } : entry));
};

export const resolveServiceAddons = async (entries = [], { validateInputs = true } = {}) => {
  const normalized = normalizeAddonEntries(entries);
  if (!normalized.length) return { addons: [], total: 0 };

  const setting = await Settings.findOne({ key: 'service_addons' });
  const catalog = (setting?.value || []).filter((a) => a.enabled !== false);
  const addons = [];
  let total = 0;

  for (const entry of normalized) {
    const addon = catalog.find((a) => a.id === entry.id);
    if (!addon) throw new ApiError(400, `Invalid service add-on: ${entry.id}`);

    const inputType = addon.inputType || 'none';
    const text = entry.text?.trim() || '';
    const photoUrl = entry.photoUrl?.trim() || '';

    if (validateInputs) {
      if ((inputType === 'text' || inputType === 'both') && !text) {
        throw new ApiError(400, `Please provide text for "${addon.name}"`);
      }
      if ((inputType === 'photo' || inputType === 'both') && !photoUrl) {
        throw new ApiError(400, `Please upload a photo for "${addon.name}"`);
      }
    }

    addons.push({
      id: addon.id,
      name: addon.name,
      price: Number(addon.price) || 0,
      inputType,
      customerText: text || undefined,
      photoUrl: photoUrl || undefined,
      photoName: entry.photoName?.trim() || undefined,
    });
    total += Number(addon.price) || 0;
  }

  return { addons, total };
};

export const validateCouponForCheckout = async ({
  code,
  items,
  paymentMethod,
  deliveryLocationId,
  deliveryGroupId,
  serviceAddonIds,
  timeSlotId,
  userId,
}) => {
  const lineItems = await resolveLineItems(items);
  const itemsSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const { addons, total: addonsTotal } = await resolveServiceAddons(serviceAddonIds, { validateInputs: false });
  const subtotal = itemsSubtotal + addonsTotal;

  let shippingFee = 0;
  let baseDeliveryFee = 0;
  let slotFee = 0;
  let timeSlot = null;
  const deliveryWarnings = [];
  let deliveryConstraintsMet = true;

  if (deliveryLocationId) {
    const deliveryCheck = await deliveryService.validateOrderDelivery(
      items.map((item) => ({ productId: item.productId })),
      deliveryLocationId,
      deliveryGroupId,
      timeSlotId,
      { strict: false }
    );
    shippingFee = deliveryCheck.fee;
    baseDeliveryFee = deliveryCheck.baseFee ?? 0;
    slotFee = deliveryCheck.slotFee ?? 0;
    timeSlot = deliveryCheck.timeSlot ?? null;
    deliveryWarnings.push(...(deliveryCheck.warnings || []));
    deliveryConstraintsMet = deliveryCheck.deliveryConstraintsMet !== false;
  }

  const deliveryBreakdown = {
    baseDeliveryFee,
    slotFee,
    timeSlot,
    shippingFee,
    deliveryWarnings,
    deliveryConstraintsMet,
  };

  if (!code?.trim()) {
    return {
      coupon: null,
      addons,
      itemsSubtotal,
      addonsTotal,
      subtotal,
      ...deliveryBreakdown,
      subtotalDiscount: 0,
      shippingDiscount: 0,
      discount: 0,
      total: Math.max(0, subtotal + shippingFee),
      message: null,
    };
  }

  const coupon = await getCouponByCode(code);
  assertCouponWindow(coupon);
  await assertCouponUsage(coupon, userId);

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw new ApiError(400, `Minimum order amount Rs. ${coupon.minOrderAmount} required for this coupon`);
  }

  if (coupon.appliesTo === 'payment_gateway') {
    const gateways = (coupon.paymentGatewayIds || []).map(String);
    if (!paymentMethod) {
      throw new ApiError(400, 'Select a payment method to apply this coupon');
    }
    if (!gateways.includes(String(paymentMethod))) {
      throw new ApiError(400, 'This coupon is not valid for the selected payment method');
    }
  }

  let discountBase = 0;
  if (coupon.appliesTo === 'order') {
    discountBase = subtotal;
  } else if (coupon.appliesTo === 'category') {
    discountBase = getEligibleSubtotal(lineItems, coupon.categoryIds);
    if (discountBase <= 0) {
      throw new ApiError(400, 'No eligible category items in cart for this coupon');
    }
  } else if (coupon.appliesTo === 'shipping') {
    if (!deliveryLocationId) {
      throw new ApiError(400, 'Select a delivery location to apply delivery discount');
    }
    discountBase = shippingFee;
    if (discountBase <= 0) {
      throw new ApiError(400, 'No delivery fee to discount');
    }
  } else if (coupon.appliesTo === 'payment_gateway') {
    discountBase = subtotal;
  }

  const discountAmount = calculateDiscountAmount(discountBase, coupon);
  if (discountAmount <= 0) {
    throw new ApiError(400, 'Coupon does not apply to this order');
  }

  const subtotalDiscount = ['order', 'category', 'payment_gateway'].includes(coupon.appliesTo)
    ? discountAmount
    : 0;
  const shippingDiscount = coupon.appliesTo === 'shipping' ? discountAmount : 0;

  return {
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      appliesTo: coupon.appliesTo,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
    },
    addons,
    itemsSubtotal,
    addonsTotal,
    subtotal,
    ...deliveryBreakdown,
    subtotalDiscount,
    shippingDiscount,
    discount: subtotalDiscount + shippingDiscount,
    total: Math.max(0, subtotal + shippingFee - subtotalDiscount - shippingDiscount),
    message: buildCouponMessage(coupon, discountAmount),
  };
};

const buildCouponMessage = (coupon, amount) => {
  const typeLabels = {
    flat: `Rs. ${amount} off`,
    percent: `${coupon.value}% off`,
    percent_capped: `${coupon.value}% off (max Rs. ${coupon.maxDiscount})`,
  };
  const scopeLabels = {
    order: 'order',
    category: 'selected categories',
    shipping: 'delivery fee',
    payment_gateway: 'order with selected payment',
  };
  return `${typeLabels[coupon.discountType]} on ${scopeLabels[coupon.appliesTo]} applied`;
};

export const buildCheckoutQuote = (params) => validateCouponForCheckout(params);

export const recordCouponRedemption = async (couponMeta) => {
  if (!couponMeta?.couponId) return;
  await Coupon.findByIdAndUpdate(couponMeta.couponId, { $inc: { usedCount: 1 } });
};

export const getCoupons = async ({ page = 1, limit = 20, search, isActive }) => {
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .populate('categoryIds', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Coupon.countDocuments(filter),
  ]);

  return { coupons, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

export const getCouponById = async (id) => {
  const coupon = await Coupon.findById(id).populate('categoryIds', 'name slug');
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  return coupon;
};

export const createCoupon = async (data, userId) => {
  const payload = {
    ...data,
    code: normalizeCode(data.code),
    createdBy: userId,
    updatedBy: userId,
  };
  const coupon = await Coupon.create(payload);
  return getCouponById(coupon._id);
};

export const updateCoupon = async (id, data, userId) => {
  const payload = { ...data, updatedBy: userId };
  if (payload.code) payload.code = normalizeCode(payload.code);
  const coupon = await Coupon.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  return getCouponById(coupon._id);
};

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, 'Coupon not found');
};

export const getCouponUsageReport = async ({ from, to } = {}) => {
  const match = { 'coupon.couponId': { $exists: true, $ne: null } };

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const rows = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$coupon.couponId',
        code: { $first: '$coupon.code' },
        name: { $first: '$coupon.name' },
        discountType: { $first: '$coupon.discountType' },
        appliesTo: { $first: '$coupon.appliesTo' },
        uses: { $sum: 1 },
        totalDiscount: { $sum: { $ifNull: ['$discount', 0] } },
        totalOrderValue: { $sum: { $ifNull: ['$total', 0] } },
        totalSubtotal: { $sum: { $ifNull: ['$subtotal', 0] } },
        totalShipping: { $sum: { $ifNull: ['$shippingFee', 0] } },
        firstUsedAt: { $min: '$createdAt' },
        lastUsedAt: { $max: '$createdAt' },
      },
    },
    { $sort: { uses: -1, totalDiscount: -1 } },
  ]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.uses += r.uses || 0;
      acc.totalDiscount += r.totalDiscount || 0;
      acc.totalOrderValue += r.totalOrderValue || 0;
      return acc;
    },
    { uses: 0, totalDiscount: 0, totalOrderValue: 0 }
  );

  return {
    range: { from: from || null, to: to || null },
    totals,
    rows,
  };
};
