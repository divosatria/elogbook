// src/config/api.ts

/**
 * Deteksi environment dan tentukan Base URL API
 * Priority:
 * 1. VITE_API_BASE_URL dari env
 * 2. Default DEV  -> http://localhost:5000
 * 3. Default PROD -> https://api.elogbook.id
 */
const getBaseURL = (): string => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // Jika ENV tersedia, selalu pakai ENV
  if (envBaseUrl && envBaseUrl.trim() !== '') {
    return envBaseUrl;
  }

  // Fallback berdasarkan mode
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }

  // Production fallback
  return 'https://api.elogbook.id';
};

export const API_BASE_URL = getBaseURL();

/**
 * Helper builder URL
 * contoh:
 * apiUrl('/api/perangkat/1')
 */
export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    return `${API_BASE_URL}/${path}`;
  }
  return `${API_BASE_URL}${path}`;
};

/**
 * Centralized API Endpoints
 * Gunakan ini agar konsisten & mudah maintenance
 */
export const API_ENDPOINTS = {
  // Auth
  auth: apiUrl('/api/auth'),

  // Master Data
  vessels: apiUrl('/api/kapal'),
  fishermen: apiUrl('/api/nahkoda'),
  users: apiUrl('/api/users'),

  // Operasional
  trips: apiUrl('/api/trip'),
  emergency: apiUrl('/api/emergency'),
  dashboard: apiUrl('/api/dashboard'),
  mobile: apiUrl('/api/mobile'),

  // Perangkat
  devices: apiUrl('/api/perangkat'),
  deviceStatistics: apiUrl('/api/perangkat/statistics'),

  // Report & GIS
  reports: apiUrl('/api/hasil-tangkap'),
  catchPolygons: apiUrl('/api/catch-polygons'),
  harborZones: apiUrl('/api/harbor-zones'),

  // External / Utility
  weather: apiUrl('/api/weather'),
  fishPrices: apiUrl('/api/fish-prices'),
};

/**
 * Debug helper (hapus jika sudah stabil)
 */
// console.log('API_BASE_URL:', API_BASE_URL);
// console.table(API_ENDPOINTS);
