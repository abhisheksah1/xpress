import * as mediaService from '../../services/media.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listMedia = asyncHandler(async (req, res) => {
  const result = await mediaService.listMedia(req.query);
  res.json(new ApiResponse(200, result));
});

export const getMedia = asyncHandler(async (req, res) => {
  const item = await mediaService.getMediaById(req.params.id);
  res.json(new ApiResponse(200, item));
});

export const updateMedia = asyncHandler(async (req, res) => {
  const item = await mediaService.updateMedia(req.params.id, req.body);
  res.json(new ApiResponse(200, item, 'Media updated'));
});

export const deleteMedia = asyncHandler(async (req, res) => {
  await mediaService.deleteMedia(req.params.id);
  res.json(new ApiResponse(200, null, 'Media deleted'));
});
