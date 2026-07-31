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

function productTracksOptionInventory(product) {
  return (product?.optionCategories || []).some((cat) => cat?.tracksInventory);
}

function sumTrackedOptionStock(product) {
  let total = 0;
  for (const cat of product?.optionCategories || []) {
    if (!cat?.tracksInventory) continue;
    for (const opt of cat.options || []) {
      total += Number(opt.stock) || 0;
    }
  }
  return total;
}

/** Total catalog stock (sum of variation stocks when inventory is per-option). */
export function resolveProductStock(product) {
  if (!product) return 0;
  if (product.isHamper) return computeComboStockFromProduct(product);
  if (productTracksOptionInventory(product)) return sumTrackedOptionStock(product);
  return product.stock ?? 0;
}

/** Stock for a specific option selection (purchase/sale line). */
export function resolveLineStock(product, selectedOptions = []) {
  if (!product) return 0;
  if (product.isHamper) return computeComboStockFromProduct(product);
  if (!productTracksOptionInventory(product)) return product.stock ?? 0;

  const tracking = (product.optionCategories || []).filter((c) => c.tracksInventory);
  const selections = Array.isArray(selectedOptions) ? selectedOptions : [];
  for (const cat of tracking) {
    const catName = String(cat.name || '').trim().toLowerCase();
    const match = selections.find((s) => String(s.category || '').trim().toLowerCase() === catName);
    if (!match) continue;
    const label = String(match.label || '').trim().toLowerCase();
    const option = (cat.options || []).find((o) => String(o.label || '').trim().toLowerCase() === label);
    if (option) return Number(option.stock) || 0;
  }
  return 0;
}

export function isProductSoldOut(product) {
  if (allowsBackorder(product)) return false;
  return resolveProductStock(product) <= 0;
}

/** Max quantity selectable on product page (backorder allows ordering above stock). */
export function resolveOrderableQuantity(product, selectedOptions) {
  if (allowsBackorder(product)) return 99;
  const stock =
    selectedOptions != null
      ? resolveLineStock(product, selectedOptions)
      : resolveProductStock(product);
  return Math.max(1, stock);
}
