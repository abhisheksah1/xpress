import * as orderService from '../../services/order.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getOrders(req.query);
  res.json(new ApiResponse(200, result));
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id);
  res.json(new ApiResponse(200, order));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, req.body, req.user._id);
  res.json(new ApiResponse(200, order, 'Order status updated'));
});

export const getDeliveryZones = asyncHandler(async (req, res) => {
  const zones = await orderService.getDeliveryZones();
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
