import { Product, InventoryLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  allowsBackorder,
  effectiveAllowsBackorder,
  getComponentAvailableStock,
  mapComboOptionCategories,
  optionsForComboComponent,
} from '../utils/productStock.js';
import {
  productTracksOptionInventory,
  resolveInventoryOption,
  syncProductStockFromOptions,
} from '../utils/optionInventory.js';

export { mapComboOptionCategories, effectiveAllowsBackorder };

const COMBO_COMPONENT_POPULATE =
  'name slug sku price stock images allowBackorder optionCategories shortDescription description isHamper';

export const computeComboStock = (comboItems, components, selectedOptions = []) => {
  if (!comboItems?.length) return 0;
  const byId = new Map(components.map((c) => [String(c._id), c]));
  let min = Infinity;
  let hasHardLimit = false;

  for (const item of comboItems) {
    const component = byId.get(String(item.product?._id || item.product));
    if (!component) continue;
    const qty = Math.max(1, item.quantity || 1);

    // Component sell-after-OOS → does not limit the combo
    if (allowsBackorder(component)) continue;

    const itemOptions = item.selectedOptions?.length
      ? item.selectedOptions
      : selectedOptions;
    const stock = getComponentAvailableStock(component, itemOptions);
    const bundles = Math.floor(stock / qty);
    min = Math.min(min, bundles);
    hasHardLimit = true;
  }

  if (!hasHardLimit) return 99;
  return min === Infinity ? 0 : Math.max(0, min);
};

export const hasOutOfStockComboComponent = (product, selectedOptions = []) => {
  if (!product?.isHamper || !product.comboItems?.length) return false;

  return product.comboItems.some((item) => {
    const component = item.product;
    if (!component || typeof component !== 'object') return true;
    if (allowsBackorder(component)) return false;
    const needed = Math.max(1, item.quantity || 1);
    const itemOptions = item.selectedOptions?.length
      ? item.selectedOptions
      : selectedOptions;
    return getComponentAvailableStock(component, itemOptions) < needed;
  });
};

export const resolveEffectiveStock = (product, selectedOptions = []) => {
  if (!product?.isHamper) return product?.stock ?? 0;
  if (!product.comboItems?.length) return 0;
  if (hasOutOfStockComboComponent(product, selectedOptions)) return 0;

  const components = product.comboItems
    .map((i) => i.product)
    .filter((p) => p && typeof p === 'object');
  if (!components.length) return product.stock ?? 0;

  return computeComboStock(product.comboItems, components, selectedOptions);
};

export const syncHamperStockRecord = async (hamperProduct) => {
  const stock = resolveEffectiveStock(hamperProduct);
  if (hamperProduct.stock !== stock) {
    hamperProduct.stock = stock;
    await hamperProduct.save();
  }
  return stock;
};

/**
 * Resolve live hamper stock for list responses without writing to the DB.
 * Persist via syncHamperStockRecord / product detail / order flows instead —
 * sequential saves on every storefront list GET made the homepage very slow.
 */
export const refreshHamperStocksInList = async (products) => {
  const hampers = products.filter((p) => p.isHamper);
  if (!hampers.length) return products;

  const populated = await Product.find({ _id: { $in: hampers.map((p) => p._id) } })
    .select('comboItems stock allowBackorder')
    .populate('comboItems.product', 'stock allowBackorder optionCategories')
    .lean();

  const stockById = new Map();
  for (const hamper of populated) {
    stockById.set(String(hamper._id), resolveEffectiveStock(hamper));
  }

  return products.map((p) => {
    if (!p.isHamper) return p;
    const stock = stockById.get(String(p._id));
    if (stock == null) return p;
    const hamper = populated.find((h) => String(h._id) === String(p._id));
    const allowBackorder = hamper ? effectiveAllowsBackorder(hamper) : false;
    if (typeof p.toObject === 'function') {
      const obj = p.toObject();
      obj.stock = stock;
      if (allowBackorder) obj.allowBackorder = true;
      return obj;
    }
    return {
      ...p,
      stock,
      ...(allowBackorder ? { allowBackorder: true } : {}),
    };
  });
};

export const mergeComboImages = (existingImages = [], components = [], comboItems = []) => {
  const manual = (existingImages || []).map((img, i) => ({
    ...img,
    sortOrder: img.sortOrder ?? i,
  }));

  if (!comboItems.length) {
    return manual.map((img, i) => ({
      ...img,
      isPrimary: i === 0,
      sortOrder: i === 0 ? 0 : i,
    }));
  }

  const sortedItems = [...comboItems].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const existingUrls = new Set(manual.map((i) => i.url));
  const extras = [];

  for (const item of sortedItems) {
    const component = components.find((c) => String(c._id) === String(item.product?._id || item.product));
    if (!component?.images?.length) continue;

    const img = component.images.find((i) => i.isPrimary) || component.images[0];
    if (!img?.url || existingUrls.has(img.url)) continue;

    extras.push({
      url: img.url,
      publicId: img.publicId,
      alt: component.name,
      isPrimary: false,
      sortOrder: manual.length + extras.length,
    });
    existingUrls.add(img.url);
  }

  const merged = [...manual, ...extras];
  return merged.map((img, i) => ({
    ...img,
    isPrimary: i === 0,
    sortOrder: i === 0 ? 0 : i,
  }));
};

