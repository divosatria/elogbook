// Application Constants and Enums
export const APP_CONFIG = {
  NAME: 'E-Logbook Nelayan',
  VERSION: '1.0.0',
  API: {
    BASE_URL: process.env.NODE_ENV === 'production' 
      ? 'https://api.e-logbook.id' 
      : 'http://localhost:5000',
    TIMEOUT: 30000
  },
  GPS: {
    UPDATE_INTERVAL: 30000,
    MAX_HISTORY_POINTS: 100,
    OFFLINE_THRESHOLD: 300000
  }
};

export const VESSEL_TYPES = {
  PENANGKAP_IKAN: {
    code: 'penangkap_ikan',
    name: 'Kapal Penangkap Ikan',
    minBensinPercentage: 80,
    minEsPercentage: 70,
    maxDuration: 14
  },
  PENGANGKUT_IKAN: {
    code: 'pengangkut_ikan',
    name: 'Kapal Pengangkut Ikan',
    minBensinPercentage: 90,
    minEsPercentage: 80,
    maxDuration: 7
  }
};

export const TRIP_STATUS = {
  MENUNGGU_IZIN: {
    code: 'menunggu_izin',
    label: 'Menunggu Izin',
    color: 'amber',
    isEditable: true,
    isFinal: false
  },
  DISETUJUI: {
    code: 'disetujui',
    label: 'Disetujui',
    color: 'blue',
    isEditable: false,
    isFinal: false
  },
  SELESAI: {
    code: 'selesai',
    label: 'Selesai',
    color: 'green',
    isEditable: false,
    isFinal: true
  },
  DITOLAK: {
    code: 'ditolak',
    label: 'Ditolak',
    color: 'red',
    isEditable: false,
    isFinal: true
  }
};

export const ZONE_TYPES = {
  FISHING: {
    code: 'fishing',
    label: 'Zona Tangkap',
    color: '#3b82f6'
  },
  RESTRICTED: {
    code: 'restricted',
    label: 'Zona Terlarang',
    color: '#ef4444'
  },
  CONSERVATION: {
    code: 'conservation',
    label: 'Zona Konservasi',
    color: '#10b981'
  }
};

export const FISH_TYPES = [
  'Tuna', 'Cakalang', 'Tongkol', 'Kembung', 'Teri', 'Baronang',
  'Kakap', 'Kerapu', 'Tenggiri', 'Layur', 'Udang', 'Kepiting'
];

export const USER_ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  SUPERVISOR: 'supervisor',
  NAHKODA: 'nahkoda',
  ABK: 'abk',
  NELAYAN: 'nelayan'
};

// Mock data for development
export const MOCK_WEATHER = {
  temperature: 28,
  humidity: 75,
  windSpeed: 15,
  windDirection: 'SW',
  waveHeight: 1.2,
  visibility: 10,
  condition: 'Partly Cloudy',
  safetyLevel: 'SAFE' as const
};

export const MOCK_ZONES = [
  {
    id: 1,
    name: 'Zona Pelabuhan Utama',
    radiusKm: 5,
    safetyLevel: 'SAFE' as const,
    weatherNote: 'Kondisi cuaca stabil, aman untuk berlabuh dan bongkar muat'
  },
  {
    id: 2,
    name: 'Area Tangkap Tuna',
    radiusKm: 15,
    safetyLevel: 'CAUTION' as const,
    weatherNote: 'Gelombang sedang, perhatikan kondisi angin sore hari'
  },
  {
    id: 3,
    name: 'Zona Konservasi',
    radiusKm: 8,
    safetyLevel: 'DANGER' as const,
    weatherNote: 'Cuaca buruk, hindari area ini hingga kondisi membaik'
  }
];