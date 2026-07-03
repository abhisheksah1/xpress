import * as productService from '../../services/product.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts({ ...req.query, isActive: true });
  res.json(new ApiResponse(200, result));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug, {
    deliveryGroup: req.query.deliveryGroup,
  });
  res.json(new ApiResponse(200, product));
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await productService.getCategories(true, {
    withProductCount: req.query.withProductCount === 'true',
  });
  res.json(new ApiResponse(200, categories));
});
