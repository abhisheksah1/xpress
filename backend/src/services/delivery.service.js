import { DeliveryLocation, DeliveryGroup, Product, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const idStr = (id) => String(id);

const findRule = (rules, groupId) =>
  (rules || []).find((rule) => idStr(rule.group) === idStr(groupId));

// ─── Delivery Locations ───────────────────────────────────────────

export const getDeliveryLocations = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return DeliveryLocation.find(filter).sort({ sortOrder: 1, name: 1 });
};

export const createDeliveryLocation = async (data) => DeliveryLocation.create(data);

export const updateDeliveryLocation = async (id, data) => {
  const loc = await DeliveryLocation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!loc) throw new ApiError(404, 'Delivery location not found');
  return loc;
};

export const deleteDeliveryLocation = async (id) => {
  const inUse = await DeliveryGroup.countDocuments({ coverageLocations: id });
  if (inUse > 0) {
    throw new ApiError(400, 'Location is used by a delivery group. Remove it from groups first.');
  }
  const loc = await DeliveryLocation.findByIdAndDelete(id);
  if (!loc) throw new ApiError(404, 'Delivery location not found');
};

// ─── Delivery Groups ──────────────────────────────────────────────

const populateGroup = (query) =>
  query
    .populate('coverageLocations', 'name deliveryFee')
    .populate('categories', 'name slug')
    .populate('products', 'name slug sku');

export const getDeliveryGroups = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const groups = await populateGroup(DeliveryGroup.find(filter).sort({ sortOrder: 1, name: 1 }));
  return Promise.all(groups.map(async (g) => ({
    ...g.toObject(),
    productCount: await countProductsInGroup(g),
  })));
};

export const getDeliveryGroupById = async (id) => {
  const group = await populateGroup(DeliveryGroup.findById(id));
  if (!group) throw new ApiError(404, 'Delivery group not found');
  const obj = group.toObject();
  obj.productCount = await countProductsInGroup(group);
  return obj;
};

export const createDeliveryGroup = async (data) => {
  const group = await DeliveryGroup.create(data);
  return getDeliveryGroupById(group._id);
};

export const updateDeliveryGroup = async (id, data) => {
  const group = await DeliveryGroup.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!group) throw new ApiError(404, 'Delivery group not found');
  return getDeliveryGroupById(group._id);
};

export const deleteDeliveryGroup = async (id) => {
  const group = await DeliveryGroup.findByIdAndDelete(id);
  if (!group) throw new ApiError(404, 'Delivery group not found');
};

export const getGroupProducts = async (groupId) => {
  const group = await DeliveryGroup.findById(groupId);
  if (!group) throw new ApiError(404, 'Delivery group not found');

  const filter = { $or: [] };
  if (group.products?.length) filter.$or.push({ _id: { $in: group.products } });
  if (group.categories?.length) {
    filter.$or.push({ category: { $in: group.categories } });
    filter.$or.push({ categories: { $in: group.categories } });
  }

  if (!filter.$or.length) return [];

  return Product.find({ $or: filter.$or })
    .populate('category', 'name slug')
    .select('name slug sku price isActive category')
    .sort({ name: 1 });
};

export const countProductsInGroup = async (group) => {
  const g = group._id ? group : await DeliveryGroup.findById(group);
  if (!g) return 0;

  const filter = { $or: [], isActive: true };
  if (g.products?.length) filter.$or.push({ _id: { $in: g.products } });
  if (g.categories?.length) {
    filter.$or.push({ category: { $in: g.categories } });
    filter.$or.push({ categories: { $in: g.categories } });
  }

  if (!filter.$or.length) return 0;
  return Product.countDocuments(filter);
};

// ─── Product ↔ Group resolution ─────────────────────────────────

export const productMatchesGroup = (product, category, group) => {
  const productId = idStr(product._id || product);
  const categoryId = idStr(product.category?._id || product.category || category?._id);
  const extraCategoryIds = (product.categories || []).map((c) => idStr(c._id || c));

  if ((group.products || []).some((p) => idStr(p._id || p) === productId)) return true;
  if ((group.categories || []).some((c) => idStr(c._id || c) === categoryId)) return true;
  if ((group.categories || []).some((gc) => extraCategoryIds.includes(idStr(gc._id || gc)))) return true;

  const scope = product.deliveryScope || 'inherit';
  const productRule = findRule(product.deliveryGroupRules, group._id);
  const categoryRule = category ? findRule(category.deliveryGroupRules, group._id) : null;

  if (scope === 'all') return true;
  if (scope === 'selected') return !!productRule?.available;
  if (scope === 'inherit') {
    if (category?.deliveryScope === 'all') return true;
    if (category?.deliveryScope === 'selected') return !!categoryRule?.available;
  }

  const legacyIds = (product.deliveryZones || product.deliveryGroups || []).map((z) => idStr(z._id || z));
  if (legacyIds.length && legacyIds.includes(idStr(group._id))) return true;

  return false;
};

