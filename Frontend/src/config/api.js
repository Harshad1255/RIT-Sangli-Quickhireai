// API Configuration
// Update these URLs based on your deployment

export const API_CONFIG = {
  // Your actual Render backend URL
  RENDER_BACKEND_URL: 'https://quickhireai.onrender.com',
  // Match the active local backend port in this workspace
  LOCAL_BACKEND_URL: (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5001',

  // Your Vercel frontend URL
  VERCEL_FRONTEND_URL: 'https://quick-hire-ai.vercel.app'
};

export const getApiBaseUrl = () => {
  // If an environment variable is specifically set, use it.
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }

  // Fallback behavior
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDev) {
    return 'http://localhost:5001/api';
  }

  // Final fallback (production default if VITE_API_URL is missing)
  return 'https://quickhireai.onrender.com/api';
};

export const getHealthcheckUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/healthcheck`;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDev) {
    return 'http://localhost:5001/healthcheck';
  }

  return 'https://quickhireai.onrender.com/healthcheck';
};

// Debug function to log current configuration
export const logApiConfig = () => {
  console.log('🌐 API Configuration:', {
    currentHostname: typeof window !== 'undefined' ? window.location.hostname : 'ssr',
    apiBaseUrl: getApiBaseUrl(),
    healthcheckUrl: getHealthcheckUrl()
  });
};