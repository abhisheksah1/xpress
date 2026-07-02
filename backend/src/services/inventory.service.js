import { Product, InventoryLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const adjustStock = async ({ productId, variantId, type, quantity, reason, reference, userId }) => {
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  let previousStock;
  let newStock;

  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) throw new ApiError(404, 'Variant not found');
    previousStock = variant.stock;
    newStock = calculateNewStock(previousStock, type, quantity);
    variant.stock = newStock;
  } else {
    previousStock = product.stock;
    newStock = calculateNewStock(previousStock, type, quantity);
    product.stock = newStock;
  }

  await product.save();

  const log = await InventoryLog.create({
    product: productId,
    variantId,
    type,
    quantity,
    previousStock,
    newStock,
    reason,
    reference,
    performedBy: userId,
  });

  return { product, log };
};

const calculateNewStock = (current, type, quantity) => {
  switch (type) {
    case 'in':
    case 'return':
      return current + quantity;
    case 'out':
      return Math.max(0, current - quantity);
    case 'adjustment':
      return quantity;
    default:
      throw new ApiError(400, 'Invalid inventory type');
  }
};

export const getInventoryLogs = async ({ page = 1, limit = 20, productId }) => {
  const filter = {};
  if (productId) filter.product = productId;

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('product', 'name sku')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InventoryLog.countDocuments(filter),
  ]);

  return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getLowStockProducts = async (threshold) => {
  return Product.find({
    isActive: true,
    $or: [
      { stock: { $lte: threshold || 5 } },
      { $expr: { $lte: ['$stock', '$lowStockThreshold'] } },
    ],
  })
    .populate('category', 'name')
    .sort({ stock: 1 });
};
