import * as cmsService from '../../services/cms.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createPage = asyncHandler(async (req, res) => {
  const page = await cmsService.createPage(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, page, 'Page created'));
});

export const getPages = asyncHandler(async (req, res) => {
  const pages = await cmsService.getPages(req.query);
  res.json(new ApiResponse(200, pages));
});

export const getPage = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageById(req.params.id);
  res.json(new ApiResponse(200, page));
});

export const updatePage = asyncHandler(async (req, res) => {
  const page = await cmsService.updatePage(req.params.id, req.body, req.user._id);
  res.json(new ApiResponse(200, page, 'Page updated'));
});

export const updateBlocks = asyncHandler(async (req, res) => {
  const page = await cmsService.updatePageBlocks(req.params.id, req.body.blocks, req.user._id);
  res.json(new ApiResponse(200, page, 'Page blocks updated'));
});

export const deletePage = asyncHandler(async (req, res) => {
  await cmsService.deletePage(req.params.id);
  res.json(new ApiResponse(200, null, 'Page deleted'));
});
