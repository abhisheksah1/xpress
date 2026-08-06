import { Order } from '../../models/index.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getDeployInfo } from '../../utils/deployInfo.js';
import { getVisitStatsForDashboard } from '../../services/visit.service.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const [totalOrders, pendingOrders, totalProducts, lowStockCount, recentOrders, visits] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: 'pending' }),
    import('../../models/index.js').then((m) => m.Product.countDocuments({ isActive: true })),
    import('../../services/inventory.service.js').then((s) => s.getLowStockProducts()),
    Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10),
    getVisitStatsForDashboard(),
  ]);

  const revenue = await Order.aggregate([
    { $match: { 'payment.status': 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);

  const deploy = getDeployInfo();

  res.json(
    new ApiResponse(200, {
      stats: {
        totalOrders,
        pendingOrders,
        totalProducts,
        lowStockCount: lowStockCount.length,
        totalRevenue: revenue[0]?.total || 0,
        visitorsToday: visits.today.uniqueVisitors,
        pageViewsToday: visits.today.pageViews,
        visitorsLast7Days: visits.last7Totals.uniqueVisitors,
        pageViewsLast7Days: visits.last7Totals.pageViews,
      },
      visits,
      recentOrders,
      system: {
        liveUpdatedAt: deploy.deployedAt,
        serverStartedAt: deploy.serverStartedAt,
        gitSha: deploy.gitSha,
        updateSource: deploy.source,
        hasDeployStamp: deploy.hasDeployStamp,
      },
    })
  );
});
