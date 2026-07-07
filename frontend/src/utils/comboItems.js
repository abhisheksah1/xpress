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
