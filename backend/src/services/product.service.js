import { Product, Category } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const createProduct = async (data, userId) => {
  const product = await Product.create({ ...data, createdBy: userId, updatedBy: userId });
  return product;
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
  sort = '-createdAt',
}) => {
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true' || isFeatured === true;
  if (category) filter.category = category;
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
  if (composition === 'individual') {
    filter.isHamper = { $ne: true };
    filter.variants = { $size: 0 };
    filter.tags = { $ne: 'hamper' };
  }
  if (search) filter.$text = { $search: search };

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, isActive: true }).populate('category', 'name slug');
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const getProductById = async (id) => {
  const product = await Product.findById(id)
    .populate('category', 'name slug')
    .populate('categories', 'name slug')
    .populate('deliveryZones', 'name province');
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const updateProduct = async (id, data, userId) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw new ApiError(404, 'Product not found');
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

export const getCategories = async (isActive) => {
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive;
  return Category.find(filter).sort({ sortOrder: 1, name: 1 });
};

export const createCategory = async (data) => Category.create(data);

export const updateCategory = async (id, data) => {
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
};

export const deleteCategory = async (id) => {
  const count = await Product.countDocuments({ category: id });
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

export const importProducts = async (items, userId) => {
  if (!items?.length) throw new ApiError(400, 'No products to import');

  const results = { created: 0, failed: [] };
  for (const [index, item] of items.entries()) {
    try {
      const category = await Category.findOne({
        $or: [{ _id: item.category }, { name: new RegExp(`^${item.categoryName}$`, 'i') }],
      });
      if (!category) throw new Error(`Category not found: ${item.categoryName || item.category}`);

      await Product.create({
        name: item.name,
        sku: item.sku || undefined,
        description: item.description,
        shortDescription: item.shortDescription,
        category: category._id,
        price: Number(item.price),
        compareAtPrice: item.compareAtPrice ? Number(item.compareAtPrice) : undefined,
        stock: item.stock !== undefined ? Number(item.stock) : 0,
        isActive: item.isActive !== 'false' && item.isActive !== false,
        tags: item.tags ? String(item.tags).split('|').map((t) => t.trim()) : [],
        createdBy: userId,
        updatedBy: userId,
      });
      results.created += 1;
    } catch (err) {
      results.failed.push({ row: index + 1, name: item.name, error: err.message });
    }
  }
  return results;
};
