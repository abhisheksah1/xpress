import { Settings } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_SETTINGS = [
  // Store Registry Identities
  { key: 'registry_company_name', value: 'Koseli Xpress Pvt. Ltd.', group: 'registry', label: 'Company / Store Name' },
  { key: 'registry_support_email', value: 'support@koselixpress.com', group: 'registry', label: 'Support Email Address' },
  {
    key: 'registry_helpdesk_whatsapp',
    value: '+977 1 4455888',
    group: 'registry',
    label: 'Helpdesk WhatsApp Support Contact Number',
    description: 'Used for direct customer help/emergency WhatsApp messages.',
  },
  { key: 'registry_fulfillment_address', value: 'Kathmandu, Nepal', group: 'registry', label: 'Fulfillment Base Address' },
  { key: 'registry_base_currency', value: 'NPR', group: 'registry', label: 'System Base Currency' },
  { key: 'registry_invoice_prefix', value: 'KO-', group: 'registry', label: 'Invoice Reference Prefix' },

  // General
  { key: 'store_name', value: 'Koseli Xpress Pvt. Ltd.', group: 'general', label: 'Store Name' },
  { key: 'store_tagline', value: 'Gifts Delivered Across Nepal', group: 'general', label: 'Tagline' },
  { key: 'store_email', value: 'info@koselixpress.com', group: 'general', label: 'Contact Email' },
  { key: 'store_phone', value: '9800000000', group: 'general', label: 'Contact Phone' },
  { key: 'store_address', value: 'Kathmandu, Nepal', group: 'general', label: 'Store Address' },
  { key: 'currency', value: 'NPR', group: 'store', label: 'Default Currency Code' },
  { key: 'currency_symbol', value: 'Rs.', group: 'store', label: 'Default Currency Symbol' },
  { key: 'tax_rate', value: 0, group: 'store', label: 'Tax Rate (%)' },
  { key: 'guest_checkout_enabled', value: true, group: 'store', label: 'Guest Checkout' },
  { key: 'maintenance_enabled', value: false, group: 'store', label: 'Maintenance Mode' },
  {
    key: 'maintenance_message',
    value: 'We are under maintenance. Please check back soon.',
    group: 'store',
    label: 'Maintenance Message',
  },

  // Multi-Currencies
  {
    key: 'multi_currencies',
    group: 'currency',
    label: 'Currency List',
    value: {
      defaultCode: 'NPR',
      currencies: [
        { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs.', rate: 1, enabled: true, isDefault: true },
        { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.0075, enabled: false, isDefault: false },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 0.625, enabled: false, isDefault: false },
      ],
    },
  },
  { key: 'auto_convert_prices', value: false, group: 'currency', label: 'Auto-convert product prices' },

  // Service Add-ons
  {
    key: 'service_addons',
    group: 'addons',
    label: 'Service Add-ons',
    value: [
      { id: 'gift_wrap', name: 'Premium Gift Wrapping', price: 150, description: 'Elegant wrap with ribbon', enabled: true },
      { id: 'express', name: 'Express Delivery', price: 300, description: 'Same-day in Kathmandu Valley', enabled: true },
      { id: 'personalized_card', name: 'Personalized Greeting Card', price: 75, description: 'Custom printed message card', enabled: true },
    ],
  },

  // Delivery Pricing (extras beyond zones)
  { key: 'default_delivery_fee', value: 100, group: 'shipping', label: 'Default Delivery Fee (NPR)' },
  { key: 'free_shipping_threshold', value: 5000, group: 'shipping', label: 'Free Shipping Above (NPR)' },
  { key: 'same_day_fee', value: 200, group: 'shipping', label: 'Same-Day Surcharge (NPR)' },
  { key: 'handling_fee', value: 0, group: 'shipping', label: 'Handling Fee (NPR)' },

  // Delivery Time Slots
  {
    key: 'delivery_time_slots',
    group: 'timeslots',
    label: 'Delivery Time Slots',
    value: [
      { id: 'morning', label: 'Morning (9 AM – 12 PM)', start: '09:00', end: '12:00', enabled: true, maxOrders: 50 },
      { id: 'afternoon', label: 'Afternoon (12 PM – 5 PM)', start: '12:00', end: '17:00', enabled: true, maxOrders: 80 },
      { id: 'evening', label: 'Evening (5 PM – 8 PM)', start: '17:00', end: '20:00', enabled: true, maxOrders: 40 },
    ],
  },
  { key: 'timeslots_enabled', value: true, group: 'timeslots', label: 'Enable delivery time slot selection' },

  // Payment Gateways
  { key: 'cod_enabled', value: true, group: 'payment', label: 'Cash on Delivery (COD)' },
  { key: 'khalti_enabled', value: true, group: 'payment', label: 'Khalti' },
  { key: 'esewa_enabled', value: true, group: 'payment', label: 'eSewa' },
  { key: 'fonepay_enabled', value: true, group: 'payment', label: 'Fonepay' },
  { key: 'card_enabled', value: true, group: 'payment', label: 'Card / Stripe' },
  { key: 'khalti_public_key', value: '', group: 'payment', label: 'Khalti Public Key' },
  { key: 'esewa_merchant_code', value: '', group: 'payment', label: 'eSewa Merchant Code' },
  { key: 'fonepay_merchant_code', value: '', group: 'payment', label: 'Fonepay Merchant Code' },
  { key: 'payment_test_mode', value: true, group: 'payment', label: 'Test / Sandbox Mode' },

  // Plugins Config
  {
    key: 'plugins_config',
    group: 'plugins',
    label: 'Plugins & Integrations',
    value: {
      google_analytics_id: '',
      google_tag_manager_id: '',
      facebook_pixel_id: '',
      whatsapp_chat_enabled: true,
      whatsapp_number: '9800000000',
      messenger_page_id: '',
      hotjar_id: '',
      custom_head_scripts: '',
    },
  },

  // Branding & Layout (10 core)
  { key: 'logo_url', value: '', group: 'branding', label: 'Logo URL' },
  { key: 'favicon_url', value: '', group: 'branding', label: 'Favicon URL' },
  { key: 'primary_color', value: '#E11D48', group: 'branding', label: 'Primary Color' },
  { key: 'secondary_color', value: '#1E293B', group: 'branding', label: 'Secondary Color' },
  { key: 'accent_color', value: '#F59E0B', group: 'branding', label: 'Accent Color' },
  { key: 'font_family', value: 'Inter', group: 'branding', label: 'Font Family' },
  { key: 'header_style', value: 'sticky', group: 'branding', label: 'Header Style (sticky / static)' },
  { key: 'button_style', value: 'rounded', group: 'branding', label: 'Button Style (rounded / square)' },
  { key: 'store_layout', value: 'wide', group: 'branding', label: 'Store Layout (wide / boxed)' },
  { key: 'hero_style', value: 'gradient', group: 'branding', label: 'Hero Style (gradient / image / video)' },

  // Legacy appearance keys (kept for compatibility)
  { key: 'primary_color_legacy', value: '#E11D48', group: 'appearance', label: 'Primary Color' },
  { key: 'secondary_color_legacy', value: '#1E293B', group: 'appearance', label: 'Secondary Color' },

  // Compliance & Footer
  { key: 'terms_url', value: '/p/terms', group: 'compliance', label: 'Terms & Conditions URL' },
  { key: 'privacy_url', value: '/p/privacy', group: 'compliance', label: 'Privacy Policy URL' },
  { key: 'cookie_notice_enabled', value: true, group: 'compliance', label: 'Show Cookie Notice' },
  { key: 'cookie_notice_text', value: 'We use cookies to improve your experience.', group: 'compliance', label: 'Cookie Notice Text' },
  { key: 'company_registration', value: '', group: 'compliance', label: 'Company Registration No.' },
  { key: 'vat_number', value: '', group: 'compliance', label: 'VAT / PAN Number' },
  { key: 'footer_copyright', value: '© KoseliXpress. All rights reserved.', group: 'compliance', label: 'Footer Copyright Text' },
  { key: 'footer_disclaimer', value: '', group: 'compliance', label: 'Footer Disclaimer' },

  // SMTP & Email Templates
  { key: 'smtp_host', value: '', group: 'email', label: 'SMTP Host' },
  { key: 'smtp_port', value: 587, group: 'email', label: 'SMTP Port' },
  { key: 'smtp_secure', value: false, group: 'email', label: 'Use SSL/TLS (port 465)' },
  { key: 'smtp_user', value: '', group: 'email', label: 'SMTP Username' },
  { key: 'smtp_pass', value: '', group: 'email', label: 'SMTP Password' },
  { key: 'email_from', value: 'KoseliXpress <noreply@koselixpress.com>', group: 'email', label: 'From Address' },
  {
    key: 'email_templates',
    group: 'email',
    label: 'Email Templates',
    value: {
      order_confirmation: {
        subject: 'Order Confirmed – {{order_number}}',
        body: 'Hi {{customer_name}},\n\nYour order {{order_number}} has been confirmed. Total: {{total}}.\n\nThank you for shopping with KoseliXpress!',
      },
      welcome: {
        subject: 'Welcome to KoseliXpress!',
        body: 'Hi {{customer_name}},\n\nWelcome to KoseliXpress — Nepal\'s gift portal. Start browsing gifts today!',
      },
      password_reset: {
        subject: 'Reset Your Password',
        body: 'Hi {{customer_name}},\n\nUse this link to reset your password: {{reset_link}}\n\nIf you did not request this, ignore this email.',
      },
    },
  },

  // Customer Authentication
  { key: 'registration_enabled', value: true, group: 'auth', label: 'Allow Customer Registration' },
  { key: 'email_verification_required', value: false, group: 'auth', label: 'Require Email Verification' },
  { key: 'social_google_enabled', value: false, group: 'auth', label: 'Google Sign-In' },
  { key: 'social_facebook_enabled', value: false, group: 'auth', label: 'Facebook Sign-In' },
  { key: 'min_password_length', value: 8, group: 'auth', label: 'Minimum Password Length' },
  { key: 'session_timeout_minutes', value: 10080, group: 'auth', label: 'Session Timeout (minutes)' },
  { key: 'login_attempts_max', value: 5, group: 'auth', label: 'Max Login Attempts' },

  // SEO & Social
  { key: 'meta_title', value: 'KoseliXpress - Gift Portal Nepal', group: 'seo', label: 'Meta Title' },
  { key: 'meta_description', value: 'Send gifts across Nepal with KoseliXpress', group: 'seo', label: 'Meta Description' },
  { key: 'facebook_url', value: '', group: 'social', label: 'Facebook' },
  { key: 'instagram_url', value: '', group: 'social', label: 'Instagram' },
  { key: 'twitter_url', value: '', group: 'social', label: 'Twitter / X' },
  { key: 'youtube_url', value: '', group: 'social', label: 'YouTube' },
];

