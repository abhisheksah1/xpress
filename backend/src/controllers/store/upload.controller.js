import * as uploadService from '../../services/upload.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const uploadPersonalizationImage = asyncHandler(async (req, res) => {
  const image = await uploadService.addImageToEntity({
    file: req.file,
    alt: req.body.alt || 'Product personalization',
  });
  res.status(201).json(new ApiResponse(201, image, 'Image uploaded'));
});
