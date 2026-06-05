// Environment Configuration
export const ENV = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // API Configuration - pastikan sesuai dengan backend
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  
  // App Configuration
  APP_NAME: 'E-Logbook Maritime',
  APP_VERSION: '1.0.0'
};

export default ENV;