import { generateSlug } from './helpers.js';

const truthy = (value) => ['y', 'yes', 'true', '1', 'active', 'published'].includes(String(value || '').trim().toLowerCase());

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : undefined;
};

const pick = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
};

export function splitCategoryNames(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,|]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export function splitImageUrls(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,|]/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => {
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('//')) return `https:${url}`;
      return '';
    })
    .filter(Boolean);
}

/** Map a normalized CSV row to internal product import shape. */
export function mapCsvRowToProduct(row) {
  const name = pick(row, 'product_name', 'name', 'title');
  if (!name) return null;

  const categoryRaw = pick(row, 'product_category', 'category', 'categories', 'catalog_section');
  const categoryNames = splitCategoryNames(categoryRaw);
  const slug = pick(row, 'slug') || generateSlug(name);
  const sku = pick(row, 'sku');
  const price = parseNumber(pick(row, 'price', 'standard_rate'));
  const compareAtPrice = parseNumber(pick(row, 'crossed_price', 'compare_at_price', 'compareatprice'));
  const costPrice = parseNumber(pick(row, 'your_buying_price', 'cost_price', 'costprice'));
  const stock = parseNumber(pick(row, 'quantity', 'stock', 'qty'));
  const weight = parseNumber(pick(row, 'weight'));
  const statusRaw = pick(row, 'status', 'isactive', 'is_active');
  const sellAfterOos = pick(row, 'sell_after_out_of_stock', 'sell_after_outof_stock', 'allow_backorder');
  const imageUrls = splitImageUrls(pick(row, 'images', 'image', 'image_url'));
  const longDescription = pick(row, 'product_description', 'description', 'long_description', 'longdescription');

  return {
    rowNumber: row._row,
    name,
    slug: slug.toLowerCase(),
    sku: sku || undefined,
    barcode: pick(row, 'barcode') || undefined,
    productGroup: pick(row, 'group', 'product_group') || undefined,
    skuVariant: pick(row, 'variant', 'sku_variant') || undefined,
    standardSize: pick(row, 'size', 'standard_size') || undefined,
    price: price ?? 0,
    compareAtPrice: compareAtPrice > 0 ? compareAtPrice : undefined,
    costPrice: costPrice > 0 ? costPrice : undefined,
    stock: stock ?? 0,
    weight,
    allowBackorder: truthy(sellAfterOos),
    isActive: statusRaw ? truthy(statusRaw) : true,
    categoryNames,
    images: imageUrls.map((url, index) => ({
      url,
      isPrimary: index === 0,
      sortOrder: index,
      alt: name,
    })),
    tags: pick(row, 'tags') ? String(pick(row, 'tags')).split('|').map((t) => t.trim()).filter(Boolean) : [],
    longDescription: longDescription || undefined,
  };
}

export const PRODUCT_CSV_TEMPLATE_HEADERS = [
  'product_name',
  'price',
  'crossed_price',
  'your_buying_price',
  'quantity',
  'weight',
  'sku',
  'barcode',
  'sell_after_out_of_stock',
  'group',
  'variant',
  'size',
  'slug',
  'status',
  'created_at',
  'product_category',
  'images',
  'product_description',
];
