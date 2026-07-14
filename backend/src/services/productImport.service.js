import { Product, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { generateSlug } from '../utils/helpers.js';
import { parseCsv } from '../utils/csvParser.js';
import { mapCsvRowToProduct } from '../utils/productCsvMapper.js';
import { dedupeCategoryIds } from '../utils/productCategories.js';
import { normalizeImportedProductHtml } from '../utils/productHtml.js';
import * as comboService from './combo.service.js';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function resolveOrCreateCategories(categoryNames, { cache, created }) {
  const ids = [];

  for (const rawName of categoryNames) {
    const name = rawName.trim();
    if (!name) continue;

    const cacheKey = name.toLowerCase();
    if (cache.has(cacheKey)) {
      ids.push(cache.get(cacheKey)._id);
      continue;
    }

    let category = await Category.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (!category) {
      category = await Category.create({ name });
      created.add(category.name);
    }

    cache.set(cacheKey, category);
    ids.push(category._id);
  }

  return ids;
}

/**
 * Existing product identity:
 * 1) SKU match (strong) — update that product
 * 2) Explicit CSV slug match — update that product
 * Auto-generated name slugs must NOT overwrite another product; create a unique slug instead.
 */
async function findExistingProduct(mapped, { slugWasExplicit }) {
  if (mapped.sku) {
    const bySku = await Product.findOne({ sku: mapped.sku });
    if (bySku) return bySku;
  }
  if (slugWasExplicit && mapped.slug) {
    const bySlug = await Product.findOne({ slug: mapped.slug.toLowerCase() });
    if (bySlug) return bySlug;
  }
  return null;
}

async function ensureUniqueSlug(baseSlug, usedInBatch) {
  const normalized =
    String(baseSlug || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'product';
  let slug = normalized;
  let n = 2;
  while (usedInBatch.has(slug) || (await Product.exists({ slug }))) {
    slug = `${normalized}-${n}`;
    n += 1;
  }
  usedInBatch.add(slug);
  return slug;
}

function buildProductPayload(mapped, categoryIds, userId) {
  const uniqueCategoryIds = dedupeCategoryIds(categoryIds);
  if (!uniqueCategoryIds.length) {
    throw new Error('At least one category is required (product_category column)');
  }

  const payload = {
    name: mapped.name,
    slug: mapped.slug,
    sku: mapped.sku,
    barcode: mapped.barcode,
    productGroup: mapped.productGroup,
    skuVariant: mapped.skuVariant,
    standardSize: mapped.standardSize,
    price: mapped.price,
    compareAtPrice: mapped.compareAtPrice,
    costPrice: mapped.costPrice,
    stock: mapped.stock,
    weight: mapped.weight,
    allowBackorder: mapped.allowBackorder,
    isActive: mapped.isActive,
    category: uniqueCategoryIds[0],
    categories: uniqueCategoryIds,
    tags: mapped.tags,
    shortDescriptionEnabled: false,
    updatedBy: userId,
  };

  if (mapped.description) payload.description = mapped.description;
  if (mapped.shortDescription) payload.shortDescription = mapped.shortDescription;
  if (mapped.longDescription) {
    payload.longDescription = normalizeImportedProductHtml(mapped.longDescription) || mapped.longDescription;
  }

  if (mapped.images?.length) {
    payload.images = mapped.images;
  }

  return payload;
}

export async function importProductRows(rows, userId) {
  if (!rows?.length) throw new ApiError(400, 'No products to import');

  const categoryCache = new Map();
  const categoriesCreated = new Set();
  const usedSlugs = new Set();
  const usedSkus = new Set();
  const results = {
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: [],
    categoriesCreated: [],
    categoriesMapped: 0,
  };

  for (const row of rows) {
    const slugWasExplicit = Boolean(String(row.slug || '').trim());
    const mapped =
      typeof row.name !== 'undefined' && !row.product_name
        ? normalizeLegacyRow(row)
        : mapCsvRowToProduct(row);

    if (!mapped) {
      results.skipped += 1;
      results.failed.push({ row: row._row || '?', name: '', error: 'Missing product name' });
      continue;
    }

    try {
      if (mapped.sku) {
        const skuKey = String(mapped.sku).trim().toLowerCase();
        if (usedSkus.has(skuKey)) {
          throw new Error(`Duplicate SKU in CSV: ${mapped.sku}`);
        }
        usedSkus.add(skuKey);
      }

      const categoryIds = await resolveOrCreateCategories(mapped.categoryNames, {
        cache: categoryCache,
        created: categoriesCreated,
      });
      results.categoriesMapped += categoryIds.length;

      const existing = await findExistingProduct(mapped, { slugWasExplicit });

      if (existing) {
        if (!slugWasExplicit) {
          mapped.slug = existing.slug;
          usedSlugs.add(existing.slug);
        } else {
          mapped.slug = await ensureUniqueSlug(mapped.slug, usedSlugs);
        }

        const payload = buildProductPayload(mapped, categoryIds, userId);
        if (!payload.images?.length) delete payload.images;
        if (!payload.sku) delete payload.sku;
        delete payload.description;
        delete payload.shortDescription;
        if (!mapped.longDescription) delete payload.longDescription;
        if (!slugWasExplicit) delete payload.slug;

        await Product.findByIdAndUpdate(existing._id, payload, { runValidators: true });
        if (payload.stock !== undefined) {
          await comboService.syncComboProductsContaining([existing._id]);
        }
        results.updated += 1;
      } else {
        mapped.slug = await ensureUniqueSlug(mapped.slug || generateSlug(mapped.name), usedSlugs);
        const payload = buildProductPayload(mapped, categoryIds, userId);
        await Product.create({ ...payload, createdBy: userId });
        results.created += 1;
      }
    } catch (err) {
      results.failed.push({
        row: mapped.rowNumber || row._row || '?',
        name: mapped.name,
        error: err.message,
      });
    }
  }

  results.categoriesCreated = [...categoriesCreated];
  return results;
}

function normalizeLegacyRow(row) {
  return {
    rowNumber: row._row,
    name: row.name,
    slug: row.slug || generateSlug(row.name),
    sku: row.sku || undefined,
    price: Number(row.price) || 0,
    compareAtPrice: row.compareAtPrice ? Number(row.compareAtPrice) : undefined,
    stock: row.stock !== undefined ? Number(row.stock) : 0,
    isActive: row.isActive !== 'false' && row.isActive !== false,
    categoryNames: row.categoryName ? [row.categoryName] : row.categoryNames || [],
    description: row.description,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription || row.description,
    images: row.images || [],
    tags: row.tags ? String(row.tags).split('|').map((t) => t.trim()).filter(Boolean) : [],
    allowBackorder: false,
  };
}

export async function importProductsFromCsv(csvText, userId) {
  const rows = parseCsv(csvText);
  if (!rows.length) throw new ApiError(400, 'CSV file is empty or invalid');
  return importProductRows(rows, userId);
}

export async function importProducts(items, userId) {
  if (!items?.length) throw new ApiError(400, 'No products to import');
  return importProductRows(items, userId);
}
