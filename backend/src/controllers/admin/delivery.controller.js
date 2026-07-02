import * as deliveryService from '../../services/delivery.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

// Locations
export const getDeliveryLocations = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const locations = await deliveryService.getDeliveryLocations({ includeInactive });
  res.json(new ApiResponse(200, locations));
});

export const createDeliveryLocation = asyncHandler(async (req, res) => {
  const location = await deliveryService.createDeliveryLocation(req.body);
  res.status(201).json(new ApiResponse(201, location, 'Delivery location created'));
});

export const updateDeliveryLocation = asyncHandler(async (req, res) => {
  const location = await deliveryService.updateDeliveryLocation(req.params.id, req.body);
  res.json(new ApiResponse(200, location, 'Delivery location updated'));
});

export const deleteDeliveryLocation = asyncHandler(async (req, res) => {
  await deliveryService.deleteDeliveryLocation(req.params.id);
  res.json(new ApiResponse(200, null, 'Delivery location deleted'));
});

// Groups
export const getDeliveryGroups = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const groups = await deliveryService.getDeliveryGroups({ includeInactive });
  res.json(new ApiResponse(200, groups));
});

export const getDeliveryGroup = asyncHandler(async (req, res) => {
  const group = await deliveryService.getDeliveryGroupById(req.params.id);
  res.json(new ApiResponse(200, group));
});

export const createDeliveryGroup = asyncHandler(async (req, res) => {
  const group = await deliveryService.createDeliveryGroup(req.body);
  res.status(201).json(new ApiResponse(201, group, 'Delivery group created'));
});

export const updateDeliveryGroup = asyncHandler(async (req, res) => {
  const group = await deliveryService.updateDeliveryGroup(req.params.id, req.body);
  res.json(new ApiResponse(200, group, 'Delivery group updated'));
});

export const deleteDeliveryGroup = asyncHandler(async (req, res) => {
  await deliveryService.deleteDeliveryGroup(req.params.id);
  res.json(new ApiResponse(200, null, 'Delivery group deleted'));
});

export const getGroupProducts = asyncHandler(async (req, res) => {
  const products = await deliveryService.getGroupProducts(req.params.id);
  res.json(new ApiResponse(200, products));
});

// Legacy zone endpoints
export const getDeliveryZones = getDeliveryGroups;
export const createDeliveryZone = createDeliveryGroup;
export const updateDeliveryZone = updateDeliveryGroup;
export const deleteDeliveryZone = deleteDeliveryGroup;
