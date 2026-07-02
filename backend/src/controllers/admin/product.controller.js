import * as productService from '../../services/product.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, product, 'Product created'));
});

export const getProducts = asyncHandler(async (req, res) => {
  const result = await productService.getProducts(req.query);
  res.json(new ApiResponse(200, result));
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.json(new ApiResponse(200, product));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user._id);
  res.json(new ApiResponse(200, product, 'Product updated'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.json(new ApiResponse(200, null, 'Product deleted'));
});

export const bulkUpdatePrices = asyncHandler(async (req, res) => {
  const result = await productService.bulkUpdatePrices(req.validated.body);
  res.json(new ApiResponse(200, result, 'Prices updated'));
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await productService.getCategories(req.query.isActive);
  res.json(new ApiResponse(200, categories));
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await productService.createCategory(req.body);
  res.status(201).json(new ApiResponse(201, category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await productService.updateCategory(req.params.id, req.body);
  res.json(new ApiResponse(200, category, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await productService.deleteCategory(req.params.id);
  res.json(new ApiResponse(200, null, 'Category deleted'));
});
