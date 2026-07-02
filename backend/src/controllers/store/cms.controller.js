import * as cmsService from '../../services/cms.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getPage = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageBySlug(req.params.slug);
  res.json(new ApiResponse(200, page));
});

export const getPages = asyncHandler(async (req, res) => {
  const pages = await cmsService.getPages({ ...req.query, isPublished: true });
  res.json(new ApiResponse(200, pages));
});
