/**
 * Helpers for inventory tracked via Product.optionCategories
 * (e.g. Size M/L/XL, cake 1 lb / 2 lb). Non-tracking categories
 * (candles, knife, etc.) only affect price.
 */

export const getInventoryTrackingCategories = (product) =>
  (product?.optionCategories || []).filter((cat) => cat?.tracksInventory);

export const productTracksOptionInventory = (product) =>
  getInventoryTrackingCategories(product).length > 0;

/** Sum of option stocks for all inventory-tracking categories (list/low-stock display). */
export const sumTrackedOptionStock = (product) => {
  let total = 0;
  for (const cat of getInventoryTrackingCategories(product)) {
    for (const opt of cat.options || []) {
      total += Number(opt.stock) || 0;
    }
  }
  return total;
};

/**
 * Resolve the inventory option from selectedOptions [{ category, label }, ...].
 * Uses the first tracksInventory category that has a matching selection.
 */
export const resolveInventoryOption = (product, selectedOptions = []) => {
  const tracking = getInventoryTrackingCategories(product);
  if (!tracking.length) return null;

  const selections = Array.isArray(selectedOptions) ? selectedOptions : [];

  for (const cat of tracking) {
    const catName = String(cat.name || '').trim().toLowerCase();
    const match = selections.find(
      (s) => String(s.category || '').trim().toLowerCase() === catName
    );
    if (!match) continue;

    const label = String(match.label || '').trim().toLowerCase();
    const option = (cat.options || []).find(
      (o) => String(o.label || '').trim().toLowerCase() === label
    );
    if (option) {
      return { category: cat, option, categoryName: cat.name, label: option.label };
    }
  }

  return null;
};

/** Available units for a line (variant → option stock → product stock). */
export const getLineAvailableStock = (product, { variantId, selectedOptions } = {}) => {
  if (!product) return 0;

  if (variantId && product.variants?.id) {
    const variant = product.variants.id(variantId);
    if (variant) return Number(variant.stock) || 0;
  }

  if (productTracksOptionInventory(product)) {
    const resolved = resolveInventoryOption(product, selectedOptions);
    if (!resolved) return 0;
    return Number(resolved.option.stock) || 0;
  }

  return Number(product.stock) || 0;
};

/** Keep product.stock in sync when option-level inventory is used. */
export const syncProductStockFromOptions = (product) => {
  if (!productTracksOptionInventory(product)) return product.stock;
  product.stock = sumTrackedOptionStock(product);
  return product.stock;
};

export const formatSelectedOptionsLabel = (selectedOptions = []) => {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ');
};
