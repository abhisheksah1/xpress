import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

export const uploadFromBuffer = async (fileBuffer, options = {}) => {
  if (!isCloudinaryConfigured) {
    throw new ApiError(503, 'Cloudinary is not configured. Set CLOUDINARY_* env variables.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || config.cloudinary.folder,
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) return reject(new ApiError(500, 'Image upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const uploadFromUrl = async (imageUrl, options = {}) => {
  if (!isCloudinaryConfigured) {
    return validateExternalUrl(imageUrl);
  }

  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: options.folder || config.cloudinary.folder,
    resource_type: 'image',
    ...options,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
};

export const deleteImage = async (publicId) => {
  if (!isCloudinaryConfigured || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

const validateExternalUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ApiError(400, 'Invalid image URL protocol');
    }
    return { url, publicId: null };
  } catch {
    throw new ApiError(400, 'Invalid image URL');
  }
};

export const addImageToEntity = async ({ file, url, alt }) => {
  if (file) {
    const uploaded = await uploadFromBuffer(file.buffer, { public_id: file.originalname?.split('.')[0] });
    return { url: uploaded.url, publicId: uploaded.publicId, alt: alt || '' };
  }
  if (url) {
    const result = await uploadFromUrl(url);
    return { url: result.url, publicId: result.publicId, alt: alt || '' };
  }
  throw new ApiError(400, 'Provide either a file or image URL');
};
