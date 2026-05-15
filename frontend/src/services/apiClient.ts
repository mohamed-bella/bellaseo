import axios from 'axios';
import Cookies from 'js-cookie';
import { getCached, setCached } from '@/lib/apiCache';

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // If we're in the browser and have a relative /api, make it absolute to the current origin
    if (process.env.NEXT_PUBLIC_API_URL === '/api') {
      return `${window.location.origin}/api`;
    }
    return process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api`;
  }
  // Server-side fallback (e.g. for SSR if used)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
};

const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Inject auth token
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('seo_admin_token') || (typeof window !== 'undefined' ? localStorage.getItem('seo_admin_token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

let isRedirecting = false;

// Cache GET responses + handle 401
apiClient.interceptors.response.use((response) => {
  const { method, url } = response.config;
  // Cache only successful GETs — skip mutating endpoints
  if (method === 'get' && url && response.status === 200) {
    const key = url + (response.config.params ? JSON.stringify(response.config.params) : '');
    setCached(key, response.data);
  }
  return response;
}, async (error) => {
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !isRedirecting) {
      isRedirecting = true;
      console.warn('[apiClient] 401 — session invalid, redirecting to login');
      
      Cookies.remove('seo_admin_token', { path: '/' });
      localStorage.removeItem('seo_user');
      localStorage.removeItem('seo_admin_token');
      
      // Small delay to let other parallel requests finish/fail before redirecting
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
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
