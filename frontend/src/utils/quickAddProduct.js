import toast from 'react-hot-toast';
import { isProductSoldOut, resolveProductStock } from './comboItems.js';
import { normalizePersonalizationFields } from './personalization.js';

export function optionsKey(selectedOptions) {
  if (!selectedOptions?.length) return '';
  return selectedOptions
    .map((o) => `${o.category}:${o.label}`)
    .sort()
    .join('|');
}

export function buildDefaultSelectedOptions(product) {
  const selectedOptions = [];
  let priceAdjustment = 0;

  (product.optionCategories || []).forEach((cat) => {
    const chosen = cat.options?.[0];
    if (!chosen) return;
    selectedOptions.push({
      category: cat.name,
      label: chosen.label,
      priceAdjustment: chosen.priceAdjustment || 0,
    });
    priceAdjustment += chosen.priceAdjustment || 0;
  });

  return {
    selectedOptions,
    priceAdjustment,
    optionsKey: optionsKey(selectedOptions),
  };
}

export function hasRequiredPersonalization(personalizationFields = {}) {
  const normalized = normalizePersonalizationFields(personalizationFields);
  return Object.values(normalized).some((field) => field.enabled && field.required);
}

export function canQuickAddProduct(product) {
  if (!product) return false;
  if (isProductSoldOut(product)) return false;
  if (product.variants?.length > 0) return false;
  if (hasRequiredPersonalization(product.personalizationFields)) return false;
  return true;
}

export function quickAddProductToCart(addItem, product) {
  if (!product) return false;

  if (isProductSoldOut(product)) {
    toast.error('This item is out of stock');
    return false;
  }

  if (!canQuickAddProduct(product)) {
    toast.error('Open the product page to choose options');
    return false;
  }

  const { selectedOptions, priceAdjustment, optionsKey: oKey } = buildDefaultSelectedOptions(product);
  const unitPrice = Number(product.price || 0) + priceAdjustment;

  addItem(
    {
      _id: product._id,
      name: product.name,
      price: unitPrice,
      images: product.images,
      selectedOptions,
      optionsKey: oKey,
    },
    1,
    null
  );

  toast.success('Added to basket');
  return true;
}
