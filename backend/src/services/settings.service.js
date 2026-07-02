import { Settings } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_SETTINGS = [
  { key: 'store_name', value: 'KoseliXpress', group: 'general', label: 'Store Name' },
  { key: 'store_tagline', value: 'Gifts Delivered Across Nepal', group: 'general', label: 'Tagline' },
  { key: 'store_email', value: 'info@koselixpress.com', group: 'general', label: 'Contact Email' },
  { key: 'store_phone', value: '9800000000', group: 'general', label: 'Contact Phone' },
  { key: 'store_address', value: 'Kathmandu, Nepal', group: 'general', label: 'Store Address' },
  { key: 'currency', value: 'NPR', group: 'store', label: 'Currency' },
  { key: 'currency_symbol', value: 'Rs.', group: 'store', label: 'Currency Symbol' },
  { key: 'tax_rate', value: 0, group: 'store', label: 'Tax Rate (%)' },
  { key: 'guest_checkout_enabled', value: true, group: 'store', label: 'Guest Checkout' },
  { key: 'cod_enabled', value: true, group: 'payment', label: 'Cash on Delivery' },
  { key: 'khalti_enabled', value: true, group: 'payment', label: 'Khalti' },
  { key: 'esewa_enabled', value: true, group: 'payment', label: 'eSewa' },
  { key: 'fonepay_enabled', value: true, group: 'payment', label: 'Fonepay' },
  { key: 'card_enabled', value: true, group: 'payment', label: 'Card Payments' },
  { key: 'primary_color', value: '#E11D48', group: 'appearance', label: 'Primary Color' },
  { key: 'secondary_color', value: '#1E293B', group: 'appearance', label: 'Secondary Color' },
  { key: 'logo_url', value: '', group: 'appearance', label: 'Logo URL' },
  { key: 'favicon_url', value: '', group: 'appearance', label: 'Favicon URL' },
  { key: 'facebook_url', value: '', group: 'social', label: 'Facebook' },
  { key: 'instagram_url', value: '', group: 'social', label: 'Instagram' },
  { key: 'meta_title', value: 'KoseliXpress - Gift Portal Nepal', group: 'seo', label: 'Meta Title' },
  { key: 'meta_description', value: 'Send gifts across Nepal with KoseliXpress', group: 'seo', label: 'Meta Description' },
];

export const seedDefaultSettings = async () => {
  for (const setting of DEFAULT_SETTINGS) {
    await Settings.findOneAndUpdate({ key: setting.key }, setting, { upsert: true });
  }
};

export const getSettings = async (group) => {
  const filter = group ? { group } : {};
  return Settings.find(filter).sort({ group: 1, key: 1 });
};

export const getSettingByKey = async (key) => {
  const setting = await Settings.findOne({ key });
  if (!setting) throw new ApiError(404, 'Setting not found');
  return setting;
};

export const getPublicSettings = async () => {
  const publicGroups = ['general', 'store', 'appearance', 'social', 'seo', 'payment'];
  const settings = await Settings.find({ group: { $in: publicGroups } });
  return settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
};

export const updateSetting = async (key, value, userId) => {
  const setting = await Settings.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!setting) throw new ApiError(404, 'Setting not found');
  return setting;
};

export const bulkUpdateSettings = async (settings, userId) => {
  const results = [];
  for (const { key, value } of settings) {
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, updatedBy: userId },
      { new: true }
    );
    if (setting) results.push(setting);
  }
  return results;
};

export const createSetting = async (data, userId) => {
  const existing = await Settings.findOne({ key: data.key });
  if (existing) throw new ApiError(409, 'Setting key already exists');
  return Settings.create({ ...data, updatedBy: userId });
};
