/**
 * Client-side helpers for option-level inventory
 * (Size M/L/XL, cake 1 lb / 2 lb, etc.).
 */

export function getInventoryTrackingCategories(product) {
  return (product?.optionCategories || []).filter((cat) => cat?.tracksInventory);
}

export function productTracksOptionInventory(product) {
  return getInventoryTrackingCategories(product).length > 0;
}

export function sumTrackedOptionStock(product) {
  let total = 0;
  for (const cat of getInventoryTrackingCategories(product)) {
    for (const opt of cat.options || []) {
      total += Number(opt.stock) || 0;
    }
  }
  return total;
}

export function resolveInventoryOption(product, selectedOptions = []) {
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
}

export function getLineAvailableStock(product, selectedOptions = []) {
  if (!product) return 0;
  if (productTracksOptionInventory(product)) {
    const resolved = resolveInventoryOption(product, selectedOptions);
    if (!resolved) return 0;
    return Number(resolved.option.stock) || 0;
  }
  return Number(product.stock) || 0;
}

export function formatSelectedOptionsLabel(selectedOptions = []) {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ');
}