export const resolveDeliveryForGroup = (product, category, group) => {
  const available = productMatchesGroup(product, category, group);
  const productRule = findRule(product.deliveryGroupRules, group._id);
  const categoryRule = category ? findRule(category.deliveryGroupRules, group._id) : null;

  const hasProductDaysOverride = productRule?.estimatedDays?.min != null;
  const hasCategoryDaysOverride = !hasProductDaysOverride && categoryRule?.estimatedDays?.min != null;
  const hasDaysOverride = hasProductDaysOverride || hasCategoryDaysOverride;

  const estimatedDays = hasProductDaysOverride
    ? productRule.estimatedDays
    : hasCategoryDaysOverride
      ? categoryRule.estimatedDays
      : group.estimatedDays || { min: 1, max: 3 };

  const resolvedDays = {
    min: estimatedDays.min ?? group.estimatedDays?.min ?? 1,
    max: estimatedDays.max ?? group.estimatedDays?.max ?? estimatedDays.min ?? 3,
  };

  // Same-day from explicit product/category flags, or from group defaults when no day override.
  // Do not let group estimatedHours wipe a product/category min/max days override.
  const sameDayFromRules = !!(productRule?.sameDay || categoryRule?.sameDay);
  const sameDayFromGroup =
    !hasDaysOverride &&
    ((group.estimatedHours != null && group.estimatedHours <= 24) || group.estimatedDays?.min === 0);
  const sameDay = sameDayFromRules || sameDayFromGroup || resolvedDays.min === 0;

  if (sameDay && !hasDaysOverride) {
    resolvedDays.min = 0;
    resolvedDays.max = 0;
  }

  return {
    available,
    sameDay: !!sameDay,
    estimatedDeliveryLabel: group.estimatedDeliveryLabel,
    estimatedDays: resolvedDays,
    cutoffTime: group.cutoffTime,
    productRule,
    categoryRule,
    hasDaysOverride,
  };
};

export const isProductAvailableInGroup = (product, category, group) =>
  resolveDeliveryForGroup(product, category, group).available;

export const getGroupsForLocation = async (locationId) => {
  const groups = await DeliveryGroup.find({
    isActive: true,
    coverageLocations: locationId,
  }).sort({ sortOrder: 1 });
  return groups;
};

export const findGroupsCoveringLocation = async (locationId) =>
  DeliveryGroup.find({ isActive: true, coverageLocations: locationId }).sort({ sortOrder: 1 });

export const validateOrderDelivery = async (
  items,
  locationId,
  groupId = null,
  timeSlotId = null,
  { strict = false } = {}
) => {
  const warnings = [];
  const location = await DeliveryLocation.findById(locationId);
  if (!location || !location.isActive) {
    throw new ApiError(400, 'Invalid delivery location');
  }

  let groups = await findGroupsCoveringLocation(locationId);
  if (groupId) {
    const specific = groups.find((g) => idStr(g._id) === idStr(groupId));
    if (!specific) {
      if (strict) {
        throw new ApiError(400, 'Selected delivery group does not cover this location');
      }
      warnings.push('Selected delivery group does not cover this location. Order will be reviewed.');
    } else {
      groups = [specific];
    }
  }
  if (!groups.length) {
    if (strict) {
      throw new ApiError(400, `No delivery service available for ${location.name}`);
    }
    warnings.push(
      `No standard delivery group is configured for ${location.name}. Your order will still be accepted and our team will confirm delivery.`
    );
  }

  const productIds = items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } }).populate('category');
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  let matchedGroup = null;
  let maxMinDays = 0;
  let maxMaxDays = 0;
  let constraintsMet = true;

  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product) throw new ApiError(400, `Product not found: ${item.productId}`);

    const eligibleGroups = groups.filter((g) =>
      productMatchesGroup(product, product.category, g)
    );

    if (!eligibleGroups.length) {
      constraintsMet = false;
      if (strict) {
        throw new ApiError(400, `${product.name} cannot be delivered to ${location.name}`);
      }
      warnings.push(
        `"${product.name}" may not meet the standard delivery schedule for ${location.name}. We will still accept your order and coordinate delivery with you.`
      );
      continue;
    }

    const group = eligibleGroups.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
    matchedGroup = matchedGroup || group;

    const delivery = resolveDeliveryForGroup(product, product.category, group);
    maxMinDays = Math.max(maxMinDays, delivery.estimatedDays.min);
    maxMaxDays = Math.max(maxMaxDays, delivery.estimatedDays.max);
  }

  let slotFee = 0;
  let slot = null;
  if (timeSlotId && location.timeSlotsEnabled && Array.isArray(location.timeSlots) && location.timeSlots.length) {
    const found = location.timeSlots
      .filter((s) => s.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .find((s) => String(s.id) === String(timeSlotId));
    if (!found) {
      if (strict) {
        throw new ApiError(400, 'Invalid delivery time slot for selected location');
      }
      warnings.push('Selected time slot is not available for this location. Order accepted without time slot surcharge.');
    } else {
      slotFee = Number(found.fee) || 0;
      slot = { id: found.id, label: found.label, start: found.start, end: found.end, fee: slotFee };
    }
  }

  return {
    location,
    group: matchedGroup,
    fee: (Number(location.deliveryFee) || 0) + slotFee,
    baseFee: Number(location.deliveryFee) || 0,
    slotFee,
    timeSlot: slot,
    estimatedDeliveryDays: maxMinDays || maxMaxDays
      ? { min: maxMinDays, max: maxMaxDays }
      : { min: 1, max: 3 },
    estimatedDeliveryLabel: matchedGroup?.estimatedDeliveryLabel,
    cutoffTime: matchedGroup?.cutoffTime,
    deliveryConstraintsMet: warnings.length === 0 && constraintsMet,
    warnings,
  };
};

