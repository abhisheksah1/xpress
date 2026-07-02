import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

const PLACEHOLDER_VALUES = new Set(['your_cloud_name', 'your_api_key', 'your_api_secret']);

const hasValidCloudinaryConfig = () =>
  isCloudinaryConfigured &&
  !PLACEHOLDER_VALUES.has(config.cloudinary.cloudName) &&
  !PLACEHOLDER_VALUES.has(config.cloudinary.apiKey) &&
  !PLACEHOLDER_VALUES.has(config.cloudinary.apiSecret);

const saveLocally = async (fileBuffer, originalName = 'image.jpg') => {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName) || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext.toLowerCase()) ? ext : '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`;
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, filename), fileBuffer);
  return {
    url: `/api/${config.apiVersion}/uploads/${filename}`,
    publicId: `local/${filename}`,
    width: null,
    height: null,
    format: safeExt.replace('.', ''),
  };
};

const uploadToCloudinary = (fileBuffer, options = {}) =>
  new Promise((resolve, reject) => {
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

export const uploadFromBuffer = async (fileBuffer, options = {}) => {
  const filename = options.filename || options.public_id || 'image.jpg';

  if (!hasValidCloudinaryConfig()) {
    return saveLocally(fileBuffer, filename);
  }

  try {
    return await uploadToCloudinary(fileBuffer, options);
  } catch (err) {
    if (config.env === 'development') {
      console.warn('Cloudinary upload failed, saving locally:', err.message);
      return saveLocally(fileBuffer, filename);
    }
    throw err;
  }
};

export const uploadFromUrl = async (imageUrl, options = {}) => {
  if (!hasValidCloudinaryConfig()) {
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
  if (!publicId) return;
  if (publicId.startsWith('local/')) {
    const filename = publicId.replace(/^local\//, '');
    try {
      await fs.unlink(path.join(LOCAL_UPLOAD_DIR, filename));
    } catch {
      /* ignore missing local files */
    }
    return;
  }
  if (!hasValidCloudinaryConfig()) return;
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
    const uploaded = await uploadFromBuffer(file.buffer, {
      public_id: file.originalname?.split('.')[0],
      filename: file.originalname,
    });
    return { url: uploaded.url, publicId: uploaded.publicId, alt: alt || '' };
  }
  if (url) {
    const result = await uploadFromUrl(url);
    return { url: result.url, publicId: result.publicId, alt: alt || '' };
  }
  throw new ApiError(400, 'Provide either a file or image URL');
};
