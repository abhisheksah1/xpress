export function getComboItemUnitPrice(item) {
  const base = Number(item?.product?.price ?? item?.productData?.price ?? 0) || 0;
  const adjustment = (item?.selectedOptions || []).reduce(
    (sum, opt) => sum + (Number(opt?.priceAdjustment) || 0),
    0
  );
  return base + adjustment;
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
      selectedOptions: (item.selectedOptions || [])
        .map((opt) => ({
          category: String(opt.category || '').trim(),
          label: String(opt.label || '').trim(),
          priceAdjustment: Number(opt.priceAdjustment) || 0,
        }))
        .filter((opt) => opt.category && opt.label),
    }))
    .map((item) => (
      item.selectedOptions?.length
        ? item
        : { product: item.product, quantity: item.quantity, sortOrder: item.sortOrder }
    ))
    .filter((item) => item.product);
}

/** True when product has customer-facing option categories (variable product). */
export function productHasVariations(product) {
  return (product?.optionCategories || []).some((cat) => (cat.options || []).length > 0);
}

/** Build default option picks (first option in each category). */
export function defaultSelectedOptionsForProduct(product) {
  return (product?.optionCategories || [])
    .map((cat) => {
      const opt = cat.options?.[0];
      if (!opt) return null;
      return {
        category: cat.name,
        label: opt.label,
        priceAdjustment: Number(opt.priceAdjustment) || 0,
      };
    })
    .filter(Boolean);
}

export function resolveComboItemStock(item) {
  const product = item?.productData || item?.product;
  if (!product || typeof product !== 'object') return 0;
  if (product.allowBackorder === true || product.allowBackorder === 'true') return 9999;

  const tracking = (product.optionCategories || []).filter((c) => c.tracksInventory);
  if (tracking.length && item?.selectedOptions?.length) {
    let min = Infinity;
    for (const cat of tracking) {
      const catName = String(cat.name || '').trim().toLowerCase();
      const match = item.selectedOptions.find(
        (s) => String(s.category || '').trim().toLowerCase() === catName
      );
      if (!match) return 0;
      const label = String(match.label || '').trim().toLowerCase();
      const option = (cat.options || []).find(
        (o) => String(o.label || '').trim().toLowerCase() === label
      );
      min = Math.min(min, Number(option?.stock) || 0);
    }
    return min === Infinity ? 0 : min;
  }

  if (tracking.length) {
    return (product.optionCategories || [])
      .filter((c) => c.tracksInventory)
      .reduce((sum, cat) => sum + (cat.options || []).reduce((s, o) => s + (Number(o.stock) || 0), 0), 0);
  }

  return Number(product.stock) || 0;
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

function componentAllowsBackorder(component) {
  return component?.allowBackorder === true || component?.allowBackorder === 'true';
}

export function allowsBackorder(product) {
  if (product?.allowBackorder === true || product?.allowBackorder === 'true') return true;
  if (!product?.isHamper || !product.comboItems?.length) return false;

  const components = product.comboItems
    .map((item) => getLinkedProductSummary(item))
    .filter((p) => p && typeof p === 'object');

  if (!components.length) return false;
  return components.every((c) => componentAllowsBackorder(c));
}

export function optionsForComboComponent(selectedOptions = [], component) {
  if (!component?._id) return [];
  const selections = Array.isArray(selectedOptions) ? selectedOptions : [];
  const componentId = String(component._id);
  const prefix = `${String(component.name || '').trim()} · `;
  const nativeNames = new Set(
    (component.optionCategories || []).map((c) => String(c.name || '').trim().toLowerCase())
  );

  return selections
    .map((sel) => {
      const category = String(sel.category || '').trim();
      const label = String(sel.label || '').trim();
      if (!label) return null;

      if (sel.componentId && String(sel.componentId) === componentId) {
        const native = category.startsWith(prefix) ? category.slice(prefix.length).trim() : category;
        return { category: native, label, priceAdjustment: Number(sel.priceAdjustment) || 0 };
      }

      if (prefix && category.startsWith(prefix)) {
        return {
          category: category.slice(prefix.length).trim(),
          label,
          priceAdjustment: Number(sel.priceAdjustment) || 0,
        };
      }

      if (nativeNames.has(category.toLowerCase())) {
        return { category, label, priceAdjustment: Number(sel.priceAdjustment) || 0 };
      }

      return null;
    })
    .filter(Boolean);
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

function resolveComponentStock(component, selectedOptions = []) {
  if (!component || typeof component !== 'object') return 0;
  if (productTracksOptionInventory(component)) {
    const componentOpts = optionsForComboComponent(selectedOptions, component);
    if (componentOpts.length) {
      return resolveLineStockForSimple(component, componentOpts);
    }
  }
  return Number(component.stock) || 0;
}

function resolveLineStockForSimple(product, selectedOptions = []) {
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

export function hasOutOfStockComboComponent(product, selectedOptions = []) {
  if (!product?.isHamper || !product.comboItems?.length) return false;
  if (allowsBackorder(product) && product.allowBackorder) return false;

  return product.comboItems.some((item) => {
    const component = getLinkedProductSummary(item);
    if (!component || typeof component !== 'object') return true;
    if (componentAllowsBackorder(component)) return false;
    const needed = getComboItemQuantity(item);
    const itemOptions = item.selectedOptions?.length ? item.selectedOptions : selectedOptions;
    return resolveComponentStock(component, itemOptions) < needed;
  });
}

export function computeComboStockFromProduct(product, selectedOptions = []) {
  if (!product?.isHamper || !product.comboItems?.length) return product?.stock ?? 0;
  if (hasOutOfStockComboComponent(product, selectedOptions)) return 0;

  let min = Infinity;
  let hasHardLimit = false;

  for (const item of product.comboItems) {
    const component = getLinkedProductSummary(item);
    if (!component || typeof component !== 'object') continue;
    if (componentAllowsBackorder(component)) continue;

    const qty = getComboItemQuantity(item);
    const itemOptions = item.selectedOptions?.length ? item.selectedOptions : selectedOptions;
    const stock = resolveComponentStock(component, itemOptions);
    const bundles = Math.floor(stock / qty);
    min = Math.min(min, bundles);
    hasHardLimit = true;
  }

  if (!hasHardLimit) return 99;
  return min === Infinity ? 0 : Math.max(0, min);
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
  if (product.isHamper) return computeComboStockFromProduct(product, selectedOptions);
  return resolveLineStockForSimple(product, selectedOptions);
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
