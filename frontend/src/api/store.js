import api from './client.js';

export const storeApi = {
  getSettings: () => api.get('/store/settings'),
  getNavbar: (location) => api.get('/store/navbar', { params: location ? { location } : {} }),
  getProducts: (params) => api.get('/store/products', { params }),
  getProduct: (slug) => api.get(`/store/products/${slug}`),
  getCategories: (params) => api.get('/store/categories', { params }),
  getBlogs: (params) => api.get('/store/blogs', { params }),
  getBlog: (slug) => api.get(`/store/blogs/${slug}`),
  getPages: (params) => api.get('/store/pages', { params }),
  getPage: (slug) => api.get(`/store/pages/${slug}`),
  getPageByType: (pageType) => api.get(`/store/pages/type/${pageType}`),
  getDeliveryLocations: () => api.get('/store/delivery-locations'),
  getDeliveryZones: () => api.get('/store/delivery-zones'),
  getPaymentGateways: (currency) => api.get('/store/payment-gateways', { params: currency ? { currency } : {} }),
  validateCoupon: (data) => api.post('/store/coupons/validate', data),
  checkoutQuote: (data) => api.post('/store/checkout/quote', data),
  createOrder: (data) => api.post('/store/orders', data),
  trackOrder: (params) => api.get('/store/orders/track', { params }),
  getMyReminders: () => api.get('/store/reminders/my'),
  createReminder: (data) => api.post('/store/reminders', data),
  updateReminder: (id, data) => api.patch(`/store/reminders/${id}`, data),
  deleteReminder: (id) => api.delete(`/store/reminders/${id}`),
  uploadPersonalizationImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/store/upload/personalization', form);
  },
};
