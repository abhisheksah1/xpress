import { Product, Category, DeliveryGroup } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizePersonalizationFields } from '../utils/personalization.js';
import {
  productTracksOptionInventory,
  syncProductStockFromOptions,
} from '../utils/optionInventory.js';
import * as deliveryService from './delivery.service.js';
import * as comboService from './combo.service.js';
import * as productImportService from './productImport.service.js';
import { productInCategoryFilter } from '../utils/productCategories.js';
import { enrichProductMedia } from '../utils/mediaUrl.js';

const withSyncedOptionStock = (data) => {
  if (!data || !productTracksOptionInventory(data)) return data;
  const next = { ...data };
  syncProductStockFromOptions(next);
  return next;
};

const PRODUCT_SORT_MAP = {
  newest: '-createdAt',
  oldest: 'createdAt',
  price_asc: 'price',
  price_desc: '-price',
  '-createdAt': '-createdAt',
  createdAt: 'createdAt',
  price: 'price',
  '-price': '-price',
};

const resolveProductSort = (sort) => PRODUCT_SORT_MAP[sort] || '-createdAt';

const withNormalizedPersonalization = (data) => {
  if (!data?.personalizationFields) return data;
  return {
    ...data,
    personalizationFields: normalizePersonalizationFields(data.personalizationFields),
  };
};

const stripUndefined = (obj = {}) => {
  const next = { ...obj };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined) delete next[key];
  });
  return next;
};

/** Text fields that must persist even when cleared to empty string. */
const applyProductContentFields = (product, data) => {
  const textFields = [
    'name',
    'slug',
    'sku',
    'description',
    'shortDescription',
    'longDescription',
    'additionalNote',
    'brand',
    'barcode',
    'productGroup',
    'skuVariant',
    'standardSize',
    'metaTitle',
    'metaDescription',
    'focusKeyword',
  ];
  for (const field of textFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      product[field] = data[field] == null ? '' : data[field];
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, 'shortDescriptionEnabled')) {
    product.shortDescriptionEnabled = Boolean(data.shortDescriptionEnabled);
  }
  if (Object.prototype.hasOwnProperty.call(data, 'metaKeywords')) {
    product.metaKeywords = Array.isArray(data.metaKeywords) ? data.metaKeywords : [];
  }
  if (data.seo && typeof data.seo === 'object') {
    const currentSeo = product.seo?.toObject?.() || product.seo || {};
    product.set('seo', { ...currentSeo, ...data.seo });
    product.markModified('seo');
  }
};

export const createProduct = async (data, userId) => {
  const prepared = withSyncedOptionStock(
    await comboService.prepareComboProductData(withNormalizedPersonalization(data))
  );
  const product = await Product.create({
    ...stripUndefined(prepared),
    createdBy: userId,
    updatedBy: userId,
  });
  return Product.findById(product._id).populate('comboItems.product', 'name slug sku price stock images');
};

export const updateProduct = async (id, data, userId) => {
  const existing = await Product.findById(id);
  if (!existing) throw new ApiError(404, 'Product not found');
  const prepared = withSyncedOptionStock(
    await comboService.prepareComboProductData(withNormalizedPersonalization(data), id)
  );
  const clean = stripUndefined(prepared);

  // Apply content/SEO explicitly so empty clears and nested seo always stick
  applyProductContentFields(existing, clean);

  const skipKeys = new Set([
    'name',
    'slug',
    'sku',
    'description',
    'shortDescription',
    'longDescription',
    'additionalNote',
    'brand',
    'barcode',
    'productGroup',
    'skuVariant',
    'standardSize',
    'metaTitle',
    'metaDescription',
    'focusKeyword',
    'metaKeywords',
    'seo',
    '_id',
    'id',
    'createdAt',
    'updatedAt',
    'createdBy',
    '__v',
  ]);

  Object.keys(clean).forEach((key) => {
    if (skipKeys.has(key)) return;
    existing[key] = clean[key];
  });

  if (clean.optionCategories) existing.markModified('optionCategories');
  if (clean.images) existing.markModified('images');
  if (clean.comboItems) existing.markModified('comboItems');
  if (clean.deliveryGroupRules) existing.markModified('deliveryGroupRules');
  if (clean.personalizationFields) existing.markModified('personalizationFields');
  if (clean.dimensions) existing.markModified('dimensions');

  existing.updatedBy = userId;
  if (productTracksOptionInventory(existing)) {
    syncProductStockFromOptions(existing);
  }
  await existing.save();
  if (!existing.isHamper) {
    await comboService.syncComboProductsContaining([existing._id]);
  }
  return Product.findById(existing._id).populate('comboItems.product', 'name slug sku price stock images');
};

