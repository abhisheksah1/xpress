import * as uploadService from '../../services/upload.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const uploadImage = asyncHandler(async (req, res) => {
  const image = await uploadService.addImageToEntity({
    file: req.file,
    url: req.body.url,
    alt: req.body.alt,
  });
  res.status(201).json(new ApiResponse(201, image, 'Image uploaded'));
});

export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'No image files provided');
  const images = await Promise.all(
    files.map((file) => uploadService.addImageToEntity({ file, alt: req.body.alt }))
  );
  res.status(201).json(new ApiResponse(201, { images }, `${images.length} image(s) uploaded`));
});

export const deleteImage = asyncHandler(async (req, res) => {
  await uploadService.deleteImage(req.body.publicId);
  res.json(new ApiResponse(200, null, 'Image deleted'));
});
