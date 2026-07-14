import api from './client.js';

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCatalogStats: () => api.get('/admin/products/stats'),
  getProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.patch(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  bulkDeleteProducts: (productIds) => api.post('/admin/products/bulk/delete', { productIds }),
  cloneProduct: (id) => api.post(`/admin/products/${id}/clone`),
  importProducts: (payload) => api.post('/admin/products/import', payload),
  downloadImportTemplate: () => api.get('/admin/products/import/template', { responseType: 'blob' }),
  exportProducts: () => api.get('/admin/products/export', { responseType: 'blob' }),

  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.patch(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  getSettings: (group) => api.get('/admin/settings', { params: group ? { group } : {} }),
  bulkUpdateSettings: (settings) => api.patch('/admin/settings/bulk', { settings }),
  testSmtp: (email) => api.post('/admin/settings/test-smtp', { email }),
  syncNrbRates: () => api.post('/admin/settings/sync-nrb-rates'),

  getNpsUrls: () => api.get('/admin/payments/nps/urls'),
  testNpsConnection: (credentials) => api.post('/admin/payments/nps/test', credentials),
  getNpsInstruments: (credentials) => api.post('/admin/payments/nps/instruments', credentials),
  getNpsServiceCharge: (payload) => api.post('/admin/payments/nps/service-charge', payload),

  getCmsPages: (params) => api.get('/admin/cms', { params }),
  getCmsPage: (id) => api.get(`/admin/cms/${id}`),
  createCmsPage: (data) => api.post('/admin/cms', data),
  setupHomePage: () => api.post('/admin/cms/setup-home'),
  updateCmsPage: (id, data) => api.patch(`/admin/cms/${id}`, data),
  cloneCmsPage: (id, data) => api.post(`/admin/cms/${id}/clone`, data),
  updateCmsBlocks: (id, blocks) => api.patch(`/admin/cms/${id}/blocks`, { blocks }),
  deleteCmsPage: (id) => api.delete(`/admin/cms/${id}`),
  fetchGoogleReviews: (placeId) => api.post('/admin/cms/google-reviews/fetch', { placeId }),

  getNavbars: (location) => api.get('/admin/navbars', { params: location ? { location } : {} }),
  getNavbar: (id) => api.get(`/admin/navbars/${id}`),
  updateNavbar: (id, data) => api.patch(`/admin/navbars/${id}`, data),
  updateNavItems: (id, items) => api.patch(`/admin/navbars/${id}/items`, { items }),

  getBlogs: (params) => api.get('/admin/blogs', { params }),
  getBlog: (id) => api.get(`/admin/blogs/${id}`),
  createBlog: (data) => api.post('/admin/blogs', data),
  updateBlog: (id, data) => api.patch(`/admin/blogs/${id}`, data),
  deleteBlog: (id) => api.delete(`/admin/blogs/${id}`),

  getOrders: (params) => api.get('/admin/orders', { params }),
  getLeadOrderCount: () => api.get('/admin/orders/leads/count'),
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => api.patch(`/admin/orders/${id}/status`, data),
  updateOrderPayment: (id, data) => api.patch(`/admin/orders/${id}/payment`, data),
  confirmLeadOrder: (id, data) => api.post(`/admin/orders/${id}/confirm`, data),
  syncOrderPayment: (id) => api.post(`/admin/orders/${id}/sync-payment`),
  cancelLeadOrder: (id, data) => api.post(`/admin/orders/${id}/cancel-lead`, data),
  exportOrdersCsv: (params) => api.get('/admin/orders/export/csv', { params, responseType: 'blob' }),

  adjustStock: (data) => api.post('/admin/inventory/adjust', data),
  getDeliveryLocations: (params) => api.get('/admin/delivery-locations', { params }),
  createDeliveryLocation: (data) => api.post('/admin/delivery-locations', data),
  updateDeliveryLocation: (id, data) => api.patch(`/admin/delivery-locations/${id}`, data),
  deleteDeliveryLocation: (id) => api.delete(`/admin/delivery-locations/${id}`),

  getDeliveryGroups: (params) => api.get('/admin/delivery-groups', { params }),
  getDeliveryGroup: (id) => api.get(`/admin/delivery-groups/${id}`),
  getDeliveryGroupProducts: (id) => api.get(`/admin/delivery-groups/${id}/products`),
  createDeliveryGroup: (data) => api.post('/admin/delivery-groups', data),
  updateDeliveryGroup: (id, data) => api.patch(`/admin/delivery-groups/${id}`, data),
  deleteDeliveryGroup: (id) => api.delete(`/admin/delivery-groups/${id}`),

  getDeliveryZones: (params) => api.get('/admin/delivery-groups', { params }),

  getCoupons: (params) => api.get('/admin/coupons', { params }),
  getCouponUsageReport: (params) => api.get('/admin/coupons/report', { params }),
  getCoupon: (id) => api.get(`/admin/coupons/${id}`),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.patch(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),

  getReminders: (params) => api.get('/admin/reminders', { params }),
  sendReminder: (id, data) => api.post(`/admin/reminders/${id}/send`, data),
  whatsAppReminder: (id, data) => api.post(`/admin/reminders/${id}/whatsapp`, data || {}),

  getCustomers: (params) => api.get('/admin/users', { params }),
  getCustomer: (id) => api.get(`/admin/users/${id}`),
  toggleCustomerStatus: (id) => api.patch(`/admin/users/${id}/toggle-status`),

  getStaffMeta: () => api.get('/admin/staff/meta'),
  getStaff: (params) => api.get('/admin/staff', { params }),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.patch(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),

  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),

  uploadImage: (file, meta = {}) => {
    const form = new FormData();
    form.append('image', file);
    if (meta.alt) form.append('alt', meta.alt);
    if (meta.tags) form.append('tags', Array.isArray(meta.tags) ? meta.tags.join(',') : meta.tags);
    if (meta.category) form.append('category', meta.category);
    if (meta.sourceContext) form.append('sourceContext', meta.sourceContext);
    if (meta.sourceLabel) form.append('sourceLabel', meta.sourceLabel);
    return api.post('/admin/upload', form);
  },
  uploadImages: (files, meta = {}) => {
    const form = new FormData();
    [...files].forEach((file) => form.append('images', file));
    if (meta.alt) form.append('alt', meta.alt);
    if (meta.tags) form.append('tags', Array.isArray(meta.tags) ? meta.tags.join(',') : meta.tags);
    if (meta.category) form.append('category', meta.category);
    if (meta.sourceContext) form.append('sourceContext', meta.sourceContext);
    if (meta.sourceLabel) form.append('sourceLabel', meta.sourceLabel);
    return api.post('/admin/upload/batch', form);
  },
  uploadImageUrl: (url, alt, meta = {}) =>
    api.post('/admin/upload', {
      url,
      alt,
      tags: meta.tags,
      category: meta.category,
      sourceContext: meta.sourceContext,
      sourceLabel: meta.sourceLabel,
    }),

  getMedia: (params) => api.get('/admin/media', { params }),
  getMediaItem: (id) => api.get(`/admin/media/${id}`),
  updateMedia: (id, data) => api.patch(`/admin/media/${id}`, data),
  deleteMedia: (id) => api.delete(`/admin/media/${id}`),

  getApiPartners: (params) => api.get('/admin/api-partners', { params }),
  getApiPartner: (id) => api.get(`/admin/api-partners/${id}`),
  createApiPartner: (data) => api.post('/admin/api-partners', data),
  updateApiPartner: (id, data) => api.patch(`/admin/api-partners/${id}`, data),
  deleteApiPartner: (id) => api.delete(`/admin/api-partners/${id}`),
  resetApiPartnerCredentials: (id) => api.post(`/admin/api-partners/${id}/reset-credentials`),
  getApiPartnerLogs: (id, params) => api.get(`/admin/api-partners/${id}/logs`, { params }),
  downloadApiPartnerDocs: (id) => api.get(`/admin/api-partners/${id}/documentation`, { responseType: 'blob' }),

  getPartnerExplorerReport: (params) => api.get('/admin/api-partners/reports/explorer', { params }),
  exportPartnerReportCsv: (params) =>
    api.get('/admin/api-partners/reports/export', { params, responseType: 'blob' }),

  getFinancePnl: (params) => api.get('/admin/finance/pnl', { params }),
  exportFinancePnlCsv: (params) => api.get('/admin/finance/pnl/export', { params, responseType: 'blob' }),
  getFinanceStock: (params) => api.get('/admin/finance/stock', { params }),
  exportFinanceStockCsv: (params) => api.get('/admin/finance/stock/export', { params, responseType: 'blob' }),
  getFinanceVendors: (params) => api.get('/admin/finance/vendors', { params }),
  exportFinanceVendorsCsv: (params) => api.get('/admin/finance/vendors/export', { params, responseType: 'blob' }),
  getFinanceVendor: (id) => api.get(`/admin/finance/vendors/${id}`),
  createFinanceVendor: (data) => api.post('/admin/finance/vendors', data),
  updateFinanceVendor: (id, data) => api.patch(`/admin/finance/vendors/${id}`, data),
  deleteFinanceVendor: (id) => api.delete(`/admin/finance/vendors/${id}`),
  getFinancePurchases: (params) => api.get('/admin/finance/purchases', { params }),
  getFinancePurchaseReport: (params) => api.get('/admin/finance/purchases/report', { params }),
  exportFinancePurchaseReportCsv: (params) =>
    api.get('/admin/finance/purchases/report/export', { params, responseType: 'blob' }),
  getFinanceSalesLedger: (params) => api.get('/admin/finance/sales', { params }),
  exportFinanceSalesLedgerCsv: (params) =>
    api.get('/admin/finance/sales/export', { params, responseType: 'blob' }),
  createFinancePurchase: (data) => api.post('/admin/finance/purchases', data),
  deleteFinancePurchase: (id) => api.delete(`/admin/finance/purchases/${id}`),
  getFinanceExpenses: (params) => api.get('/admin/finance/expenses', { params }),
  exportFinanceExpensesCsv: (params) => api.get('/admin/finance/expenses/export', { params, responseType: 'blob' }),
  createFinanceExpense: (data) => api.post('/admin/finance/expenses', data),
  deleteFinanceExpense: (id) => api.delete(`/admin/finance/expenses/${id}`),
  getTreasuryAccounts: () => api.get('/admin/finance/treasury/accounts'),
  createTreasuryAccount: (data) => api.post('/admin/finance/treasury/accounts', data),
  adjustTreasuryBalance: (id, data) => api.post(`/admin/finance/treasury/accounts/${id}/adjust-balance`, data),
  getTreasuryTransactions: (params) => api.get('/admin/finance/treasury/transactions', { params }),
  exportFinanceTreasuryCsv: (params) =>
    api.get('/admin/finance/treasury/transactions/export', { params, responseType: 'blob' }),
  createTreasuryTransaction: (data) => api.post('/admin/finance/treasury/transactions', data),
};
