import { v2 as cloudinary } from 'cloudinary';
import config from './index.js';

const isConfigured =
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret;

if (isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

export { cloudinary, isConfigured as isCloudinaryConfigured };
