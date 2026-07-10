import * as uploadService from '../../services/upload.service.js';
import * as mediaService from '../../services/media.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const parseUploadMeta = (body = {}) => ({
  alt: body.alt,
  tags: body.tags,
  category: body.category,
  sourceContext: body.sourceContext,
  sourceLabel: body.sourceLabel,
});

const saveToLibrary = async (uploaded, meta, userId) => {
  const media = await mediaService.recordMediaAsset(uploaded, meta, userId);
  return {
    ...uploaded,
    _id: media._id,
    tags: media.tags,
    category: media.category,
    sourceLabel: media.sourceLabel,
  };
};

export const uploadImage = asyncHandler(async (req, res) => {
  const uploaded = await uploadService.addImageToEntity({
    file: req.file,
    url: req.body.url,
    alt: req.body.alt,
  });
  const meta = {
    ...parseUploadMeta(req.body),
    alt: uploaded.alt,
    filename: uploaded.filename,
    sizeBytes: uploaded.sizeBytes,
  };
  const image = await saveToLibrary(uploaded, meta, req.user?._id);
  res.status(201).json(new ApiResponse(201, image, 'Image uploaded'));
});

export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'No image files provided');
  const meta = parseUploadMeta(req.body);
  const images = await Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadService.addImageToEntity({ file, alt: req.body.alt });
      return saveToLibrary(
        uploaded,
        {
          ...meta,
          alt: uploaded.alt,
          filename: uploaded.filename,
          sizeBytes: uploaded.sizeBytes,
        },
        req.user?._id
      );
    })
  );
  res.status(201).json(new ApiResponse(201, { images }, `${images.length} image(s) uploaded`));
});

export const deleteImage = asyncHandler(async (req, res) => {
  await uploadService.deleteImage(req.body.publicId);
  res.json(new ApiResponse(200, null, 'Image deleted'));
});
