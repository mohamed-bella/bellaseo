import axios from 'axios';
import Cookies from 'js-cookie';
import { getCached, setCached } from '@/lib/apiCache';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  // Abort requests that hang longer than 15s
  timeout: 15000,
});

// Inject auth token
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('seo_admin_token') || (typeof window !== 'undefined' ? localStorage.getItem('seo_admin_token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Cache GET responses + handle 401
apiClient.interceptors.response.use((response) => {
  const { method, url } = response.config;
  // Cache only successful GETs — skip mutating endpoints
  if (method === 'get' && url && response.status === 200) {
    const key = url + (response.config.params ? JSON.stringify(response.config.params) : '');
    setCached(key, response.data);
  }
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      console.warn('[apiClient] 401 — redirecting to /login');
      Cookies.remove('seo_admin_token', { path: '/' });
      localStorage.removeItem('seo_user');
      localStorage.removeItem('seo_admin_token');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

// Wrap GET with cache-first lookup (20s TTL)
const originalGet = apiClient.get.bind(apiClient);
apiClient.get = (url: string, config?: any) => {
  const cacheKey = url + (config?.params ? JSON.stringify(config.params) : '');
  const hit = getCached(cacheKey, 20_000);
  if (hit !== null) return Promise.resolve({ data: hit, status: 200, cached: true } as any);
  return originalGet(url, config);
};

export default apiClient;
