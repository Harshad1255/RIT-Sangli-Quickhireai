import axios from 'axios';
import { getApiBaseUrl, logApiConfig } from '../../config/api.js';

// Log the current API configuration for debugging
logApiConfig();

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 120000, // 120 second timeout for complex AI generation tasks
  maxRetries: 3, // Number of retries
  retryDelay: 1000 // Delay between retries in milliseconds
});

// Add request interceptor for token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Handle network errors or timeouts
    if (!error.response) {
      console.error('Network/Timeout Error:', error);
      
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < originalRequest.maxRetries) {
        originalRequest._retryCount += 1;
        console.log(`Retrying API call... Attempt ${originalRequest._retryCount}`);
        await new Promise(resolve => setTimeout(resolve, originalRequest.retryDelay));
        return api(originalRequest);
      }
      throw new Error(error.code === 'ECONNABORTED' ? 'AI Generation is taking longer than expected. Please try requesting fewer questions.' : 'Unable to connect to server. Please check your internet connection.');
    }

    // Handle specific error codes
    // Try a refresh flow on 401 before forcing logout
    if (error.response.status === 401) {
      try {
        // avoid infinite loops
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          // attempt refresh using a refresh token if present
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const refreshRes = await api.post('/auth/refresh', { token: refreshToken });
              const newToken = refreshRes.data?.token;
              if (newToken) {
                localStorage.setItem('token', newToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
              }
            } catch (refreshErr) {
              // refresh failed, fall through to logout
              console.warn('Token refresh failed:', refreshErr?.message || refreshErr);
            }
          }
        }
      } catch (e) {
        console.error('Error handling 401:', e);
      }

      // If refresh not available or failed, clear session and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    switch (error.response.status) {
      case 400:
        throw new Error(error.response.data?.error || 'Invalid request. Please check your input.');

      case 404:
        throw new Error(error.response.data?.error || 'Resource not found. Please check the URL.');

      case 429:
        throw new Error(error.response.data?.error || 'Too many requests. Please wait a moment and try again.');

      case 503:
        throw new Error(error.response.data?.error || 'Service unavailable. Please try again later.');

      case 500:
        throw new Error(error.response.data?.error || 'Server error. Please try again later.');

      default:
        throw new Error(error.response.data?.error || 'An unexpected error occurred');
    }
  }
);

export { api }; 