import { Product, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizePersonalizationFields } from '../utils/personalization.js';
import * as deliveryService from './delivery.service.js';
import * as comboService from './combo.service.js';
import * as productImportService from './productImport.service.js';
import { productInCategoryFilter } from '../utils/productCategories.js';
import { enrichProductMedia } from '../utils/mediaUrl.js';

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

export const createProduct = async (data, userId) => {
  const prepared = await comboService.prepareComboProductData(withNormalizedPersonalization(data));
  const product = await Product.create({ ...prepared, createdBy: userId, updatedBy: userId });
  return Product.findById(product._id).populate('comboItems.product', 'name slug sku price stock images');
};

export const updateProduct = async (id, data, userId) => {
  const existing = await Product.findById(id).select('isHamper');
  const prepared = await comboService.prepareComboProductData(withNormalizedPersonalization(data), id);
  const product = await Product.findByIdAndUpdate(
    id,
    { ...prepared, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');
  if (existing && !existing.isHamper && !product.isHamper) {
    await comboService.syncComboProductsContaining([product._id]);
  }
  return Product.findById(product._id).populate('comboItems.product', 'name slug sku price stock images');
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
  sort = 'newest',
}) => {
  const sortBy = resolveProductSort(sort);
  const isComboPicker = forComboPicker === 'true' || forComboPicker === true;
  const filter = {};
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
  if (excludeId) filter._id = { $ne: excludeId };

  const skip = (page - 1) * limit;

  if (deliveryGroup) {
    let products = await Product.find(filter)
      .populate('category', 'name slug deliveryScope deliveryGroupRules')
      .populate('categories', 'name slug')
      .sort(sortBy);
    products = await deliveryService.filterProductsByGroup(products, deliveryGroup);
    const total = products.length;
    const paged = products.slice(skip, skip + limit);
    return { products: paged, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug deliveryScope deliveryGroupRules')
      .populate('categories', 'name slug')
      .select(isComboPicker ? 'name slug sku price stock images isHamper isActive shortDescription description' : undefined)
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  const syncedProducts = await comboService.refreshHamperStocksInList(products);

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

  const categories = await Category.find(filter)
    .populate('deliveryGroupRules.group', 'name province')
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  if (!options.withProductCount) return categories;

  const counts = await Product.aggregate([
    { $match: { isActive: true } },
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
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
};

export const deleteCategory = async (id) => {
  const count = await Product.countDocuments({
    $or: [{ category: id }, { categories: id }],
  });
  if (count > 0) throw new ApiError(400, 'Cannot delete category with products');
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new ApiError(404, 'Category not found');
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