export const filterProductsByGroup = async (products, groupId) => {
  if (!groupId) return products;
  const group = await DeliveryGroup.findById(groupId).populate('categories products');
  if (!group || !group.isActive) return [];

  const categoryIds = [...new Set(products.map((p) => String(p.category?._id || p.category)).filter(Boolean))];
  const categories = await Category.find({ _id: { $in: categoryIds } });
  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

  return products.filter((product) => {
    const category = categoryMap.get(String(product.category?._id || product.category));
    return productMatchesGroup(product, category, group);
  });
};

export const filterProductsByLocation = async (products, locationId) => {
  if (!locationId) return products;
  const groups = await findGroupsCoveringLocation(locationId);
  if (!groups.length) return [];

  const categoryIds = [...new Set(products.map((p) => String(p.category?._id || p.category)).filter(Boolean))];
  const categories = await Category.find({ _id: { $in: categoryIds } });
  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

  return products.filter((product) => {
    const category = categoryMap.get(String(product.category?._id || product.category));
    return groups.some((group) => productMatchesGroup(product, category, group));
  });
};

// Legacy aliases
export const getLocationFee = (location) => location?.deliveryFee ?? 0;

export const DELIVERY_METHOD_LABELS = {
  local_arrangement: 'Local Arrangement',
  courier_local: 'Courier / Local Arrangement',
  courier: 'Courier',
};

export const formatCutoffTimeLabel = (time) => {
  if (!time) return '';
  const parts = String(time).split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period} NST`;
};

export const formatEstimatedTimeLabel = (group, resolved) => {
  const sameDayFromRules = !!(resolved?.productRule?.sameDay || resolved?.categoryRule?.sameDay);
  const hasDaysOverride = !!resolved?.hasDaysOverride
    || resolved?.productRule?.estimatedDays?.min != null
    || resolved?.categoryRule?.estimatedDays?.min != null;

  // Product / category delivery rules must win over the group's static label.
  if (sameDayFromRules && !hasDaysOverride) {
    return '⚡ Same day delivery';
  }

  if (hasDaysOverride) {
    const min = resolved?.estimatedDays?.min;
    const max = resolved?.estimatedDays?.max ?? min;
    if (min === 0) return '⚡ Same day delivery';
    if (min != null && max != null && min === max) {
      return `${min} day${min === 1 ? '' : 's'}`;
    }
    if (min != null && max != null) return `${min}–${max} days`;
  }

  if (group.estimatedDeliveryLabel) return group.estimatedDeliveryLabel;
  if (group.estimatedHours != null && group.estimatedHours > 0) {
    return `⚡ Minimum ${group.estimatedHours} Hour${group.estimatedHours === 1 ? '' : 's'}`;
  }
  if (resolved?.estimatedDays?.min === 0 || resolved?.sameDay) return '⚡ Same day delivery';
  const min = resolved?.estimatedDays?.min ?? group.estimatedDays?.min;
  const max = resolved?.estimatedDays?.max ?? group.estimatedDays?.max;
  if (min != null && max != null && min === max) return `${min} day${min === 1 ? '' : 's'}`;
  if (min != null && max != null) return `${min}–${max} days`;
  return 'As per carrier schedule';
};

export const attachDeliveryInfo = (product, category, groups) =>
  groups
    .map((group) => {
      const resolved = resolveDeliveryForGroup(product, category, group);
      const coverageAreas = (group.coverageLocations || [])
        .map((loc) => loc?.name || loc)
        .filter(Boolean);

      return {
        groupId: group._id,
        groupName: group.name,
        groupCode: group.code,
        deliveryMethod: group.deliveryMethod,
        deliveryMethodLabel: DELIVERY_METHOD_LABELS[group.deliveryMethod] || group.deliveryMethod,
        coverageAreas,
        coverageText: coverageAreas.join(', '),
        estimatedTimeLabel: formatEstimatedTimeLabel(group, resolved),
        cutoffTimeLabel: formatCutoffTimeLabel(group.cutoffTime),
        availabilityLabel: resolved.available
          ? 'Available on standard schedule'
          : 'May require manual confirmation — you can still place an order',
        ...resolved,
        cutoffTime: group.cutoffTime,
        estimatedDeliveryLabel: group.estimatedDeliveryLabel,
        estimatedHours: group.estimatedHours,
        coverageLocations: group.coverageLocations,
      };
    })
    .filter((row) => row.available);
