import multer from 'multer';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type. Allowed: ${config.upload.allowedImageTypes.join(', ')}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
});

export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
