import * as cmsService from '../../services/cms.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const STORE_PAGE_CACHE = 'public, max-age=30, stale-while-revalidate=120';

export const getPage = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_PAGE_CACHE);
  const page = await cmsService.getPageBySlug(req.params.slug);
  res.json(new ApiResponse(200, page));
});

export const getPageByType = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_PAGE_CACHE);
  const page = await cmsService.getPageByType(req.params.pageType);
  res.json(new ApiResponse(200, page));
});

export const getPages = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_PAGE_CACHE);
  const pages = await cmsService.getPages({ ...req.query, isPublished: true });
  res.json(new ApiResponse(200, pages));
});
