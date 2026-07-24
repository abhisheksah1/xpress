import axios from 'axios';

const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const onPaymentCallback = path.startsWith('/checkout/') && path.includes('callback')
        || path.includes('/checkout/esewa/')
        || path.includes('/checkout/sandbox/');

      try {
        const { data } = await axios.post(`${apiBase}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(error.config);
      } catch {
        // Never force-logout during payment return — guest checkout must still verify.
        if (onPaymentCallback) {
          return Promise.reject(error);
        }
        localStorage.removeItem('accessToken');
        const loginPath = path.startsWith('/admin') ? '/admin/login' : '/login';
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