export const seedDefaultSettings = async () => {
  for (const setting of DEFAULT_SETTINGS) {
    await Settings.findOneAndUpdate(
      { key: setting.key },
      { $setOnInsert: setting },
      { upsert: true }
    );
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
  const publicGroups = [
    'general', 'store', 'appearance', 'branding', 'social', 'seo', 'payment',
    'currency', 'addons', 'shipping', 'timeslots', 'compliance', 'auth', 'plugins', 'registry',
  ];
  const settings = await Settings.find({ group: { $in: publicGroups } });
  const result = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  // Sync branding colors to legacy keys for storefront
  if (result.primary_color) {
    result.primary_color = result.primary_color || result.primary_color_legacy;
  }
  return result;
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
    let setting = await Settings.findOneAndUpdate(
      { key },
      { value, updatedBy: userId },
      { new: true }
    );
    if (!setting) {
      const def = DEFAULT_SETTINGS.find((s) => s.key === key);
      if (def) {
        setting = await Settings.create({ ...def, value, updatedBy: userId });
      }
    }
    if (setting) results.push(setting);
  }
  return results;
};

export const createSetting = async (data, userId) => {
  const existing = await Settings.findOne({ key: data.key });
  if (existing) throw new ApiError(409, 'Setting key already exists');
  return Settings.create({ ...data, updatedBy: userId });
};

export const getSettingsByGroups = async (groups) => {
  return Settings.find({ group: { $in: groups } }).sort({ group: 1, key: 1 });
};
