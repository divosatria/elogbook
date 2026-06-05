/**
 * Centralized API Configuration
 * Konfigurasi URL dilakukan melalui file .env:
 * - VITE_API_BASE_URL=http://192.168.1.39:5000 (development)
 * - VITE_API_BASE_URL=https://elogbookipb.web.id (production)
 */

// Base Configuration - Nilai diambil dari .env, fallback ke localhost
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
  API_PREFIX: "/api",
};

// Export API_CONFIG for use in backendService
export { API_CONFIG };

// Helper function
const buildUrl = (endpoint: string): string =>
  `${API_CONFIG.API_PREFIX}${endpoint}`;

export const getAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Ensure we don't duplicate the /api or /uploads prefix
  let cleanPath = path;
  if (cleanPath.startsWith('/api')) {
    cleanPath = cleanPath.substring(4);
  }
  
  // Combine base URL with cleaned path
  const fullPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${API_CONFIG.BASE_URL}${fullPath}`;
};

// All API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: buildUrl("/auth/login"),
    REGISTER: buildUrl("/auth/register"),
    PROFILE: buildUrl("/auth/profile"),
    MOBILE_LOGIN: buildUrl("/mobile/login"),
  },

  // Dashboard
  DASHBOARD: buildUrl("/dashboard"),

  // Vessels (Kapal) - sesuai dengan backend routes
  VESSELS: {
    LIST: buildUrl("/kapal"),
    BY_ID: (id: string) => buildUrl(`/kapal/${id}`),
    CREW_INFO: (id: string) => buildUrl(`/kapal/${id}/crew-info`),
    GPS_DEVICES: buildUrl("/kapal/gps-devices"),
    ACTIVE: buildUrl("/kapal/active"),
  },

  // Users
  USERS: {
    LIST: buildUrl("/users"),
    BY_ID: (id: string) => buildUrl(`/users/${id}`),
    BY_ROLE: (roles: string) => buildUrl(`/users?role=${roles}`),
    TOGGLE_STATUS: (id: string) => buildUrl(`/users/${id}/toggle-status`),
  },

  // Trips
  TRIPS: {
    LIST: buildUrl("/trip"),
    BY_ID: (id: string) => buildUrl(`/trip/${id}`),
    STATUS: (id: string) => buildUrl(`/trip/${id}/status`),
    COMPLETE: (id: string) => buildUrl(`/trip/${id}/complete`),
  },

  // Trip Tasks (Tugas Trip)
  TRIP_TASKS: {
    LIST: buildUrl("/trip-tasks"),
    BY_TRIP_ID: (tripId: string) => buildUrl(`/trip-tasks/trip/${tripId}`),
    PENDING: buildUrl("/trip-tasks/pending"),
    BY_ID: (id: string) => buildUrl(`/trip-tasks/${id}`),
    CREATE: buildUrl("/trip-tasks"),
    UPDATE: (id: string) => buildUrl(`/trip-tasks/${id}`),
    COMPLETE: (id: string) => buildUrl(`/trip-tasks/${id}/complete`),
    DELETE: (id: string) => buildUrl(`/trip-tasks/${id}`),
  },

  // Operational Tasks (Tugas Operasional) - TEMPORARY DISABLED due to 500 error
  OPERATIONAL_TASKS: {
    LIST: buildUrl("/operational-tasks"), // ❌ 500 Error - Backend issue
    BY_ID: (id: string) => buildUrl(`/operational-tasks/${id}`),
    CREATE: buildUrl("/operational-tasks"),
    UPDATE: (id: string) => buildUrl(`/operational-tasks/${id}`),
    COMPLETE: (id: string) => buildUrl(`/operational-tasks/${id}/complete`),
    DELETE: (id: string) => buildUrl(`/operational-tasks/${id}`),
    BY_ZONE: (zoneId: string) => buildUrl(`/operational-tasks/zone/${zoneId}`),
  },

  // Emergency/SOS
  EMERGENCY: {
    LIST: buildUrl("/emergency"),
    BY_ID: (id: string) => buildUrl(`/emergency/${id}`),
    RESOLVE: (id: string) => buildUrl(`/emergency/${id}/resolve`),
  },

  // Weather endpoints
  WEATHER: {
    BASE: buildUrl("/weather"),
    CURRENT: buildUrl("/weather/current"),
    SAFETY_CHECK: buildUrl("/weather/safety-check"),
  },

  // Fishermen (Nahkoda) - sesuaikan dengan backend
  FISHERMEN: {
    LIST: buildUrl("/nahkoda"),
    BY_ID: (id: string) => buildUrl(`/nahkoda/${id}`),
  },

  // Catch Reports (Hasil Tangkap)
  CATCH: {
    LIST: buildUrl("/hasil-tangkap"),
    BY_ID: (id: string) => buildUrl(`/hasil-tangkap/${id}`),
    STATS: buildUrl("/hasil-tangkap/stats"),
  },

  // Fishing Points (Titik Jaring)
  FISHING_POINTS: {
    LIST: buildUrl("/fishing-points"),
    ACTIVE: buildUrl("/fishing-points/active"),
    SUBMIT: buildUrl("/mobile/fishing-point"),
  },

  // Fish Prices
  FISH_PRICES: {
    LIST: buildUrl("/fish-prices"),
    BY_ID: (id: string) => buildUrl(`/fish-prices/${id}`),
  },

  // Catch Polygons
  CATCH_POLYGONS: {
    LIST: buildUrl("/catch-polygons"),
    BY_ID: (id: string) => buildUrl(`/catch-polygons/${id}`),
    TOGGLE_STATUS: (id: string) =>
      buildUrl(`/catch-polygons/${id}/toggle-status`),
    CHECK_POINT: buildUrl("/catch-polygons/check-point"),
  },

  // Harbor Zones
  HARBOR_ZONES: {
    LIST: buildUrl("/harbor-zones"),
    BY_ID: (id: string) => buildUrl(`/harbor-zones/${id}`),
  },

  // Monitoring
  MONITORING: {
    DATA: buildUrl("/monitoring/data"),
    VESSELS_BY_ZONE: (zoneId: string) =>
      buildUrl(`/monitoring/zones/${zoneId}/vessels`),
    UPDATE_VESSEL_ZONE: (tripId: string) =>
      buildUrl(`/monitoring/vessels/${tripId}/zone`),
    UPDATE_VESSEL_LOCATION: (tripId: string) =>
      buildUrl(`/monitoring/vessels/${tripId}/location`),
    VESSEL_REALTIME: (tripId: string) =>
      buildUrl(`/monitoring/vessels/${tripId}/realtime`),
  },

  // Mobile - sesuai dengan backend mobile routes
  MOBILE: {
    LOGIN: buildUrl("/mobile/login"),
    DASHBOARD: buildUrl("/mobile/dashboard"),
    PROFILE: {
      BASE: buildUrl("/mobile/profile"),
      DOCUMENTS: {
        UPLOAD: buildUrl("/mobile/profile/documents"),
        LIST: buildUrl("/mobile/profile/documents"),
        DELETE: (docId: string) =>
          buildUrl(`/mobile/profile/documents/${docId}`),
      },
    },
    VESSEL: {
      MY_VESSEL: buildUrl("/mobile/vessel/my-vessel"),
      BY_ID: (id: string) => buildUrl(`/mobile/vessel/${id}`),
      DOCUMENTS: (id: string) => buildUrl(`/mobile/vessel/${id}/documents`),
      STORAGE_DATA: (id: string) =>
        buildUrl(`/mobile/vessel/${id}/storage-data`),
      FUEL_DATA: (id: string) => buildUrl(`/mobile/vessel/${id}/bahan-bakar`),
      CERTIFICATE: (id: string) =>
        buildUrl(`/mobile/vessel/${id}/sertifikat-jalan`),
    },
    CATCHES: {
      LIST: buildUrl("/mobile/catches"),
      SUBMIT: buildUrl("/mobile/catches"),
    },
    TRIP: {
      READINESS: (id: string) => buildUrl(`/mobile/trip/${id}/readiness`),
      START: (id: string) => buildUrl(`/mobile/trip/${id}/start`),
      COMPLETE: (id: string) => buildUrl(`/mobile/trip/${id}/complete`),
    },
    LOCATION: buildUrl("/mobile/location"),
    SOS: buildUrl("/mobile/sos"),
  },

  // Admin - sesuai dengan backend admin routes
  ADMIN: {
    // Trip Management & Perijinan
    TRIP: {
      CREATE: buildUrl("/admin/trip"),
      CREATE_WITH_CREW: buildUrl("/admin/trip/with-crew"),
      PENDING: buildUrl("/admin/trips/pending"),
      DOCUMENTS: (id: string) => buildUrl(`/admin/trip/${id}/documents`),
      APPROVE: (id: string) => buildUrl(`/admin/trip/${id}/approve`),
      REJECT: (id: string) => buildUrl(`/admin/trip/${id}/reject`),
    },
    // Live Monitoring
    MONITORING: buildUrl("/admin/live-monitoring"),
    // Document Verification (Perijinan Dokumen)
    DOCUMENTS: {
      PENDING: buildUrl("/profile/admin/pending-documents"),
      APPROVE: (userId: string, docId: string) =>
        buildUrl(
          `/profile/admin/users/${userId}/documents/${docId}/approve`,
        ),
      REJECT: (userId: string, docId: string) =>
        buildUrl(
          `/profile/admin/users/${userId}/documents/${docId}/reject`,
        ),
      DELETE: (userId: string, docId: string) =>
        buildUrl(
          `/profile/admin/users/${userId}/documents/${docId}`,
        ),
    },
  },

  // Health Check - backend menggunakan /health tanpa /api prefix
  HEALTH: `${API_CONFIG.BASE_URL}/health`,
};

// Socket URL
export const SOCKET_URL = API_CONFIG.SOCKET_URL;

// Export for backward compatibility
export const API_URLS = {
  // Authentication
  login: API_ENDPOINTS.AUTH.LOGIN,
  register: API_ENDPOINTS.AUTH.REGISTER,
  profile: API_ENDPOINTS.AUTH.PROFILE,
  mobileLogin: API_ENDPOINTS.AUTH.MOBILE_LOGIN,

  // Core Features
  dashboard: API_ENDPOINTS.DASHBOARD,
  vessels: API_ENDPOINTS.VESSELS.LIST,
  vesselById: API_ENDPOINTS.VESSELS.BY_ID,
  fishermen: API_ENDPOINTS.FISHERMEN.LIST,
  fishermanById: API_ENDPOINTS.FISHERMEN.BY_ID,
  users: API_ENDPOINTS.USERS.LIST,
  userById: API_ENDPOINTS.USERS.BY_ID,
  usersByRole: API_ENDPOINTS.USERS.BY_ROLE,
  usersToggleStatus: API_ENDPOINTS.USERS.TOGGLE_STATUS,

  // Trips & Tasks
  trips: API_ENDPOINTS.TRIPS.LIST,
  tripById: API_ENDPOINTS.TRIPS.BY_ID,
  tripStatus: API_ENDPOINTS.TRIPS.STATUS,
  tripTasks: API_ENDPOINTS.TRIP_TASKS.LIST,
  operationalTasks: API_ENDPOINTS.OPERATIONAL_TASKS.LIST,

  // Emergency & Weather
  emergency: API_ENDPOINTS.EMERGENCY.LIST,
  emergencyById: API_ENDPOINTS.EMERGENCY.BY_ID,
  weather: API_ENDPOINTS.WEATHER.BASE,
  weatherCurrent: API_ENDPOINTS.WEATHER.CURRENT,
  weatherSafetyCheck: API_ENDPOINTS.WEATHER.SAFETY_CHECK,

  // Reports & Monitoring
  reports: API_ENDPOINTS.CATCH.LIST,
  monitoring: API_ENDPOINTS.MONITORING.DATA,

  // Admin & System Features
  analytics: `${API_CONFIG.API_PREFIX}/analytics`,
  settings: `${API_CONFIG.API_PREFIX}/settings`,
  upload: `${API_CONFIG.API_PREFIX}/upload`,
  backup: `${API_CONFIG.API_PREFIX}/backup`,
  notifications: `${API_CONFIG.API_PREFIX}/notifications`,

  // Admin
  ADMIN: API_ENDPOINTS.ADMIN,

  // System
  health: API_ENDPOINTS.HEALTH,
  
  // Mobile
  MOBILE: API_ENDPOINTS.MOBILE,
};

export default API_ENDPOINTS;
