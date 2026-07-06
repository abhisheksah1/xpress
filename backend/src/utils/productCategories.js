/** Build a Mongo filter matching products in a category (primary or additional). */
export function productInCategoryFilter(categoryId) {
  if (!categoryId) return {};
  return {
    $or: [{ category: categoryId }, { categories: categoryId }],
  };
}

/** Deduplicate category ObjectIds while preserving order. */
export function dedupeCategoryIds(ids = []) {
  const seen = new Set();
  return ids.filter((id) => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** True if product belongs to category (primary or in categories[]). */
export function productHasCategory(product, categoryId) {
  const target = String(categoryId);
  if (String(product.category?._id || product.category) === target) return true;
  return (product.categories || []).some((c) => String(c?._id || c) === target);
}
