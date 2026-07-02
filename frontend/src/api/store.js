import api from './client.js';

export const storeApi = {
  getSettings: () => api.get('/store/settings'),
  getNavbar: (location) => api.get('/store/navbar', { params: location ? { location } : {} }),
  getProducts: (params) => api.get('/store/products', { params }),
  getProduct: (slug) => api.get(`/store/products/${slug}`),
  getCategories: () => api.get('/store/categories'),
  getBlogs: (params) => api.get('/store/blogs', { params }),
  getBlog: (slug) => api.get(`/store/blogs/${slug}`),
  getPages: (params) => api.get('/store/pages', { params }),
  getPage: (slug) => api.get(`/store/pages/${slug}`),
  getPageByType: (pageType) => api.get(`/store/pages/type/${pageType}`),
  getDeliveryZones: () => api.get('/store/delivery-zones'),
};
