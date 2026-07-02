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
  const product = await Product.findById(id).populate('category', 'name slug');
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
