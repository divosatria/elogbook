import React, { useState, useEffect, useCallback } from 'react';
import { CloudSun, Wind, AlertTriangle, RefreshCw, MapPin, Thermometer, Shield, ShieldAlert, ShieldCheck, Navigation, Clock, Activity, Droplets, Sun, Cloud, Sunrise, Sunset, Crosshair, Loader2, MousePointer, Anchor, ChevronRight, X, Eye, Locate, Map } from 'lucide-react';


import { API_BASE_URL } from '../config/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// OpenWeatherMap API Response Types
interface OpenWeatherLocation {
  name: string;
  lat: number;
  lon: number;
}

interface OpenWeatherData {
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  pressure_hpa: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  description: string;
  icon: string;
  condition: string;
}

interface OpenWeatherMeta {
  source: string;
  timestamp: string;
  unit: string;
  lang: string;
  sunrise?: string;
  sunset?: string;
}

interface OpenWeatherAlert {
  type: string;
  level: string;
  message: string;
  recommendation: string;
}

interface OpenWeatherAlerts {
  hasAlerts: boolean;
  count: number;
  items: OpenWeatherAlert[];
}

interface SafetyStatus {
  status: string;
  level: string;
  score: number;
  reasons: string[];
  recommendation: string;
}

interface ForecastItem {
  datetime: string;
  timestamp: string;
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  wind_speed_ms: number;
  description: string;
  icon: string;
  condition: string;
  probability_of_precipitation: number;
}

interface OpenWeatherResponse {
  current: {
    location: OpenWeatherLocation;
    weather: OpenWeatherData;
    meta: OpenWeatherMeta;
    alerts: OpenWeatherAlerts;
  };
  forecast: {
    location: OpenWeatherLocation;
    forecasts: ForecastItem[];
    meta: OpenWeatherMeta;
  } | null;
  safety: SafetyStatus;
  meta: OpenWeatherMeta;
}

// Selected Location Weather (includes current + forecast)
interface SelectedLocationWeather {
  current: {
    location: OpenWeatherLocation;
    weather: OpenWeatherData;
    meta: OpenWeatherMeta;
    alerts: OpenWeatherAlerts;
  };
  forecast: {
    location: OpenWeatherLocation;
    forecasts: ForecastItem[];
    meta: OpenWeatherMeta;
  } | null;
  safety: SafetyStatus;
  meta: OpenWeatherMeta;
}

// Catch Zone Weather Types
interface CatchZoneWeather {
  id: number;
  name: string;
  description: string | null;
  zoneType: string;
  color: string;
  center: { lat: number; lng: number };
  current?: {
    location: OpenWeatherLocation;
    weather: OpenWeatherData;
    meta: OpenWeatherMeta;
    alerts: OpenWeatherAlerts;
  };
  forecasts?: ForecastItem[];
  safety?: SafetyStatus;
  meta?: OpenWeatherMeta;
  error?: boolean;
  errorMessage?: string;
}

interface CatchZonesWeatherResponse {
  timestamp: string;
  source: string;
  totalZones: number;
  zones: CatchZoneWeather[];
}

