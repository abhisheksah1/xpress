import { Order } from '../../models/index.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const [totalOrders, pendingOrders, totalProducts, lowStockCount, recentOrders] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    import('../../models/index.js').then((m) => m.Product.countDocuments({ isActive: true })),
    import('../../services/inventory.service.js').then((s) => s.getLowStockProducts()),
    Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const revenue = await Order.aggregate([
    { $match: { 'payment.status': 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  res.json(
    new ApiResponse(200, {
      stats: {
        totalOrders,
        pendingOrders,
        totalProducts,
        lowStockCount: lowStockCount.length,
        totalRevenue: revenue[0]?.total || 0,
      },
      recentOrders,
    })
  );
});
