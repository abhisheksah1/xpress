import { Settings, Navbar } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { syncLegacyPaymentFlags } from './paymentGateway.service.js';
import { getDefaultPaymentGateways } from '../config/paymentGatewayDefaults.js';
import { DEFAULT_BRAND_LOGO_URL } from '../config/brandLogo.js';

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
  {
    key: 'landing_popup',
    group: 'store',
    label: 'Landing Page Popup',
    value: {
      enabled: false,
      mode: 'text',
      title: '',
      text: '',
      imageUrl: '',
      buttonText: 'Learn more',
      redirectUrl: '',
      version: '1',
    },
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
        { code: 'USD', name: 'US Dollar', symbol: '$', rate: 0.0075, nprPerUnit: 133.33, enabled: false, isDefault: false, manualOverride: false, source: 'manual' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 0.625, nprPerUnit: 1.6, enabled: false, isDefault: false, manualOverride: false, source: 'manual' },
      ],
    },
  },
  { key: 'auto_convert_prices', value: false, group: 'currency', label: 'Auto-convert product prices' },
  { key: 'currency_nrb_auto_sync', value: true, group: 'currency', label: 'Auto-sync rates from NRB every hour' },
  {
    key: 'currency_nrb_last_sync',
    group: 'currency',
    label: 'NRB Last Sync Metadata',
    value: { at: null, message: 'Not synced yet', updated: 0 },
  },

  // Service Add-ons
  {
    key: 'service_addons',
    group: 'addons',
    label: 'Service Add-ons',
    value: [
      { id: 'gift_wrap', name: 'Premium Gift Wrapping', price: 150, description: 'Elegant wrap with ribbon', enabled: true, inputType: 'none' },
      { id: 'express', name: 'Express Delivery', price: 300, description: 'Same-day in Kathmandu Valley', enabled: true, inputType: 'none' },
      { id: 'personalized_card', name: 'Personalized Greeting Card', price: 75, description: 'Custom printed message card', enabled: true, inputType: 'text' },
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

  // Payment Gateways (integrated setup)
  {
    key: 'payment_gateways',
    group: 'payment',
    label: 'Integrated Payment Gateways',
    value: null,
  },
  // Legacy payment flags (kept in sync automatically)
  { key: 'cod_enabled', value: true, group: 'payment', label: 'Cash on Delivery (COD)' },
  { key: 'khalti_enabled', value: true, group: 'payment', label: 'Khalti' },
  { key: 'esewa_enabled', value: true, group: 'payment', label: 'eSewa' },
  { key: 'fonepay_enabled', value: true, group: 'payment', label: 'Fonepay' },
  { key: 'card_enabled', value: true, group: 'payment', label: 'Card / NPS OnePG' },
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
  { key: 'logo_url', value: DEFAULT_BRAND_LOGO_URL, group: 'branding', label: 'Logo URL' },
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

  // Product page (all products)
  {
    key: 'product_page_alert_message',
    value: 'Orders placed after the cut-off time are scheduled for the next fulfillment cycle.',
    group: 'product_page',
    label: 'Concise alert message (all products)',
  },
  {
    key: 'product_page_short_terms',
    value: 'By placing an order you agree to our delivery timelines, substitution policy for seasonal items, and standard gift-handling terms. Perishable items are fulfilled with fresh stock only.',
    group: 'product_page',
    label: 'Short terms & conditions (all products)',
  },
  {
    key: 'product_delivery_schedule_disclaimer',
    value: '* Orders submitted beyond the cut-off times (4 PM NST) are queued and dispatched on the subsequent fulfillment cycle. All speeds verified by carriers.',
    group: 'product_page',
    label: 'Delivery schedule footer note',
  },
  { key: 'product_whatsapp_help_enabled', value: true, group: 'product_page', label: 'Show WhatsApp help on product pages' },
  {
    key: 'product_whatsapp_help_title',
    value: 'WhatsApp Emergency Help & Customization',
    group: 'product_page',
    label: 'WhatsApp help title',
  },
  {
    key: 'product_whatsapp_help_description',
    value: 'Require immediate updates, custom note adjustments, or fast delivery coordination? Chat with our team instantly!',
    group: 'product_page',
    label: 'WhatsApp help description',
  },
  { key: 'product_whatsapp_help_button_text', value: 'WhatsApp Chat', group: 'product_page', label: 'WhatsApp button text' },
  { key: 'product_delivery_location_tier_label', value: 'Location Tier', group: 'product_page', label: 'Delivery table badge label' },

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
        subject: 'Order received – {{order_number}} | Koseli Xpress',
        body: 'Hi {{customer_name}},\n\nThank you for ordering with Koseli Xpress.\n\nOrder number: {{order_number}}\nTotal: {{total}}\n\nTrack your order anytime:\n{{tracking_url}}\n\n{{payment_pending_note}}\n\n{{payment_instructions}}\n\nIf you need help, contact us at {{support_email}} or WhatsApp: {{support_whatsapp}}.\n\nThank you,\nKoseli Xpress',
      },
      welcome: {
        subject: 'Welcome to KoseliXpress!',
        body: 'Hi {{customer_name}},\n\nWelcome to KoseliXpress — Nepal\'s gift portal. Start browsing gifts today!',
      },
      password_reset: {
        subject: 'Reset Your Password',
        body: 'Hi {{customer_name}},\n\nUse this link to reset your password: {{reset_link}}\n\nIf you did not request this, ignore this email.',
      },
      reminder: {
        subject: 'Reminder: {{title}} on {{occasion_date}}',
        body:
          'Hi {{customer_name}},\n\nThis is a reminder for {{title}} ({{relation}}) on {{occasion_date}}.\nDelivery location note: {{delivery_location}}\n\nYou can place your order anytime from our store.\n\n{{custom_message}}',
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
  { key: 'site_url', value: 'https://koselixpress.com', group: 'seo', label: 'Canonical Site URL' },
  { key: 'meta_title', value: 'KoseliXpress - Gift Portal Nepal', group: 'seo', label: 'Default Meta Title' },
  { key: 'meta_description', value: 'Send gifts across Nepal with KoseliXpress', group: 'seo', label: 'Default Meta Description' },
  { key: 'meta_keywords', value: 'gifts, flowers, cakes, Nepal, Kathmandu, delivery', group: 'seo', label: 'Default Meta Keywords' },
  { key: 'default_og_image', value: '', group: 'seo', label: 'Default OG Image URL' },
  { key: 'google_site_verification', value: '', group: 'seo', label: 'Google Site Verification Code' },
  { key: 'bing_site_verification', value: '', group: 'seo', label: 'Bing Site Verification Code' },
  { key: 'business_name', value: 'Koseli Xpress Pvt. Ltd.', group: 'seo', label: 'Business Name (Schema)' },
  { key: 'geo_placename', value: 'Kathmandu', group: 'seo', label: 'GEO Placename' },
  { key: 'geo_region', value: 'Bagmati', group: 'seo', label: 'GEO Region' },
  { key: 'geo_country', value: 'NP', group: 'seo', label: 'GEO Country Code' },
  { key: 'geo_latitude', value: '27.7172', group: 'seo', label: 'GEO Latitude' },
  { key: 'geo_longitude', value: '85.3240', group: 'seo', label: 'GEO Longitude' },
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
    'product_page',
  ];
  const settings = await Settings.find({ group: { $in: publicGroups } });
  const result = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  if (!result.payment_gateways) {
    result.payment_gateways = getDefaultPaymentGateways();
  }

  if (!result.multi_currencies) {
    const def = DEFAULT_SETTINGS.find((s) => s.key === 'multi_currencies');
    if (def) result.multi_currencies = def.value;
  }

  result.payment_gateways = (result.payment_gateways || []).map((g) => ({
    id: g.id,
    type: g.type,
    enabled: g.enabled,
    currencies: g.currencies || [],
    displayLabel: g.displayLabel,
    sortOrder: g.sortOrder,
  }));

  // Sync branding colors to legacy keys for storefront
  if (result.primary_color) {
    result.primary_color = result.primary_color || result.primary_color_legacy;
  }
  return result || {};
};

const syncBrandingLogoToNavbars = async (logoUrl, userId) => {
  const trimmed = typeof logoUrl === 'string' ? logoUrl.trim() : '';
  if (!trimmed) return;

  const companySetting = await Settings.findOne({ key: 'registry_company_name' });
  const alt = companySetting?.value || 'Koseli Xpress';

  await Navbar.updateMany(
    { location: { $in: ['header', 'footer'] } },
    { $set: { logo: { url: trimmed, alt }, updatedBy: userId } }
  );
};

export const updateSetting = async (key, value, userId) => {
  const setting = await Settings.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!setting) throw new ApiError(404, 'Setting not found');
  if (key === 'logo_url' && value) {
    await syncBrandingLogoToNavbars(value, userId);
  }
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
    if (key === 'payment_gateways' && value) {
      await syncLegacyPaymentFlags(value);
    }
    if (key === 'logo_url' && value) {
      await syncBrandingLogoToNavbars(value, userId);
    }
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
