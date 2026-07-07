import * as orderService from '../../services/order.service.js';
import { toStoredMediaUrl, enrichPersonalizationForClient, forClientMediaUrl, requestBaseUrl } from '../../utils/mediaUrl.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { rowsToCsv, withBom } from '../../utils/csvExport.js';

const enrichOrderMedia = (order, req) => {
  const obj = order.toObject ? order.toObject() : { ...order };
  const baseUrl = requestBaseUrl(req);
  return {
    ...obj,
    items: (obj.items || []).map((item) => ({
      ...item,
      image: item.image ? forClientMediaUrl(toStoredMediaUrl(item.image), baseUrl) : item.image,
      customerPrintImageUrl: item.customerPrintImageUrl
        ? forClientMediaUrl(toStoredMediaUrl(item.customerPrintImageUrl), baseUrl)
        : item.customerPrintImageUrl,
      personalization: enrichPersonalizationForClient(
        item.personalization || (item.customerPrintImageUrl
          ? { printImageUrl: item.customerPrintImageUrl, printImageName: item.customerPrintImageName }
          : null),
        baseUrl
      ),
    })),
    serviceAddons: (obj.serviceAddons || []).map((addon) => ({
      ...addon,
      photoUrl: addon.photoUrl ? forClientMediaUrl(toStoredMediaUrl(addon.photoUrl), baseUrl) : addon.photoUrl,
    })),
  };
};

const withOrderMeta = (order, req) => ({
  ...enrichOrderMedia(order, req),
  isLead: orderService.isLeadOrder(order),
});

export const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);
  res.json(new ApiResponse(200, {
    ...result,
    orders: result.orders.map((order) => withOrderMeta(order, req)),
  }));
});

export const exportOrdersCsv = asyncHandler(async (req, res) => {
  const orders = await orderService.getOrdersForExport(req.query);

  const header = [
    'Date',
    'Time',
    'Order Number',
    'Status',
    'Payment Status',
    'Payment Method',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Subtotal',
    'Shipping Fee',
    'Discount',
    'Tax',
    'Total',
    'Currency',
    'Delivery Zone',
    'Delivery Location',
    'Preferred Delivery',
    'Items',
  ];

  const rows = orders.map((o) => {
    const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
    const dateStr = Number.isNaN(created.getTime()) ? '' : created.toISOString().slice(0, 10);
    const timeStr = Number.isNaN(created.getTime()) ? '' : created.toISOString().slice(11, 19);
    const senderName = o.sender?.fullName
      || o.shippingAddress?.fullName
      || o.receiver?.fullName
      || o.user?.name
      || '';
    const email = o.user?.email || o.guestEmail || o.sender?.email || o.shippingAddress?.email || '';
    const phone = o.user?.phone || o.guestPhone || o.receiver?.phone || o.shippingAddress?.phone || '';
    const deliveryLabel = o.timeSlot?.label
      || (o.preferredDeliveryDate
        ? new Date(o.preferredDeliveryDate).toISOString().slice(0, 10)
        : '');
    const itemsSummary = (o.items || [])
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(' | ');

    return [
      dateStr,
      timeStr,
      o.orderNumber,
      o.status,
      o.payment?.status || '',
      o.payment?.method || '',
      senderName,
      email,
      phone,
      o.subtotal ?? '',
      o.shippingFee ?? '',
      o.discount ?? '',
      o.tax ?? '',
      o.total ?? '',
      o.checkoutCurrency || 'NPR',
      o.deliveryZone?.name || '',
      o.deliveryLocation?.name || '',
      deliveryLabel,
      itemsSummary,
    ];
  });

  const csv = rowsToCsv([header, ...rows]);
  const { startDate, endDate } = req.query;
  const today = new Date().toISOString().slice(0, 10);
  const from = startDate || 'all';
  const to = endDate || today;
  const filename = `orders-${from}-to-${to}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(withBom(csv));
});

export const getLeadOrderCount = asyncHandler(async (req, res) => {
  const stats = await orderService.getLeadOrderCount();
  res.json(new ApiResponse(200, stats));
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  const trackingEmail = orderService.getTrackingEmail(order);
  res.json(new ApiResponse(200, {
    ...withOrderMeta(order, req),
    trackingEmail,
  }));
});

export const confirmLead = asyncHandler(async (req, res) => {
  const order = await orderService.confirmLeadOrder(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order, req), 'Lead converted to confirmed order'));
});

export const cancelLead = asyncHandler(async (req, res) => {
  const order = await orderService.cancelLeadOrder(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order, req), 'Lead order cancelled'));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order, req), 'Order status updated'));
});

export const updatePayment = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order, req), 'Payment status updated'));
});

export const getDeliveryZones = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const zones = await orderService.getDeliveryZones({ includeInactive });
  res.json(new ApiResponse(200, zones));
});

export const createDeliveryZone = asyncHandler(async (req, res) => {
  const zone = await orderService.createDeliveryZone(req.body);
  res.status(201).json(new ApiResponse(201, zone, 'Delivery zone created'));
});

export const updateDeliveryZone = asyncHandler(async (req, res) => {
  const zone = await orderService.updateDeliveryZone(req.params.id, req.body);
  res.json(new ApiResponse(200, zone, 'Delivery zone updated'));
});

export const deleteDeliveryZone = asyncHandler(async (req, res) => {
  await orderService.deleteDeliveryZone(req.params.id);
  res.json(new ApiResponse(200, null, 'Delivery zone deleted'));
});
