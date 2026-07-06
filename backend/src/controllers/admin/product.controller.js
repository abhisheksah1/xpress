import * as productService from '../../services/product.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PRODUCT_CSV_TEMPLATE_HEADERS } from '../../utils/productCsvMapper.js';

const escapeCsv = (val) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

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

export const bulkDeleteProducts = asyncHandler(async (req, res) => {
  const result = await productService.bulkDeleteProducts(req.body.productIds);
  res.json(new ApiResponse(200, result, `${result.deleted} product(s) deleted`));
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

export const getCatalogStats = asyncHandler(async (req, res) => {
  const stats = await productService.getCatalogStats();
  res.json(new ApiResponse(200, stats));
});

export const cloneProduct = asyncHandler(async (req, res) => {
  const product = await productService.cloneProduct(req.params.id, req.user._id);
  res.status(201).json(new ApiResponse(201, product, 'Product cloned'));
});

export const importProducts = asyncHandler(async (req, res) => {
  const result = req.body.csv
    ? await productService.importProductsFromCsv(req.body.csv, req.user._id)
    : await productService.importProducts(req.body.products, req.user._id);
  res.json(new ApiResponse(200, result, 'Import completed'));
});

export const importCsvTemplate = asyncHandler(async (req, res) => {
  const sample = [
    'Red Rose Bouquet',
    '900',
    '1200',
    '600',
    '10',
    '',
    'KX-ROSE-001',
    '2244',
    'Y',
    '',
    '',
    'M',
    'red-rose-bouquet',
    'Active',
    '',
    'Red Rose Bouquet, Gift For Wife, Birthday Gifts',
    'https://cdn.example.com/product.jpg',
    'Fresh red roses hand-tied bouquet.',
  ];
  const csv = [PRODUCT_CSV_TEMPLATE_HEADERS.join(','), sample.map(escapeCsv).join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
  res.send(csv);
});

export const exportProducts = asyncHandler(async (req, res) => {
  const { products } = await productService.getProducts({ page: 1, limit: 10000 });
  const headers = ['name', 'sku', 'category', 'price', 'stock', 'isActive', 'description', 'tags'];
  const rows = products.map((p) => [
    p.name,
    p.sku,
    p.category?.name || '',
    p.price,
    p.stock,
    p.isActive,
    (p.description || '').replace(/\n/g, ' '),
    (p.tags || []).join('|'),
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
  res.send(csv);
});
