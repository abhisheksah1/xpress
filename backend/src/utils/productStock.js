import {
  getLineAvailableStock,
  productTracksOptionInventory,
  resolveInventoryOption,
} from './optionInventory.js';

export const allowsBackorder = (product) => product?.allowBackorder === true;

/**
 * Combo can sell when OOS if the hamper itself allows backorder, or every
 * associated component allows backorder (inherits component sell-after-OOS).
 */
export const comboAllowsBackorder = (product) => {
  if (allowsBackorder(product)) return true;
  if (!product?.isHamper || !product.comboItems?.length) return false;

  const components = product.comboItems
    .map((item) => item.product)
    .filter((p) => p && typeof p === 'object');

  if (!components.length) return false;
  return components.every((c) => allowsBackorder(c));
};

export const effectiveAllowsBackorder = (product) =>
  allowsBackorder(product) || comboAllowsBackorder(product);

/** Namespace component option category names on the combo PDP / cart line. */
export const comboOptionCategoryLabel = (componentName, categoryName) =>
  `${String(componentName || 'Item').trim()} · ${String(categoryName || '').trim()}`;

/**
 * Map selectedOptions on a combo line back to a component's native category names.
 */
export const optionsForComboComponent = (selectedOptions = [], component) => {
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
        const native =
          category.startsWith(prefix) ? category.slice(prefix.length).trim() : category;
        return {
          category: native,
          label,
          priceAdjustment: Number(sel.priceAdjustment) || 0,
        };
      }

      if (prefix && category.startsWith(prefix)) {
        return {
          category: category.slice(prefix.length).trim(),
          label,
          priceAdjustment: Number(sel.priceAdjustment) || 0,
        };
      }

      if (nativeNames.has(category.toLowerCase())) {
        return {
          category,
          label,
          priceAdjustment: Number(sel.priceAdjustment) || 0,
        };
      }

      return null;
    })
    .filter(Boolean);
};

/**
 * Flatten associated product option categories onto a hamper for storefront UI.
 * Skips components that already have admin-fixed selectedOptions on the combo item.
 */
export const mapComboOptionCategories = (product) => {
  if (!product?.isHamper || !product.comboItems?.length) {
    return product?.optionCategories || [];
  }

  const own = Array.isArray(product.optionCategories) ? [...product.optionCategories] : [];
  const mapped = [];

  for (const item of product.comboItems) {
    const component = item.product;
    if (!component || typeof component !== 'object') continue;
    // Admin already locked the variation(s) for this component
    if (item.selectedOptions?.length) continue;

    const cats = component.optionCategories || [];
    if (!cats.length) continue;

    cats.forEach((cat, index) => {
      const sourceId = String(component._id);
      const catId = cat._id ? String(cat._id) : `combo-${sourceId}-${index}`;
      mapped.push({
        ...((typeof cat.toObject === 'function' ? cat.toObject() : cat) || {}),
        _id: catId,
        name: comboOptionCategoryLabel(component.name, cat.name),
        sourceProductId: sourceId,
        sourceProductName: component.name,
        sourceCategoryName: cat.name,
        sourceAllowBackorder: allowsBackorder(component),
      });
    });
  }

  return [...own, ...mapped];
};

export const getComponentAvailableStock = (component, selectedOptions = []) => {
  if (!component) return 0;
  if (productTracksOptionInventory(component)) {
    const componentOpts = optionsForComboComponent(selectedOptions, component);
    if (componentOpts.length) {
      return getLineAvailableStock(component, { selectedOptions: componentOpts });
    }
  }
  return Number(component.stock) || 0;
};

export const isPurchasableStock = (product, quantity = 1) => {
  if (!product) return false;
  if (effectiveAllowsBackorder(product)) return true;
  return (product.stock ?? 0) >= quantity;
};
