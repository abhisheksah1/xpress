import { Order, ApiPartner, ApiPartnerLog } from '../models/index.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../config/constants.js';

const parseDateStart = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDateEnd = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const buildOrderFilter = ({ partnerId, startDate, endDate }) => {
  const filter = { orderSource: 'api_partner' };
  if (partnerId && partnerId !== 'all') {
    filter.apiPartner = partnerId;
  }
  const start = parseDateStart(startDate);
  const end = parseDateEnd(endDate);
  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = start;
    if (end) filter.createdAt.$lte = end;
  }
  return filter;
};

const buildLogFilter = ({ partnerId, startDate, endDate }) => {
  const filter = {};
  if (partnerId && partnerId !== 'all') {
    filter.partner = partnerId;
  }
  const start = parseDateStart(startDate);
  const end = parseDateEnd(endDate);
  if (start || end) {
    filter.createdAt = {};
    if (start) filter.createdAt.$gte = start;
    if (end) filter.createdAt.$lte = end;
  }
  return filter;
};

const isFulfilledStatus = (status) =>
  [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(status);

const isPaidProcessingStatus = (status) =>
  [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(status);

const settlementLabel = (order) => {
  if (order.status === ORDER_STATUS.CANCELLED) return 'CANCELLED';
  if (order.payment?.status === PAYMENT_STATUS.PENDING) return 'PENDING PAYMENT';
  if (isPaidProcessingStatus(order.status)) return 'PREPARING';
  if (isFulfilledStatus(order.status)) return 'FULFILLED';
  if (order.payment?.status === PAYMENT_STATUS.PAID) return 'PAID';
  return (order.status || 'pending').toUpperCase();
};

const settlementClass = (label) => {
  const map = {
    'PENDING PAYMENT': 'bg-amber-100 text-amber-800',
    PREPARING: 'bg-sky-100 text-sky-800',
    PAID: 'bg-blue-100 text-blue-800',
    FULFILLED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-rose-100 text-rose-800',
  };
  return map[label] || 'bg-slate-100 text-slate-700';
};

export const getPartnerTransactionalReport = async ({ partnerId, startDate, endDate }) => {
  const orderFilter = buildOrderFilter({ partnerId, startDate, endDate });
  const logFilter = buildLogFilter({ partnerId, startDate, endDate });

  const [orders, partners, logStats] = await Promise.all([
    Order.find(orderFilter)
      .populate('apiPartner', 'integrationName apiUsername companyName')
      .populate('deliveryLocation', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    ApiPartner.find().select('integrationName apiUsername companyName status').sort({ integrationName: 1 }).lean(),
    ApiPartnerLog.aggregate([
      { $match: logFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0],
            },
          },
          errors: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const placedCount = orders.length;
  const grossRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgOrderValue = placedCount ? grossRevenue / placedCount : 0;

  const logRow = logStats[0] || { total: 0, success: 0, errors: 0 };
  const apiSuccessRate = logRow.total ? (logRow.success / logRow.total) * 100 : (placedCount ? 100 : 0);

  let pendingPayment = 0;
  let paid = 0;
  let fulfilled = 0;
  let cancelled = 0;

  const destinationMap = new Map();
  const productMap = new Map();

  for (const order of orders) {
    if (order.status === ORDER_STATUS.CANCELLED) {
      cancelled += 1;
    } else if (order.payment?.status === PAYMENT_STATUS.PENDING) {
      pendingPayment += 1;
    } else if (isFulfilledStatus(order.status)) {
      fulfilled += 1;
    } else if (order.payment?.status === PAYMENT_STATUS.PAID) {
      paid += 1;
    } else {
      pendingPayment += 1;
    }

    const dest =
      order.deliveryLocation?.name ||
      order.shippingAddress?.district ||
      order.receiver?.address ||
      'Unknown';
    destinationMap.set(dest, (destinationMap.get(dest) || 0) + 1);

    for (const item of order.items || []) {
      const key = item.name || String(item.product);
      const prev = productMap.get(key) || { name: key, qty: 0, revenue: 0 };
      prev.qty += item.quantity || 0;
      prev.revenue += (item.price || 0) * (item.quantity || 0);
      productMap.set(key, prev);
    }
  }

  const topDestinations = [...destinationMap.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percent: placedCount ? Math.round((count / placedCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const ledger = orders.map((order) => {
    const settlement = settlementLabel(order);
    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      partnerExternalRef: order.partnerExternalRef || '',
      datePlaced: order.createdAt,
      apiUserId: order.apiPartner?.apiUsername || '—',
      partnerName: order.apiPartner?.integrationName || 'API Gateway',
      partnerUsername: order.apiPartner?.apiUsername ? `@${order.apiPartner.apiUsername}` : '@unknown_partner',
      senderName: order.sender?.fullName || order.shippingAddress?.fullName || '—',
      recipientName: order.receiver?.fullName || order.shippingAddress?.fullName || '—',
      deliveryDestination:
        order.deliveryLocation?.name ||
        order.shippingAddress?.district ||
        '—',
      deliveryAddress: order.receiver?.address || order.shippingAddress?.street || '',
      settlementStatus: settlement,
      settlementClass: settlementClass(settlement),
      paymentStatus: order.payment?.status,
      orderStatus: order.status,
      total: order.total,
      currency: order.checkoutCurrency || 'NPR',
    };
  });

  return {
    filters: { partnerId: partnerId || 'all', startDate, endDate },
    partners,
    kpis: {
      placedOrders: placedCount,
      grossRevenueNpr: grossRevenue,
      averageOrderValueNpr: avgOrderValue,
      apiSuccessRate,
      apiLogHits: logRow.errors,
      apiLogTotal: logRow.total,
    },
    orderStates: {
      pendingPayment,
      paid,
      fulfilled,
      cancelled,
    },
    topDestinations,
    topProducts,
    ledger,
  };
};

const csvEscape = (value) => {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const buildPartnerReportCsv = (report) => {
  const header = [
    'Order Number',
    'Partner Ref ID',
    'Date Placed',
    'API User ID',
    'API Partner Name',
    'Partner Username',
    'Sender',
    'Recipient',
    'Delivery Destination',
    'Delivery Address',
    'Settlement Status',
    'Payment Status',
    'Order Status',
    'Value (NPR)',
  ];

  const rows = report.ledger.map((row) => [
    row.orderNumber,
    row.partnerExternalRef,
    row.datePlaced ? new Date(row.datePlaced).toISOString().slice(0, 10) : '',
    row.apiUserId,
    row.partnerName,
    row.partnerUsername,
    row.senderName,
    row.recipientName,
    row.deliveryDestination,
    row.deliveryAddress,
    row.settlementStatus,
    row.paymentStatus,
    row.orderStatus,
    row.total,
  ]);

  return [header, ...rows].map((line) => line.map(csvEscape).join(',')).join('\n');
};

export const getPartnerReportCsv = async (params) => {
  const report = await getPartnerTransactionalReport(params);
  return buildPartnerReportCsv(report);
};
