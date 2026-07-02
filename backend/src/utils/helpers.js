import slugifyLib from 'slugify';

export const generateSlug = (text) =>
  slugifyLib(text, { lower: true, strict: true, trim: true });

export const generateOrderNumber = (prefix = 'KO-') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}-${random}`;
};

export const generateSKU = (prefix = 'KX') => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
};
