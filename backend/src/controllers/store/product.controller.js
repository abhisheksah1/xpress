import * as productService from '../../services/product.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const STORE_LIST_CACHE = 'public, max-age=30, stale-while-revalidate=120';

export const getProducts = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_LIST_CACHE);
  const result = await productService.getProducts({
    ...req.query,
    isActive: true,
    fields: 'card',
  });
  res.json(new ApiResponse(200, result));
});

export const getProduct = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const product = await productService.getProductBySlug(req.params.slug, {
    deliveryGroup: req.query.deliveryGroup,
  });
  res.json(new ApiResponse(200, product));
});

export const getCategories = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_LIST_CACHE);
  const categories = await productService.getCategories(true, {
    withProductCount: req.query.withProductCount === 'true',
    fields: 'card',
  });
  res.json(new ApiResponse(200, categories));
});
