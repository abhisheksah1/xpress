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
  'users:write',
  'blog:read',
  'blog:write',
  'cms:read',
  'cms:write',
  'settings:read',
  'reminders:read',
  'reminders:write',
];

/** Quick-assign privilege templates for custom staff users. */
export const STAFF_ROLE_PRESETS = {
  order_processor: {
    label: 'Order processor',
    description: 'Process and update customer orders',
    permissions: ['orders:read', 'orders:write'],
  },
  product_manager: {
    label: 'Product upload',
    description: 'Add and edit products, categories, and stock',
    permissions: ['products:read', 'products:write', 'inventory:read', 'inventory:write'],
  },
  accounts_user: {
    label: 'Accounts / customers',
    description: 'View and manage registered customer accounts',
    permissions: ['users:read', 'users:write'],
  },
  content_editor: {
    label: 'Content editor',
    description: 'Manage pages, blog posts, and storefront content',
    permissions: ['cms:read', 'cms:write', 'blog:read', 'blog:write'],
  },
};

export const STAFF_PERMISSION_LABELS = {
  'products:read': 'View products',
  'products:write': 'Manage products',
  'orders:read': 'View orders',
  'orders:write': 'Process orders',
  'inventory:read': 'View inventory',
  'inventory:write': 'Adjust stock',
  'users:read': 'View customers',
  'users:write': 'Manage customers',
  'blog:read': 'View blog',
  'blog:write': 'Manage blog',
  'cms:read': 'View content',
  'cms:write': 'Manage content',
  'settings:read': 'View settings',
  'reminders:read': 'View reminders',
  'reminders:write': 'Manage reminders',
};
