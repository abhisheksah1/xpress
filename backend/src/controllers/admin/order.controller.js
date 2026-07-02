import * as orderService from '../../services/order.service.js';
import { normalizeItemPersonalization, toStoredMediaUrl } from '../../utils/mediaUrl.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const enrichOrderMedia = (order) => {
  const obj = order.toObject ? order.toObject() : { ...order };
  return {
    ...obj,
    items: (obj.items || []).map((item) => ({
      ...item,
      image: item.image ? toStoredMediaUrl(item.image) : item.image,
      personalization: normalizeItemPersonalization(item.personalization) ?? item.personalization,
    })),
    serviceAddons: (obj.serviceAddons || []).map((addon) => ({
      ...addon,
      photoUrl: addon.photoUrl ? toStoredMediaUrl(addon.photoUrl) : addon.photoUrl,
    })),
  };
};

const withOrderMeta = (order) => ({
  ...enrichOrderMedia(order),
  isLead: orderService.isLeadOrder(order),
});

export const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);
  res.json(new ApiResponse(200, {
    ...result,
    orders: result.orders.map(withOrderMeta),
  }));
});

export const getLeadOrderCount = asyncHandler(async (req, res) => {
  const stats = await orderService.getLeadOrderCount();
  res.json(new ApiResponse(200, stats));
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  const trackingEmail = orderService.getTrackingEmail(order);
  res.json(new ApiResponse(200, {
    ...withOrderMeta(order),
    trackingEmail,
  }));
});

export const confirmLead = asyncHandler(async (req, res) => {
  const order = await orderService.confirmLeadOrder(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order), 'Lead converted to confirmed order'));
});

export const cancelLead = asyncHandler(async (req, res) => {
  const order = await orderService.cancelLeadOrder(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order), 'Lead order cancelled'));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order), 'Order status updated'));
});

export const updatePayment = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(req.params.id, req.validated.body, req.user._id);
  res.json(new ApiResponse(200, withOrderMeta(order), 'Payment status updated'));
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
