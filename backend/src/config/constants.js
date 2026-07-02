export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHODS = {
  KHALTI: 'khalti',
  ESEWA: 'esewa',
  IMEPAY: 'imepay',
  FONEPAY: 'fonepay',
  CARD: 'card',
  HBL: 'hbl',
  MANUAL_BANK: 'manual_bank',
  COD: 'cod',
};

export const CMS_PAGE_TYPES = {
  HOME: 'home',
  ABOUT: 'about',
  CONTACT: 'contact',
  FAQ: 'faq',
  TERMS: 'terms',
  PRIVACY: 'privacy',
  CUSTOM: 'custom',
};

export const NEPAL_PROVINCES = [
  'Province 1',
  'Madhesh Pradesh',
  'Bagmati Pradesh',
  'Gandaki Pradesh',
  'Lumbini Pradesh',
  'Karnali Pradesh',
  'Sudurpashchim Pradesh',
];

export const STAFF_PERMISSIONS = [
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'inventory:read',
  'inventory:write',
  'users:read',
  'blog:read',
  'blog:write',
  'cms:read',
  'cms:write',
  'settings:read',
  'reminders:read',
  'reminders:write',
];