// Map click handler component
interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  isSelectMode: boolean;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onLocationSelect, isSelectMode }) => {
  useMapEvents({
    click: (e) => {
      if (isSelectMode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

const MaritimeWeather: React.FC = () => {
  const [openWeatherData, setOpenWeatherData] = useState<OpenWeatherResponse | null>(null);
  const [selectedLocationWeather, setSelectedLocationWeather] = useState<SelectedLocationWeather | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(true);
  
  // Catch Zones Weather State
  const [catchZonesWeather, setCatchZonesWeather] = useState<CatchZonesWeatherResponse | null>(null);
  const [catchZonesLoading, setCatchZonesLoading] = useState(false);
  const [catchZonesLastUpdate, setCatchZonesLastUpdate] = useState<Date | null>(null);
  const [selectedZone, setSelectedZone] = useState<CatchZoneWeather | null>(null);

  // Fix Leaflet default markers
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  // Fetch weather for selected location (includes forecast)
  const fetchLocationWeather = useCallback(async (lat: number, lng: number) => {
    setLocationLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Use /maritime endpoint to get both current weather and forecast
      const response = await fetch(
        `${API_BASE_URL}/api/weather/openweather/maritime?lat=${lat}&lon=${lng}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('OpenWeather endpoint returned non-JSON');
        setApiError('API tidak tersedia. Pastikan backend sudah running dengan API key yang valid.');
        return;
      }
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSelectedLocationWeather(result.data);
          setSelectedCoords({ lat, lng });
          setApiError(null);
        } else if (result.error || result.data?.error) {
          setApiError(result.message || result.data?.message || 'Gagal mengambil data cuaca');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiError(errorData.message || `Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching location weather:', error);
      setApiError('Tidak dapat terhubung ke server');
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Handle location selection from map
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    fetchLocationWeather(lat, lng);
  }, [fetchLocationWeather]);

  // Handle Current Location
  // Handle Current Location
  const handleCurrentLocation = useCallback(() => {
    // Check for Secure Context (HTTPS) or Localhost
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setApiError('Lokasi tidak tersedia: Geolocation memerlukan koneksi HTTPS.');
      alert('Fitur lokasi memerlukan HTTPS. Silakan akses aplikasi menggunakan protokol aman.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Browser anda tidak mendukung Geolocation');
      return;
    }

    setLocationLoading(true);
    setApiError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchLocationWeather(latitude, longitude);
        // Also zoom to location if in map view
        if (showMap) {
          // This will be handled by the selectedCoords effect implicitly if we were tracking it,
          // but for now fetchLocationWeather updates selectedCoords which markers listen to.
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationLoading(false);
        let errorMessage = 'Gagal mendapatkan lokasi.';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi di browser Anda.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Waktu permintaan lokasi habis. Silakan coba lagi.';
            break;
        }
        
        setApiError(errorMessage);
        alert(errorMessage);
      },
      options
    );
  }, [fetchLocationWeather, showMap]);

  const fetchWeatherData = async () => {
    setLoading(true);
    setApiError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const openWeatherResponse = await fetch(`${API_BASE_URL}/api/weather/openweather/maritime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const contentType = openWeatherResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setApiError('OpenWeatherMap API tidak tersedia. Pastikan API key sudah dikonfigurasi dan backend sudah di-restart.');
      } else if (openWeatherResponse.ok) {
        const result = await openWeatherResponse.json();
        if (result.success && result.data) {
          setOpenWeatherData(result.data);
          setApiError(null);
        } else if (result.data?.error || result.error) {
          setApiError(result.data?.message || result.message || 'OpenWeatherMap API error');
        }
      } else {
        const errorData = await openWeatherResponse.json().catch(() => ({}));
        setApiError(errorData.message || `Error: ${openWeatherResponse.status}`);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setApiError('Terjadi kesalahan saat mengambil data cuaca');
    } finally {
      setLoading(false);
    }
  };

  // Fetch weather for all catch zones
  const fetchCatchZonesWeather = async () => {
    setCatchZonesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/weather/openweather/catch-zones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCatchZonesWeather(result.data);
          setCatchZonesLastUpdate(new Date());
        }
      }
    } catch (error) {
      console.error('Error fetching catch zones weather:', error);
    } finally {
      setCatchZonesLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherData();
    fetchCatchZonesWeather();
    
    // Auto-refresh: general weather every 30 min, catch zones every 10 min
    const weatherInterval = setInterval(fetchWeatherData, 30 * 60 * 1000);
    const zonesInterval = setInterval(fetchCatchZonesWeather, 10 * 60 * 1000);
    
    return () => {
      clearInterval(weatherInterval);
      clearInterval(zonesInterval);
    };
  }, []);

  const getSafetyIcon = (status: string) => {
    switch (status) {
      case 'SAFE': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'CAUTION': return <Shield className="w-5 h-5 text-amber-500" />;
      case 'DANGER': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default: return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  /* WEATHER ICONS HELPER */
  const getWeatherIcon = (icon: string, sizeClass: string = "w-8 h-8") => {
    const iconBase = {
      '01d': { Component: Sun, color: "text-amber-500" },
      '01n': { Component: Sun, color: "text-slate-400" },
      '02d': { Component: CloudSun, color: "text-amber-400" },
      '02n': { Component: CloudSun, color: "text-slate-400" },
      '03d': { Component: Cloud, color: "text-slate-400" },
      '03n': { Component: Cloud, color: "text-slate-500" },
      '04d': { Component: Cloud, color: "text-slate-500" },
      '04n': { Component: Cloud, color: "text-slate-600" },
      '09d': { Component: Droplets, color: "text-blue-500" },
      '09n': { Component: Droplets, color: "text-blue-400" },
      '10d': { Component: Droplets, color: "text-blue-600" },
      '10n': { Component: Droplets, color: "text-blue-500" },
      '11d': { Component: AlertTriangle, color: "text-amber-600" },
      '11n': { Component: AlertTriangle, color: "text-amber-500" },
      '13d': { Component: Cloud, color: "text-cyan-400" },
      '13n': { Component: Cloud, color: "text-cyan-300" },
      '50d': { Component: Cloud, color: "text-slate-300" },
      '50n': { Component: Cloud, color: "text-slate-400" },
    };

    const config = iconBase[icon as keyof typeof iconBase];
    if (!config) return <CloudSun className={`${sizeClass} text-slate-400`} />;
    
    const { Component, color } = config;
    return <Component className={`${sizeClass} ${color}`} />;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Custom marker icon for selected location
  const selectedLocationIcon = L.divIcon({
    html: `<div style="
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" y1="12" x2="18" y2="12"/>
        <line x1="6" y1="12" x2="2" y2="12"/>
        <line x1="12" y1="6" x2="12" y2="2"/>
        <line x1="12" y1="22" x2="12" y2="18"/>
      </svg>
    </div>`,
    className: 'selected-location-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-cyan-50/30 p-4 sm:p-6 lg:p-8 font-sans flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-200 rounded-full animate-spin border-t-cyan-600"></div>
            <CloudSun className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-cyan-600" size={28} />
          </div>
          <p className="text-slate-600 font-medium">Memuat data cuaca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        

        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
              <CloudSun className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Cuaca Maritim
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                Klik di peta untuk melihat cuaca real-time (OpenWeatherMap)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowMap(!showMap)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-200 border ${
                showMap 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>{showMap ? 'Sembunyikan Peta' : 'Tampilkan Peta'}</span>
            </button>
            <button
              onClick={fetchWeatherData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Perbarui</span>
            </button>
          </div>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">{apiError}</p>
              {!apiError?.includes('HTTPS') && !apiError?.includes('Geolocation') && (
                <p className="text-xs text-amber-600 mt-1">
                  Pastikan API key OpenWeatherMap sudah dikonfigurasi di .env backend.
                </p>
              )}
            </div>
          </div>
        )}

        {/* INTERACTIVE MAP SECTION */}
        {showMap && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 rounded-md">
                  <Crosshair className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Peta Interaktif Cuaca</h3>
                  <p className="text-xs text-slate-500">Klik lokasi di peta untuk mendapatkan data cuaca real-time</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCurrentLocation}
                  disabled={locationLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  <Locate className="w-3.5 h-3.5" />
                  <span>Lokasi Saya</span>
                </button>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isSelectMode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>{isSelectMode ? 'Mode Pilih Aktif' : 'Aktifkan Mode Pilih'}</span>
                </button>
                {selectedCoords && (
                  <button
                    onClick={() => {
                      setSelectedCoords(null);
                      setSelectedLocationWeather(null);
                    }}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-medium hover:bg-slate-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row">
              {/* Map */}
              <div className={`${selectedLocationWeather ? 'lg:w-2/3' : 'w-full'} h-[400px] sm:h-[500px] relative`}>
                {isSelectMode && (
                  <div className="absolute top-4 left-4 z-[1000] bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2">
                    <MousePointer className="w-4 h-4" />
                    Klik di peta untuk pilih lokasi
                  </div>
                )}
                {locationLoading && (
                  <div className="absolute top-4 right-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-600">Mengambil cuaca...</span>
                  </div>
                )}
                <MapContainer
                  center={[-6.2, 106.8]}
                  zoom={9}
                  style={{ height: '100%', width: '100%' }}
                  className={isSelectMode ? 'cursor-crosshair' : ''}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OpenStreetMap &copy; CARTO'
                  />
                  <TileLayer
                    url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
                    attribution='&copy; OpenSeaMap'
                  />
                  
                  <MapClickHandler onLocationSelect={handleLocationSelect} isSelectMode={isSelectMode} />
                  
                  {selectedCoords && (
                    <>
                      <Marker 
                        position={[selectedCoords.lat, selectedCoords.lng]}
                        icon={selectedLocationIcon}
                      >
                        <Popup>
                          <div className="text-center min-w-[150px]">
                            <p className="font-semibold text-slate-800">Lokasi Terpilih</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
                            </p>
                            {selectedLocationWeather && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <p className="font-bold text-lg text-slate-800">
                                  {Math.round(selectedLocationWeather.current.weather.temperature_c)}°C
                                </p>
                                <p className="text-xs text-slate-600 capitalize">
                                  {selectedLocationWeather.current.weather.description}
                                </p>
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[selectedCoords.lat, selectedCoords.lng]}
                        radius={5000}
                        pathOptions={{ color: 'blue', fillColor: '#3b82f6', fillOpacity: 0.2 }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
              
              {/* Selected Location Weather Panel */}
              {selectedLocationWeather && (
                <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-white rounded-lg shadow-sm">
                      {getWeatherIcon(selectedLocationWeather.current.weather.icon)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {selectedLocationWeather.current.location.name || 'Lokasi Terpilih'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {selectedCoords?.lat.toFixed(4)}, {selectedCoords?.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-slate-800">
                      {Math.round(selectedLocationWeather.current.weather.temperature_c)}°C
                    </p>
                    <p className="text-slate-600 text-sm capitalize mt-1">
                      {selectedLocationWeather.current.weather.description}
                    </p>
                  </div>
                  
                  {/* Safety Status */}
                  {selectedLocationWeather.safety && (
                    <div className={`p-3 rounded-xl border mb-4 ${
                      selectedLocationWeather.safety.status === 'SAFE' 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : selectedLocationWeather.safety.status === 'CAUTION'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-rose-50 border-rose-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-bold ${
                          selectedLocationWeather.safety.status === 'SAFE' ? 'text-emerald-700' :
                          selectedLocationWeather.safety.status === 'CAUTION' ? 'text-amber-700' : 'text-rose-700'
                        }`}>
                          {selectedLocationWeather.safety.level}
                        </span>
                        <span className="text-xs font-bold">{selectedLocationWeather.safety.score}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            selectedLocationWeather.safety.score >= 80 ? 'bg-emerald-500' :
                            selectedLocationWeather.safety.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${selectedLocationWeather.safety.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Thermometer className="w-3.5 h-3.5" />
                        <span className="text-xs">Terasa</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {Math.round(selectedLocationWeather.current.weather.feels_like_c)}°C
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Droplets className="w-3.5 h-3.5" />
                        <span className="text-xs">Kelembaban</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {selectedLocationWeather.current.weather.humidity_percent}%
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Wind className="w-3.5 h-3.5" />
                        <span className="text-xs">Angin</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {selectedLocationWeather.current.weather.wind_speed_ms} m/s
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs">Tekanan</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {selectedLocationWeather.current.weather.pressure_hpa} hPa
                      </p>
                    </div>
                  </div>
                  
                  {selectedLocationWeather.current.alerts?.hasAlerts && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Peringatan</span>
                      </div>
                      {selectedLocationWeather.current.alerts.items.map((alert, index) => (
                        <p key={index} className="text-xs text-amber-700">{alert.message}</p>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-400">
                      Diperbarui: {new Date(selectedLocationWeather.meta.timestamp).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FORECAST FOR SELECTED LOCATION */}
        {selectedLocationWeather?.forecast?.forecasts && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="p-1.5 bg-green-50 rounded-md">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Prakiraan {selectedLocationWeather.current.location.name || 'Lokasi Terpilih'}</h3>
                <p className="text-xs text-slate-500">Prakiraan 5 hari setiap 3 jam</p>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {selectedLocationWeather.forecast.forecasts.slice(0, 8).map((item, index) => (
                  <div 
                    key={index}
                    className="flex-shrink-0 w-24 bg-gradient-to-br from-green-50 to-cyan-50 rounded-lg p-2.5 text-center hover:shadow-sm transition-all border border-green-100"
                  >
                    <p className="text-[10px] text-slate-500 mb-1.5">
                      {new Date(item.timestamp).toLocaleString('id-ID', { 
                        weekday: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <div className="flex justify-center mb-1.5">
                      {getWeatherIcon(item.icon, "w-6 h-6")}
                    </div>
                    <p className="text-base font-bold text-slate-800">{Math.round(item.temperature_c)}°</p>
                    <p className="text-[10px] text-slate-500 capitalize truncate">{item.description}</p>
                    <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-slate-400">
                      <Wind className="w-2.5 h-2.5" />
                      <span>{item.wind_speed_ms} m/s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LAST UPDATE INFO */}
        {lastUpdate && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Terakhir diperbarui: {lastUpdate.toLocaleString('id-ID')}</span>
            </div>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Sumber: OpenWeatherMap
            </span>
          </div>
        )}





        {/* DEFAULT WEATHER CARD (when no location selected) */}
        {openWeatherData?.current && !selectedLocationWeather && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                      {getWeatherIcon(openWeatherData.current.weather.icon)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600 font-medium text-sm">{openWeatherData.current.location.name}</span>
                      </div>
                      <p className="text-4xl font-bold text-slate-800">
                        {Math.round(openWeatherData.current.weather.temperature_c)}°C
                      </p>
                      <p className="text-slate-500 capitalize mt-1 text-sm">{openWeatherData.current.weather.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Thermometer className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Terasa</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {Math.round(openWeatherData.current.weather.feels_like_c)}°C
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Droplets className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Kelembaban</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {openWeatherData.current.weather.humidity_percent}%
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Wind className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Angin</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {openWeatherData.current.weather.wind_speed_ms} m/s
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Tekanan</span>
                      </div>
                      <p className="text-base font-bold text-slate-800">
                        {openWeatherData.current.weather.pressure_hpa} hPa
                      </p>
                    </div>
                  </div>
                  
                  {/* Sunrise/Sunset */}
                  {openWeatherData.current.meta.sunrise && openWeatherData.current.meta.sunset && (
                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-5 h-5 text-orange-400" />
                        <span className="text-sm text-slate-600">
                          Terbit: {formatTime(openWeatherData.current.meta.sunrise)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sunset className="w-5 h-5 text-orange-600" />
                        <span className="text-sm text-slate-600">
                          Terbenam: {formatTime(openWeatherData.current.meta.sunset)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Safety Status */}
                {openWeatherData.safety && (
                  <div className={`lg:w-72 p-4 rounded-2xl border-2 ${
                    openWeatherData.safety.status === 'SAFE' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : openWeatherData.safety.status === 'CAUTION'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {getSafetyIcon(openWeatherData.safety.status)}
                      <span className={`text-lg font-bold ${
                        openWeatherData.safety.status === 'SAFE' 
                          ? 'text-emerald-700' 
                          : openWeatherData.safety.status === 'CAUTION'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}>
                        {openWeatherData.safety.level}
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">Skor Keamanan</span>
                        <span className={`font-bold ${
                          openWeatherData.safety.score >= 80 ? 'text-emerald-600' :
                          openWeatherData.safety.score >= 60 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {openWeatherData.safety.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            openWeatherData.safety.score >= 80 ? 'bg-emerald-500' :
                            openWeatherData.safety.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${openWeatherData.safety.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{openWeatherData.safety.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FORECAST SECTION */}
        {openWeatherData?.forecast?.forecasts && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
              <div className="p-1.5 bg-blue-50 rounded-md">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Prakiraan 5 Hari</h3>
                <p className="text-xs text-slate-500">Prakiraan cuaca setiap 3 jam dari OpenWeatherMap</p>
              </div>
            </div>
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {openWeatherData.forecast.forecasts.slice(0, 8).map((item, index) => (
                  <div 
                    key={index}
                    className="flex-shrink-0 w-24 bg-slate-50 rounded-lg p-2.5 text-center hover:bg-slate-100 transition-colors"
                  >
                    <p className="text-[10px] text-slate-500 mb-1.5">
                      {new Date(item.timestamp).toLocaleString('id-ID', { 
                        weekday: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <div className="flex justify-center mb-1.5">
                      {getWeatherIcon(item.icon, "w-6 h-6")}
                    </div>
                    <p className="text-base font-bold text-slate-800">{Math.round(item.temperature_c)}°</p>
                    <p className="text-[10px] text-slate-500 capitalize truncate">{item.description}</p>
                    <div className="flex items-center justify-center gap-1 mt-1.5 text-[10px] text-slate-400">
                      <Wind className="w-2.5 h-2.5" />
                      <span>{item.wind_speed_ms} m/s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CUACA LAUT PER ZONA TANGKAP */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-cyan-50 rounded-md">
                <Anchor className="w-4 h-4 text-cyan-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Cuaca Laut per Zona Tangkap</h3>
            </div>
            <div className="flex items-center gap-2">
              {catchZonesLastUpdate && (
                <span className="text-xs text-slate-400">
                  {catchZonesLastUpdate.toLocaleTimeString('id-ID')}
                </span>
              )}
              <button
                onClick={fetchCatchZonesWeather}
                disabled={catchZonesLoading}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${catchZonesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* User Guide - Placed in table header area */}
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">
              <span className="font-semibold">Cara Menggunakan:</span> Klik tombol "Lihat Detail" pada zona yang diinginkan untuk melihat data lengkap.
            </p>
          </div>
          
          <div className="p-3">
            {catchZonesLoading && !catchZonesWeather ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                <span className="ml-3 text-slate-500">Memuat cuaca zona tangkap...</span>
              </div>
            ) : catchZonesWeather && catchZonesWeather.zones.length > 0 ? (
              <div className="space-y-4">
                {/* Enhanced Table Layout */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Zona</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Kategori</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Suhu</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Angin</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Kelembaban</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Kondisi</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catchZonesWeather.zones.map((zone, index) => (
                        <tr 
                          key={zone.id} 
                          className={`transition-colors cursor-pointer ${
                            selectedZone?.id === zone.id 
                              ? 'bg-cyan-50 border-l-4 border-l-cyan-500' 
                              : index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'
                          }`}
                          onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                        >
                          {/* Zona Name */}
                          <td className="px-3 py-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: zone.color }}
                              />
                              <span className="font-medium text-sm text-slate-800">{zone.name}</span>
                            </div>
                          </td>
                          
                          {/* Category */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                              zone.zoneType === 'fishing' ? 'bg-blue-100 text-blue-700' :
                              zone.zoneType === 'restricted' ? 'bg-red-100 text-red-700' :
                              zone.zoneType === 'conservation' ? 'bg-emerald-100 text-emerald-700' :
                              zone.zoneType === 'special' ? 'bg-purple-100 text-purple-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {zone.zoneType === 'fishing' ? 'Fishing' :
                               zone.zoneType === 'restricted' ? 'Restricted' :
                               zone.zoneType === 'conservation' ? 'Conservation' :
                               zone.zoneType === 'special' ? 'Special' :
                               zone.zoneType}
                            </span>
                          </td>
                          
                          {/* Status */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            {zone.error ? (
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">Error</span>
                            ) : zone.safety ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                zone.safety.status === 'SAFE' ? 'bg-emerald-50 text-emerald-600' :
                                zone.safety.status === 'CAUTION' ? 'bg-amber-50 text-amber-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                {zone.safety.status === 'SAFE' ? 'Aman' : 
                                 zone.safety.status === 'CAUTION' ? 'Waspada' : 'Bahaya'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Temperature */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            {zone.current ? (
                              <span className="text-sm font-semibold text-slate-700">{Math.round(zone.current.weather.temperature_c)}°C</span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Wind */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            {zone.current ? (
                              <span className="text-sm text-slate-600">{zone.current.weather.wind_speed_ms} m/s</span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Humidity */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            {zone.current ? (
                              <span className="text-sm text-slate-600">{zone.current.weather.humidity_percent}%</span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Condition */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                            {zone.current ? (
                              <div className="inline-flex items-center justify-center gap-1.5 h-full">
                                {getWeatherIcon(zone.current.weather.icon, "w-4 h-4")}
                                <span className="text-xs text-slate-600 capitalize hidden md:inline leading-none pt-0.5">{zone.current.weather.description}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-3 py-2.5 border-b border-slate-100 text-center">
                             <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedZone(zone);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-xs font-bold transition-colors shadow-sm"
                             >
                              <Eye className="w-3.5 h-3.5" />
                              Detail
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Removed In-Line Detail Panel */}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Anchor className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">Tidak ada zona tangkap aktif</p>
                <p className="text-sm">Tambahkan zona tangkap di halaman Zonasi Tangkap untuk melihat cuaca</p>
              </div>
            )}
          </div>
        </div>




      {/* Detail Modal Popup */}
      {selectedZone && selectedZone.current && !selectedZone.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedZone(null)}>
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div style={{ backgroundColor: selectedZone.color }} className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white" />
                <div>
                  <h4 className="font-bold text-lg text-slate-800">{selectedZone.name}</h4>
                  <p className="text-xs text-slate-500 capitalize">{selectedZone.zoneType} Zone</p>
                </div>
                {selectedZone.safety && (
                  <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedZone.safety.status === 'SAFE' ? 'bg-emerald-100 text-emerald-700' :
                    selectedZone.safety.status === 'CAUTION' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {selectedZone.safety.level}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedZone(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Current Weather Stats - Grid */}
              {/* Current Weather Stats - Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Parameter</th>
                      <th className="px-4 py-3">Nilai</th>
                      <th className="px-4 py-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-500" /> Suhu Udara
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {Math.round(selectedZone.current.weather.temperature_c)}°C
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">Suhu udara saat ini</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                        <Wind className="w-4 h-4 text-blue-500" /> Angin
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {selectedZone.current.weather.wind_speed_ms} m/s
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">Kecepatan angin</td>
                    </tr>
                    <tr className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                         <Droplets className="w-4 h-4 text-cyan-500" /> Kelembaban
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {selectedZone.current.weather.humidity_percent}%
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">Kelembaban relatif</td>
                    </tr>
                     <tr className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                         <Activity className="w-4 h-4 text-purple-500" /> Tekanan
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {selectedZone.current.weather.pressure_hpa} hPa
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">Tekanan atmosfer</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* 3-Hour Forecast */}
              {selectedZone.forecasts && selectedZone.forecasts.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-bold text-slate-700">Prakiraan 12 Jam ke Depan</h5>
                    <span className="text-xs text-slate-400">OpenWeatherMap Forecast</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 overflow-x-auto">
                    <div className="flex gap-6 min-w-max">
                      {selectedZone.forecasts.slice(0, 4).map((forecast, idx) => (
                        <div key={idx} className="text-center min-w-[80px]">
                          <p className="text-xs font-medium text-slate-500 mb-2">
                            {new Date(forecast.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-full flex items-center justify-center shadow-sm">
                            {getWeatherIcon(forecast.icon, "w-6 h-6")}
                          </div>
                          <p className="text-lg font-bold text-slate-800">{Math.round(forecast.temperature_c)}°</p>
                          <p className="text-[10px] text-slate-400 capitalize mt-1 px-2 py-0.5 bg-white rounded-full border border-slate-100 truncate max-w-[100px] mx-auto">
                            {forecast.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Safety Recommendation */}
              {selectedZone.safety && selectedZone.safety.recommendation && (
                <div className={`p-4 rounded-xl flex items-start gap-4 ${
                  selectedZone.safety.status === 'SAFE' ? 'bg-emerald-50 border border-emerald-100' :
                  selectedZone.safety.status === 'CAUTION' ? 'bg-amber-50 border border-amber-100' :
                  'bg-rose-50 border border-rose-100'
                }`}>
                  <div className={`p-2 rounded-lg shrink-0 ${
                    selectedZone.safety.status === 'SAFE' ? 'bg-emerald-100 text-emerald-600' :
                    selectedZone.safety.status === 'CAUTION' ? 'bg-amber-100 text-amber-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {getSafetyIcon(selectedZone.safety.status)}
                  </div>
                  <div>
                    <h5 className={`text-sm font-bold mb-1 ${
                      selectedZone.safety.status === 'SAFE' ? 'text-emerald-800' :
                      selectedZone.safety.status === 'CAUTION' ? 'text-amber-800' :
                      'text-rose-800'
                    }`}>Rekomendasi Keselamatan</h5>
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedZone.safety.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedZone && selectedZone.error && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedZone(null)}>
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in" onClick={e => e.stopPropagation()}>
               <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
               </div>
               <h3 className="text-lg font-bold text-slate-800 mb-2">Gagal Memuat Data</h3>
               <p className="text-sm text-slate-500 mb-4">Maaf, data cuaca untuk zona ini tidak tersedia saat ini.</p>
               <button onClick={() => setSelectedZone(null)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors">
                  Tutup
               </button>
            </div>
         </div>
      )}
    </div>
  );
};

export default MaritimeWeather;