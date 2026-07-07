export function getComboItemUnitPrice(item) {
  return Number(item?.product?.price ?? item?.productData?.price ?? 0) || 0;
}

export function getComboItemQuantity(item) {
  return Math.max(1, Number(item?.quantity) || 1);
}

export function getComboItemLineTotal(item) {
  return getComboItemUnitPrice(item) * getComboItemQuantity(item);
}

export function computeComboItemsTotal(comboItems) {
  if (!comboItems?.length) return 0;
  return comboItems.reduce((sum, item) => sum + getComboItemLineTotal(item), 0);
}

export function formatNprAmount(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-NP', { maximumFractionDigits: 0 })}`;
}

export function normalizeComboItemProductId(productRef) {
  if (!productRef) return '';
  if (typeof productRef === 'string') return productRef;
  if (typeof productRef === 'object' && productRef._id) return String(productRef._id);
  return String(productRef);
}

export function serializeComboItemsForApi(comboItems) {
  return (comboItems || [])
    .map((item, index) => ({
      product: normalizeComboItemProductId(item.product),
      quantity: Math.max(1, Number(item.quantity) || 1),
      sortOrder: item.sortOrder ?? index,
    }))
    .filter((item) => item.product);
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLinkedProductSummary(item) {
  return item?.productData || item?.product || null;
}

export function buildComboShortDescription(comboItems) {
  const sorted = [...(comboItems || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const lines = [];

  for (const item of sorted) {
    const product = getLinkedProductSummary(item);
    if (!product?.name) continue;

    const text = stripHtml(product.shortDescription || product.description || '');
    if (!text) continue;

    const qty = getComboItemQuantity(item);
    const qtyLabel = qty > 1 ? ` (×${qty})` : '';
    lines.push(`${product.name}${qtyLabel}: ${text}`);
  }

  return lines.join('\n\n');
}

export function allowsBackorder(product) {
  return product?.allowBackorder === true || product?.allowBackorder === 'true';
}

export function hasOutOfStockComboComponent(product) {
  if (!product?.isHamper || !product.comboItems?.length) return false;
  if (allowsBackorder(product)) return false;

  return product.comboItems.some((item) => {
    const component = getLinkedProductSummary(item);
    if (!component || typeof component !== 'object') return true;
    return (component.stock ?? 0) <= 0;
  });
}

export function computeComboStockFromProduct(product) {
  if (!product?.isHamper || !product.comboItems?.length) return product?.stock ?? 0;
  if (hasOutOfStockComboComponent(product)) return 0;

  let min = Infinity;
  for (const item of product.comboItems) {
    const component = getLinkedProductSummary(item);
    if (!component || typeof component !== 'object') continue;
    const qty = getComboItemQuantity(item);
    const bundles = Math.floor((component.stock ?? 0) / qty);
    min = Math.min(min, bundles);
  }

  return min === Infinity ? 0 : Math.max(0, min);
}

export function resolveProductStock(product) {
  if (!product) return 0;
  if (product.isHamper) return computeComboStockFromProduct(product);
  return product.stock ?? 0;
}

export function isProductSoldOut(product) {
  if (allowsBackorder(product)) return false;
  return resolveProductStock(product) <= 0;
}

/** Max quantity selectable on product page (backorder allows ordering above stock). */
export function resolveOrderableQuantity(product) {
  if (allowsBackorder(product)) return 99;
  return Math.max(1, resolveProductStock(product));
}
