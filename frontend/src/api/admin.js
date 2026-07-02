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

  getCmsPages: (params) => api.get('/admin/cms', { params }),
  getCmsPage: (id) => api.get(`/admin/cms/${id}`),
  createCmsPage: (data) => api.post('/admin/cms', data),
  updateCmsPage: (id, data) => api.patch(`/admin/cms/${id}`, data),
  updateCmsBlocks: (id, blocks) => api.patch(`/admin/cms/${id}/blocks`, { blocks }),
  deleteCmsPage: (id) => api.delete(`/admin/cms/${id}`),

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

  adjustStock: (data) => api.post('/admin/inventory/adjust', data),
  getDeliveryZones: () => api.get('/admin/delivery-zones'),
  createDeliveryZone: (data) => api.post('/admin/delivery-zones', data),
  updateDeliveryZone: (id, data) => api.patch(`/admin/delivery-zones/${id}`, data),
  deleteDeliveryZone: (id) => api.delete(`/admin/delivery-zones/${id}`),

  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),

  uploadImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadImageUrl: (url, alt) => api.post('/admin/upload', { url, alt }),
};
