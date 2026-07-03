import api from './client.js';

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getCatalogStats: () => api.get('/admin/products/stats'),
  getProducts: (params) => api.get('/admin/products', { params }),
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.patch(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  cloneProduct: (id) => api.post(`/admin/products/${id}/clone`),
  importProducts: (products) => api.post('/admin/products/import', { products }),
  exportProducts: () => api.get('/admin/products/export', { responseType: 'blob' }),

  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.patch(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  getSettings: (group) => api.get('/admin/settings', { params: group ? { group } : {} }),
  bulkUpdateSettings: (settings) => api.patch('/admin/settings/bulk', { settings }),
  testSmtp: (email) => api.post('/admin/settings/test-smtp', { email }),
  syncNrbRates: () => api.post('/admin/settings/sync-nrb-rates'),

  getCmsPages: (params) => api.get('/admin/cms', { params }),
  getCmsPage: (id) => api.get(`/admin/cms/${id}`),
  createCmsPage: (data) => api.post('/admin/cms', data),
  setupHomePage: () => api.post('/admin/cms/setup-home'),
  updateCmsPage: (id, data) => api.patch(`/admin/cms/${id}`, data),
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
  cancelLeadOrder: (id, data) => api.post(`/admin/orders/${id}/cancel-lead`, data),

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

  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),

  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/admin/upload', form);
  },
  uploadImages: (files) => {
    const form = new FormData();
    [...files].forEach((file) => form.append('images', file));
    return api.post('/admin/upload/batch', form);
  },
  uploadImageUrl: (url, alt) => api.post('/admin/upload', { url, alt }),
};
