/** Unique categories linked to a product (primary + additional). */
export function getProductCategoryLinks(product) {
  const list = [];
  const seen = new Set();

  const add = (cat) => {
    if (!cat) return;
    const id = cat._id || cat;
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      _id: id,
      name: cat.name || String(cat),
      slug: cat.slug,
    });
  };

  add(product?.category);
  (product?.categories || []).forEach(add);
  return list;
}
