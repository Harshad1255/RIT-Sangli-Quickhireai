// API Configuration
// Update these URLs based on your deployment

export const API_CONFIG = {
  // Your actual Render backend URL
  RENDER_BACKEND_URL: 'https://quickhireai.onrender.com',
  // Updated to match local backend server started by nodemon
  LOCAL_BACKEND_URL: 'http://localhost:5009',

  // Your Vercel frontend URL
  VERCEL_FRONTEND_URL: 'https://quick-hire-ai.vercel.app'
};

// Helper function to get the correct API base URL.
// Prefer the local backend during development so the app can run against
// the server started in this workspace. Fall back to the public Render URL
// when the app is deployed in production.
export const getApiBaseUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDev) {
    return `${API_CONFIG.LOCAL_BACKEND_URL}/api`;
  }

  return `${API_CONFIG.RENDER_BACKEND_URL}/api`;
};

export const getHealthcheckUrl = () => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDev) {
    return `${API_CONFIG.LOCAL_BACKEND_URL}/healthcheck`;
  }

  return `${API_CONFIG.RENDER_BACKEND_URL}/healthcheck`;
};

// Debug function to log current configuration
export const logApiConfig = () => {
  console.log('🌐 API Configuration:', {
    currentHostname: window.location.hostname,
    apiBaseUrl: getApiBaseUrl(),
    healthcheckUrl: getHealthcheckUrl(),
    renderBackendUrl: API_CONFIG.RENDER_BACKEND_URL
  });
}; 