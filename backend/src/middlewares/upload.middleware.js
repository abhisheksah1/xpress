import multer from 'multer';
import config from '../config/index.js';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const allowed = config.upload.allowedImageTypes.map((t) => t.toLowerCase());
  const ext = (file.originalname || '').toLowerCase();
  const extOk = /\.(jpe?g|png|gif|webp)$/.test(ext);
  const mimeOk =
    allowed.includes(mime)
    || mime === 'image/jpg'
    || (mime === 'application/octet-stream' && extOk)
    || (!mime && extOk);

  if (mimeOk) {
    cb(null, true);
  } else {
    cb(new ApiError(400, `Invalid file type. Allowed: JPEG, PNG, WebP, GIF`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeMb * 1024 * 1024 },
});

export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
