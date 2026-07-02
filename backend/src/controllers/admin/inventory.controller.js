import * as inventoryService from '../../services/inventory.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const adjustStock = asyncHandler(async (req, res) => {
  const result = await inventoryService.adjustStock({ ...req.body, userId: req.user._id });
  res.json(new ApiResponse(200, result, 'Stock adjusted'));
});

export const getLogs = asyncHandler(async (req, res) => {
  const result = await inventoryService.getInventoryLogs(req.query);
  res.json(new ApiResponse(200, result));
});

export const getLowStock = asyncHandler(async (req, res) => {
  const products = await inventoryService.getLowStockProducts(req.query.threshold);
  res.json(new ApiResponse(200, products));
});