export const validateComboItems = async (comboItems, productId = null) => {
  if (!comboItems?.length) {
    throw new ApiError(400, 'Combo product must include at least one item');
  }

  const ids = comboItems.map((i) => String(i.product?._id || i.product));
  if (productId && ids.includes(String(productId))) {
    throw new ApiError(400, 'A combo cannot include itself');
  }

  const components = await Product.find({ _id: { $in: ids } });
  if (components.length !== ids.length) {
    throw new ApiError(400, 'One or more combo items were not found');
  }

  for (const component of components) {
    if (component.isHamper && component.comboItems?.length) {
      throw new ApiError(400, `Cannot add combo product "${component.name}" as a component`);
    }
  }

  return components;
};

const stripHtml = (text) =>
  String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildComboShortDescription = (components, comboItems) => {
  const byId = new Map(components.map((c) => [String(c._id), c]));
  const sorted = [...(comboItems || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const lines = [];

  for (const item of sorted) {
    const component = byId.get(String(item.product?._id || item.product));
    if (!component?.name) continue;

    const text = stripHtml(component.shortDescription || component.description || '');
    if (!text) continue;

    const qty = Math.max(1, Number(item.quantity) || 1);
    const qtyLabel = qty > 1 ? ` (×${qty})` : '';
    lines.push(`${component.name}${qtyLabel}: ${text}`);
  }

  return lines.join('\n\n');
};

export const prepareComboProductData = async (data, productId = null) => {
  if (!data.isHamper) {
    return { ...data, comboItems: [] };
  }

  const comboItems = (data.comboItems || []).map((item, index) => {
    const selectedOptions = (item.selectedOptions || [])
      .map((opt) => ({
        category: String(opt.category || '').trim(),
        label: String(opt.label || '').trim(),
        priceAdjustment: Number(opt.priceAdjustment) || 0,
      }))
      .filter((opt) => opt.category && opt.label);

    return {
      product: String(item.product?._id || item.product),
      quantity: Math.max(1, Number(item.quantity) || 1),
      sortOrder: item.sortOrder ?? index,
      ...(selectedOptions.length ? { selectedOptions } : {}),
    };
  });

  const components = await validateComboItems(comboItems, productId);

  // Require variation picks for inventory-tracking variable components
  const byId = new Map(components.map((c) => [String(c._id), c]));
  for (const item of comboItems) {
    const component = byId.get(String(item.product));
    if (!component) continue;
    const tracking = (component.optionCategories || []).filter((c) => c.tracksInventory);
    if (!tracking.length) continue;
    for (const cat of tracking) {
      const catName = String(cat.name || '').trim().toLowerCase();
      const match = (item.selectedOptions || []).find(
        (s) => String(s.category || '').trim().toLowerCase() === catName
      );
      if (!match) {
        throw new ApiError(
          400,
          `Select a variation for "${component.name}" (${cat.name}) in this combo`
        );
      }
    }
  }

  const stock = computeComboStock(comboItems, components);
  const images = mergeComboImages(data.images || [], components, comboItems);
  const autoDescription = buildComboShortDescription(components, comboItems);

  return {
    ...data,
    comboItems,
    stock,
    images,
    ...(autoDescription
      ? {
          description: autoDescription,
          shortDescription: autoDescription.slice(0, 200),
          shortDescriptionEnabled: true,
        }
      : {}),
  };
};

export const getComboAvailableStock = async (product, selectedOptions = []) => {
  if (!product.isHamper || !product.comboItems?.length) {
    return product.stock;
  }

  let populated = product;
  const first = product.comboItems[0]?.product;
  if (!first || typeof first !== 'object' || first.stock == null) {
    populated = await Product.findById(product._id).populate('comboItems.product', COMBO_COMPONENT_POPULATE);
  }

  return resolveEffectiveStock(populated, selectedOptions);
};

export const assertComboStock = async (product, orderQty, selectedOptions = []) => {
  if (effectiveAllowsBackorder(product)) return orderQty;

  let populated = product;
  const first = product.comboItems?.[0]?.product;
  if (
    product.isHamper
    && product.comboItems?.length
    && (!first || typeof first !== 'object' || first.stock == null || first.allowBackorder == null)
  ) {
    populated = await Product.findById(product._id).populate('comboItems.product', COMBO_COMPONENT_POPULATE);
  }

  if (!populated?.comboItems?.length) {
    throw new ApiError(400, `${product.name} is out of stock`);
  }

  for (const item of populated.comboItems) {
    const component = item.product;
    if (!component || typeof component !== 'object') {
      throw new ApiError(400, `${product.name} has an invalid combo item`);
    }

    if (allowsBackorder(component)) continue;

    const needed = Math.max(1, item.quantity || 1) * orderQty;
    const componentOpts = item.selectedOptions?.length
      ? item.selectedOptions
      : optionsForComboComponent(selectedOptions, component);

    if (productTracksOptionInventory(component)) {
      const resolved = resolveInventoryOption(component, componentOpts);
      if (!resolved) {
        throw new ApiError(
          400,
          `Select a stock variation for ${component.name} (in ${product.name})`
        );
      }
      if ((Number(resolved.option.stock) || 0) < needed) {
        throw new ApiError(
          400,
          `Insufficient stock for ${component.name} (${resolved.label}) in ${product.name}`
        );
      }
      continue;
    }

    if ((Number(component.stock) || 0) < needed) {
      throw new ApiError(400, `Insufficient stock for ${component.name} in ${product.name}`);
    }
  }

  return orderQty;
};

export const deductComboComponentStock = async ({
  product,
  quantity,
  reference,
  userId = null,
  selectedOptions = [],
}) => {
  const populated = product.comboItems?.[0]?.product?.stock != null
    && product.comboItems?.[0]?.product?.optionCategories != null
    ? product
    : await Product.findById(product._id).populate('comboItems.product', COMBO_COMPONENT_POPULATE);

  if (!populated?.comboItems?.length) return;

  for (const item of populated.comboItems) {
    const component = item.product;
    if (!component?._id) continue;

    const deductQty = (item.quantity || 1) * quantity;
    const componentOpts = item.selectedOptions?.length
      ? item.selectedOptions
      : optionsForComboComponent(selectedOptions, component);

    if (productTracksOptionInventory(component)) {
      const resolved = resolveInventoryOption(component, componentOpts);
      if (resolved) {
        const previousStock = Number(resolved.option.stock) || 0;
        resolved.option.stock = Math.max(0, previousStock - deductQty);
        syncProductStockFromOptions(component);
        await component.save();

        await InventoryLog.create({
          product: component._id,
          optionCategory: resolved.categoryName,
          optionLabel: resolved.label,
          type: 'out',
          quantity: deductQty,
          previousStock,
          newStock: resolved.option.stock,
          reason: `Combo sale: ${product.name}`,
          reference,
          performedBy: userId,
        });
        continue;
      }
    }

    const previousStock = component.stock;
    component.stock = Math.max(0, previousStock - deductQty);
    await component.save();

    await InventoryLog.create({
      product: component._id,
      type: 'out',
      quantity: deductQty,
      previousStock,
      newStock: component.stock,
      reason: `Combo sale: ${product.name}`,
      reference,
      performedBy: userId,
    });
  }

  await syncComboProductsContaining(populated.comboItems.map((i) => i.product._id));
};

export const syncComboProductsContaining = async (componentIds) => {
  const ids = componentIds.map((id) => String(id));
  const combos = await Product.find({
    isHamper: true,
    'comboItems.product': { $in: ids },
  }).populate('comboItems.product', COMBO_COMPONENT_POPULATE);

  for (const combo of combos) {
    const components = combo.comboItems.map((i) => i.product).filter(Boolean);
    combo.stock = computeComboStock(combo.comboItems, components);
    combo.images = mergeComboImages(combo.images, components, combo.comboItems);
    await combo.save();
  }
};

export const restoreComboComponentStock = async ({
  product,
  quantity,
  reference,
  userId = null,
  selectedOptions = [],
}) => {
  const populated = await Product.findById(product._id).populate(
    'comboItems.product',
    COMBO_COMPONENT_POPULATE
  );
  if (!populated?.comboItems?.length) return;

  for (const item of populated.comboItems) {
    const component = item.product;
    if (!component?._id) continue;

    const restoreQty = (item.quantity || 1) * quantity;
    const componentOpts = item.selectedOptions?.length
      ? item.selectedOptions
      : optionsForComboComponent(selectedOptions, component);

    if (productTracksOptionInventory(component) && componentOpts.length) {
      const resolved = resolveInventoryOption(component, componentOpts);
      if (resolved) {
        const previousStock = Number(resolved.option.stock) || 0;
        resolved.option.stock = previousStock + restoreQty;
        syncProductStockFromOptions(component);
        await component.save();

        await InventoryLog.create({
          product: component._id,
          optionCategory: resolved.categoryName,
          optionLabel: resolved.label,
          type: 'return',
          quantity: restoreQty,
          previousStock,
          newStock: resolved.option.stock,
          reason: `Combo return: ${product.name}`,
          reference,
          performedBy: userId,
        });
        continue;
      }
    }

    const previousStock = component.stock;
    component.stock = previousStock + restoreQty;
    await component.save();

    await InventoryLog.create({
      product: component._id,
      type: 'return',
      quantity: restoreQty,
      previousStock,
      newStock: component.stock,
      reason: `Combo return: ${product.name}`,
      reference,
      performedBy: userId,
    });
  }

  await syncComboProductsContaining(populated.comboItems.map((i) => i.product._id));
};