export const getProducts = async ({
  page = 1,
  limit = 20,
  search,
  category,
  isActive,
  isFeatured,
  minPrice,
  maxPrice,
  stockStatus,
  composition,
  deliveryGroup,
  excludeId,
  forComboPicker,
  ids,
  sort = 'newest',
  fields,
}) => {
  const sortBy = resolveProductSort(sort);
  const isComboPicker = forComboPicker === 'true' || forComboPicker === true;
  const cardFields = fields === 'card' || fields === true;
  /** Lean fields for storefront product cards / grids — skip heavy CMS/SEO blobs. */
  const STOREFRONT_CARD_SELECT =
    'name slug sku price compareAtPrice stock images isHamper isFeatured isActive allowBackorder optionCategories variants personalizationFields shortDescription tags';
  const filter = {};
  const idList = Array.isArray(ids)
    ? ids.map(String).filter(Boolean)
    : String(ids || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (idList.length) {
    filter._id = { $in: idList };
  }
  if (isActive !== undefined && isActive !== '' && !isComboPicker) {
    filter.isActive = isActive === 'true' || isActive === true;
  }
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true' || isFeatured === true;
  if (category) {
    filter.$and = [...(filter.$and || []), productInCategoryFilter(category)];
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (stockStatus === 'in_stock') filter.stock = { $gt: 0 };
  if (stockStatus === 'out_of_stock') filter.stock = { $lte: 0 };
  if (stockStatus === 'low_stock') {
    filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    filter.stock = { $gt: 0 };
  }
  if (composition === 'hamper') {
    filter.$or = [{ isHamper: true }, { 'variants.0': { $exists: true } }, { tags: 'hamper' }];
  }
  if (composition === 'individual' || isComboPicker) {
    filter.isHamper = { $ne: true };
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] },
      { tags: { $nin: ['hamper'] } },
    ];
  }
  if (search) {
    const terms = search.trim().split(/\s+/).filter(Boolean);
    const termClause = (term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      return { $or: [{ name: regex }, { sku: regex }, { tags: regex }] };
    };

    const searchClause =
      terms.length <= 1
        ? termClause(terms[0] || search.trim())
        : { $and: terms.map(termClause) };

    if (filter.$or) {
      filter.$and = [...(filter.$and || []), { $or: filter.$or }, searchClause];
      delete filter.$or;
    } else {
      filter.$and = [...(filter.$and || []), searchClause];
    }
  }
  if (excludeId) {
    filter._id = idList.length
      ? { $in: idList.filter((id) => id !== String(excludeId)) }
      : { $ne: excludeId };
  }

  const skip = (page - 1) * limit;
  const preserveIdOrder = idList.length > 0;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  /** Category focus products — pinned first on PLP, no customer-facing badge. */
  let focusIds = [];
  if (category && !preserveIdOrder && !deliveryGroup) {
    const catDoc = await Category.findById(category).select('focusProductIds').lean();
    focusIds = [...new Set((catDoc?.focusProductIds || []).map(String).filter(Boolean))].slice(0, 10);
  }

  const listSelect = isComboPicker
    ? 'name slug sku price stock images isHamper isActive shortDescription description'
    : cardFields
      ? STOREFRONT_CARD_SELECT
      : undefined;

  const categoryPopulate = cardFields
    ? { path: 'category', select: 'name slug' }
    : { path: 'category', select: 'name slug deliveryScope deliveryGroupRules' };

  const buildListQuery = (queryFilter, { applySort = true, applySkip = 0, applyLimit = limitNum } = {}) => {
    let q = Product.find(queryFilter)
      .populate(categoryPopulate)
      .populate('categories', 'name slug')
      .select(listSelect);
    if (cardFields) q = q.lean();
    if (applySort) q = q.sort(sortBy);
    if (applySkip > 0) q = q.skip(applySkip);
    if (applyLimit != null) q = q.limit(applyLimit);
    return q;
  };

  if (deliveryGroup) {
    let query = Product.find(filter)
      .populate(categoryPopulate)
      .populate('categories', 'name slug');
    if (listSelect) query = query.select(listSelect);
    if (cardFields) query = query.lean();
    if (!preserveIdOrder) query = query.sort(sortBy);
    let products = await query;
    products = await deliveryService.filterProductsByGroup(products, deliveryGroup);
    if (preserveIdOrder) {
      const order = new Map(idList.map((id, i) => [id, i]));
      products.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    }
    const total = products.length;
    const paged = products.slice(skip, skip + limit);
    const synced = await comboService.refreshHamperStocksInList(paged);
    return {
      products: synced.map((p) => enrichProductMedia(p)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  if (focusIds.length) {
    const focusFilter = { $and: [filter, { _id: { $in: focusIds } }] };
    const focusDocs = await buildListQuery(focusFilter, { applySort: false, applySkip: 0, applyLimit: focusIds.length });
    const byId = new Map(focusDocs.map((p) => [String(p._id), p]));
    const focusOrdered = focusIds.map((id) => byId.get(id)).filter(Boolean);
    const focusIdSet = new Set(focusOrdered.map((p) => String(p._id)));
    const restFilter = { $and: [filter, { _id: { $nin: [...focusIdSet] } }] };
    const F = focusOrdered.length;

    const [restTotal, pageSlice] = await Promise.all([
      Product.countDocuments(filter),
      (async () => {
        if (pageNum === 1) {
          const restLimit = Math.max(0, limitNum - F);
          const rest = restLimit
            ? await buildListQuery(restFilter, { applySkip: 0, applyLimit: restLimit })
            : [];
          return [...focusOrdered, ...rest];
        }
        const restSkip = Math.max(0, (pageNum - 1) * limitNum - F);
        return buildListQuery(restFilter, { applySkip: restSkip, applyLimit: limitNum });
      })(),
    ]);

    const syncedProducts = await comboService.refreshHamperStocksInList(pageSlice);
    return {
      products: syncedProducts.map((p) => enrichProductMedia(p)),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: restTotal,
        pages: Math.ceil(restTotal / limitNum) || 1,
      },
    };
  }

  let listQuery = Product.find(filter)
    .populate(categoryPopulate)
    .populate('categories', 'name slug')
    .select(listSelect);
  if (cardFields) listQuery = listQuery.lean();
  if (!preserveIdOrder) {
    listQuery = listQuery.sort(sortBy).skip(skip).limit(limit);
  } else {
    listQuery = listQuery.limit(Math.max(Number(limit) || 20, idList.length));
  }

  const [products, total] = await Promise.all([
    listQuery,
    Product.countDocuments(filter),
  ]);

  let ordered = products;
  if (preserveIdOrder) {
    const order = new Map(idList.map((id, i) => [id, i]));
    ordered = [...products].sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    ordered = ordered.slice(skip, skip + Number(limit));
  }

  const syncedProducts = await comboService.refreshHamperStocksInList(ordered);

  return {
    products: syncedProducts.map((p) => enrichProductMedia(p)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getProductBySlug = async (slug, { deliveryGroup } = {}) => {
  const product = await Product.findOne({ slug, isActive: true })
    .populate('category', 'name slug deliveryScope deliveryGroupRules')
    .populate('categories', 'name slug')
    .populate('comboItems.product', 'name slug price images stock shortDescription description');
  if (!product) throw new ApiError(404, 'Product not found');

  const groups = await deliveryService.getDeliveryGroups();
  const deliveryInfo = deliveryService.attachDeliveryInfo(product, product.category, groups);

  const doc = product.toObject();

  if (product.isHamper && product.comboItems?.length) {
    const stock = comboService.resolveEffectiveStock(product);
    if (product.stock !== stock) {
      await Product.updateOne({ _id: product._id }, { stock });
    }
    doc.stock = stock;
  }

  doc.deliveryInfo = deliveryInfo;

  if (deliveryGroup) {
    const match = deliveryInfo.find((d) => String(d.groupId) === String(deliveryGroup));
    if (!match?.available) {
      doc.deliveryScheduleNote = 'This product may not meet the standard delivery schedule for the selected area. You can still place an order and our team will confirm.';
    }
  }

  return enrichProductMedia(doc);
};

export const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate('category', 'name slug deliveryScope deliveryGroupRules')
    .populate('categories', 'name slug deliveryScope deliveryGroupRules')
    .populate('comboItems.product', 'name slug sku price stock images isHamper shortDescription description')
    .populate('deliveryGroupRules.group', 'name code estimatedDays estimatedHours cutoffTime')
    .populate('deliveryZones', 'name code estimatedDeliveryLabel estimatedDays cutoffTime coverageLocations')
    .populate('deliveryGroups', 'name code estimatedDeliveryLabel estimatedDays cutoffTime');
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, 'Product not found');
};

export const bulkDeleteProducts = async (productIds) => {
  if (!productIds?.length) throw new ApiError(400, 'Product IDs required');

  const ids = [...new Set(productIds.map(String))];
  const result = await Product.deleteMany({ _id: { $in: ids } });

  return {
    deleted: result.deletedCount,
    requested: ids.length,
    notFound: Math.max(0, ids.length - result.deletedCount),
  };
};

export const bulkUpdatePrices = async ({ productIds, type, value }) => {
  if (!productIds?.length) throw new ApiError(400, 'Product IDs required');

  const products = await Product.find({ _id: { $in: productIds } });
  if (!products.length) throw new ApiError(404, 'No products found');

  const updates = products.map(async (product) => {
    let newPrice = product.price;
    if (type === 'percentage') {
      newPrice = product.price * (1 + value / 100);
    } else if (type === 'fixed') {
      newPrice = product.price + value;
    } else if (type === 'set') {
      newPrice = value;
    }
    product.price = Math.max(0, Math.round(newPrice));
    return product.save();
  });

  const results = await Promise.all(updates);
  return { updated: results.length, products: results };
};

export const getCategories = async (isActive, options = {}) => {
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive;

  const cardFields = options.fields === 'card';
  let categoryQuery = Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  if (cardFields) {
    categoryQuery = categoryQuery.select('name slug image sortOrder isActive createdAt parent');
  } else {
    categoryQuery = categoryQuery.populate('deliveryGroupRules.group', 'name province');
  }

  const categories = await categoryQuery;

  if (!options.withProductCount) return categories;

  const counts = await Product.aggregate([
    {
      $project: {
        cats: {
          $setUnion: [
            [{ $ifNull: ['$category', null] }],
            { $ifNull: ['$categories', []] },
          ],
        },
      },
    },
    { $unwind: '$cats' },
    { $match: { cats: { $ne: null } } },
    { $group: { _id: '$cats', productCount: { $sum: 1 } } },
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.productCount]));

  return categories.map((c) => ({
    ...c,
    productCount: countMap[String(c._id)] || 0,
  }));
};

export const createCategory = async (data) => Category.create(data);

export const updateCategory = async (id, data) => {
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');

  const { seo, focusProductIds, ...rest } = data || {};
  Object.keys(rest).forEach((key) => {
    if (rest[key] !== undefined) category[key] = rest[key];
  });
  if (focusProductIds !== undefined) {
    const ids = (Array.isArray(focusProductIds) ? focusProductIds : [])
      .map(String)
      .filter(Boolean)
      .slice(0, 10);
    category.focusProductIds = ids;
  }
  if (seo && typeof seo === 'object') {
    const currentSeo = category.seo?.toObject?.() || category.seo || {};
    category.set('seo', { ...currentSeo, ...seo });
    category.markModified('seo');
  }
  await category.save();
  return category;
};

export const deleteCategory = async (id, { reassignTo } = {}) => {
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');

  const productFilter = { $or: [{ category: id }, { categories: id }] };
  const count = await Product.countDocuments(productFilter);

  if (count > 0) {
    if (!reassignTo) {
      throw new ApiError(
        400,
        `This category has ${count} product(s). Choose another category to move them to, then delete.`
      );
    }
    if (String(reassignTo) === String(id)) {
      throw new ApiError(400, 'Choose a different category to reassign products');
    }
    const target = await Category.findById(reassignTo);
    if (!target) throw new ApiError(400, 'Target category for reassignment not found');

    await Product.updateMany({ category: id }, { $set: { category: reassignTo } });
    await Product.updateMany(
      { categories: id },
      { $pull: { categories: id }, $addToSet: { categories: reassignTo } }
    );
  }

  await DeliveryGroup.updateMany({ categories: id }, { $pull: { categories: id } });
  await Category.findByIdAndDelete(id);

  return { deleted: true, productsReassigned: count };
};

export const getCatalogStats = async () => {
  const [total, inStock, outOfStock, inactive] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ stock: { $gt: 0 }, isActive: true }),
    Product.countDocuments({ stock: { $lte: 0 }, isActive: true }),
    Product.countDocuments({ isActive: false }),
  ]);
  return { total, inStock, outOfStock, inactive, orderableOverrides: 0 };
};

export const cloneProduct = async (id, userId) => {
  const original = await Product.findById(id).lean();
  if (!original) throw new ApiError(404, 'Product not found');

  const { _id, createdAt, updatedAt, slug, sku, ...rest } = original;
  return Product.create({
    ...rest,
    name: `${rest.name} (Copy)`,
    isActive: false,
    createdBy: userId,
    updatedBy: userId,
  });
};

export const importProducts = async (items, userId) => productImportService.importProducts(items, userId);

export const importProductsFromCsv = async (csvText, userId) =>
  productImportService.importProductsFromCsv(csvText, userId);
