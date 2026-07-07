import { Product, InventoryLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const computeComboStock = (comboItems, components) => {
  if (!comboItems?.length) return 0;
  const byId = new Map(components.map((c) => [String(c._id), c]));
  let min = Infinity;

  for (const item of comboItems) {
    const component = byId.get(String(item.product?._id || item.product));
    if (!component) continue;
    const qty = Math.max(1, item.quantity || 1);
    const bundles = Math.floor((component.stock || 0) / qty);
    min = Math.min(min, bundles);
  }

  return min === Infinity ? 0 : Math.max(0, min);
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

  const comboItems = (data.comboItems || []).map((item, index) => ({
    product: String(item.product?._id || item.product),
    quantity: Math.max(1, Number(item.quantity) || 1),
    sortOrder: item.sortOrder ?? index,
  }));

  const components = await validateComboItems(comboItems, productId);
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

export const getComboAvailableStock = async (product) => {
  if (!product.isHamper || !product.comboItems?.length) {
    return product.stock;
  }

  let populated = product;
  const first = product.comboItems[0]?.product;
  if (!first || typeof first !== 'object' || first.stock == null) {
    populated = await Product.findById(product._id).populate('comboItems.product');
  }

  const components = populated.comboItems.map((i) => i.product).filter((p) => p && p.stock != null);
  return computeComboStock(populated.comboItems, components);
};

export const assertComboStock = async (product, orderQty) => {
  const available = await getComboAvailableStock(product, orderQty);
  if (available < orderQty) {
    throw new ApiError(400, `Insufficient stock for combo ${product.name}`);
  }
  return available;
};

export const deductComboComponentStock = async ({
  product,
  quantity,
  reference,
  userId = null,
}) => {
  const populated = product.comboItems?.[0]?.product?.stock != null
    ? product
    : await Product.findById(product._id).populate('comboItems.product');

  if (!populated?.comboItems?.length) return;

  for (const item of populated.comboItems) {
    const component = item.product;
    if (!component?._id) continue;

    const deductQty = (item.quantity || 1) * quantity;
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
  }).populate('comboItems.product');

  for (const combo of combos) {
    const components = combo.comboItems.map((i) => i.product).filter(Boolean);
    combo.stock = computeComboStock(combo.comboItems, components);
    combo.images = mergeComboImages(combo.images, components, combo.comboItems);
    await combo.save();
  }
};

export const restoreComboComponentStock = async ({ product, quantity, reference, userId = null }) => {
  const populated = await Product.findById(product._id).populate('comboItems.product');
  if (!populated?.comboItems?.length) return;

  for (const item of populated.comboItems) {
    const component = item.product;
    if (!component?._id) continue;

    const restoreQty = (item.quantity || 1) * quantity;
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
