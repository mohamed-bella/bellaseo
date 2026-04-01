import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject the Bearer token
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('seo_admin_token') || (typeof window !== 'undefined' ? localStorage.getItem('seo_admin_token') : null);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add a response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // If we're not already on the login page, log out and redirect
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      Cookies.remove('seo_admin_token');
      localStorage.removeItem('seo_user');
      localStorage.removeItem('seo_admin_token');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default apiClient;
