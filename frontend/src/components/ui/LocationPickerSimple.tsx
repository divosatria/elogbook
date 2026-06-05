import React, { useState, useEffect } from 'react';
import { MapPin, X, Navigation, Anchor, AlertTriangle, Compass, Target } from 'lucide-react';
import { backendAPI } from '@/services/backendService';

interface CatchZone {
  id: number;
  name: string;
  description?: string;
  coordinates: number[][];
  zoneType: 'fishing' | 'restricted' | 'conservation' | 'special';
  fishTypes?: string[];
  color: string;
  isActive: boolean;
}

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

const LocationPickerSimple: React.FC<LocationPickerProps> = ({
  initialLat = -6.2,
  initialLng = 106.8,
  onLocationSelect,
  onClose
}) => {
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [catchZones, setCatchZones] = useState<CatchZone[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [selectedZoneInfo, setSelectedZoneInfo] = useState<any>(null);
  const [gpsError, setGpsError] = useState<string>('');

  useEffect(() => {
    loadCatchZones();
  }, []);

  useEffect(() => {
    if (selectedLat && selectedLng) {
      checkPointInZone(selectedLat, selectedLng);
    }
  }, [selectedLat, selectedLng]);

  const loadCatchZones = async () => {
    try {
      setIsLoadingZones(true);
      const response = await backendAPI.getCatchPolygons();
      const zones = response?.data || [];
      setCatchZones(zones.filter((zone: CatchZone) => zone.isActive));
    } catch (error) {
      console.error('Error loading catch zones:', error);
      setCatchZones([]);
    } finally {
      setIsLoadingZones(false);
    }
  };

  const checkPointInZone = async (lat: number, lng: number) => {
    try {
      const response = await backendAPI.checkPointInPolygon(lat, lng);
      setSelectedZoneInfo(response?.data || null);
    } catch (error) {
      console.error('Error checking point in zone:', error);
      setSelectedZoneInfo(null);
    }
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setGpsError('');
    
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLat(position.coords.latitude);
        setSelectedLng(position.coords.longitude);
        setIsGettingLocation(false);
        setGpsError('');
      },
      (error) => {
        console.error('GPS Error:', error);
        let errorMessage = 'Tidak dapat mengakses lokasi GPS';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Akses GPS ditolak. Silakan izinkan akses lokasi di browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informasi lokasi tidak tersedia.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout mendapatkan lokasi GPS.';
            break;
        }
        
        setGpsError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLat, selectedLng);
    onClose();
  };

  const getZoneTypeColor = (zoneType: string) => {
    switch (zoneType) {
      case 'fishing': return 'bg-green-50 text-green-700 border-green-200';
      case 'restricted': return 'bg-red-50 text-red-700 border-red-200';
      case 'conservation': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'special': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getZoneTypeIcon = (zoneType: string) => {
    switch (zoneType) {
      case 'fishing': return <Anchor size={14} />;
      case 'restricted': return <AlertTriangle size={14} />;
      case 'conservation': return <MapPin size={14} />;
      case 'special': return <Target size={14} />;
      default: return <MapPin size={14} />;
    }
  };

  const getCenterPointOfZone = (coordinates: number[][]) => {
    if (!coordinates || coordinates.length === 0) return { lat: 0, lng: 0 };
    
    const lats = coordinates.map(coord => coord[1]);
    const lngs = coordinates.map(coord => coord[0]);
    
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
    };
  };

  const formatCoordinate = (coord: number, type: 'lat' | 'lng') => {
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${Math.abs(coord).toFixed(6)}Â° ${direction}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Compass size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Pilih Lokasi Penangkapan</h3>
              <p className="text-sm text-slate-500">Gunakan GPS atau pilih dari zonasi tangkap resmi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* GPS Section */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
              <Navigation size={16} className="mr-2" />
              Lokasi GPS Saat Ini
            </h4>
            <button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGettingLocation ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Mendapatkan Lokasi GPS...
                </>
              ) : (
                <>
                  <Navigation size={18} className="mr-2" />
                  Gunakan Lokasi Saat Ini
                </>
              )}
            </button>
            
            {gpsError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">GPS Error</p>
                    <p className="text-xs text-red-600 mt-1">{gpsError}</p>
                    <p className="text-xs text-red-500 mt-2">
                      ðŸ’¡ Tips: Pastikan GPS aktif dan izinkan akses lokasi di browser
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Catch Zones Section */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
              <Anchor size={16} className="mr-2" />
              Zonasi Tangkap Resmi
            </h4>
            {isLoadingZones ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-sm text-slate-500">Memuat zonasi tangkap...</span>
              </div>
            ) : catchZones.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {catchZones.map((zone) => {
                  const centerPoint = getCenterPointOfZone(zone.coordinates);
                  return (
                    <button
                      key={zone.id}
                      onClick={() => {
                        setSelectedLat(centerPoint.lat);
                        setSelectedLng(centerPoint.lng);
                      }}
                      className="p-4 text-left border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm text-slate-800 group-hover:text-blue-700">
                          {zone.name}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getZoneTypeColor(zone.zoneType)}`}>
                          {getZoneTypeIcon(zone.zoneType)}
                          <span className="ml-1 capitalize">{zone.zoneType}</span>
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 mb-2 font-mono">
                        ðŸ“ {formatCoordinate(centerPoint.lat, 'lat')}, {formatCoordinate(centerPoint.lng, 'lng')}
                      </div>
                      
                      {zone.description && (
                        <div className="text-xs text-slate-400 mb-2">
                          {zone.description}
                        </div>
                      )}
                      
                      {zone.fishTypes && zone.fishTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {zone.fishTypes.slice(0, 3).map((fish, index) => (
                            <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              ðŸŸ {fish}
                            </span>
                          ))}
                          {zone.fishTypes.length > 3 && (
                            <span className="text-xs text-slate-400">
                              +{zone.fishTypes.length - 3} lainnya
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Anchor size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada zonasi tangkap tersedia</p>
                <p className="text-xs text-slate-400 mt-1">Hubungi admin untuk menambahkan zonasi</p>
              </div>
            )}
          </div>
          
          {/* Manual Input Section */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Latitude (Lintang)
              </label>
              <input
                type="number"
                value={selectedLat.toFixed(6)}
                onChange={(e) => setSelectedLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                step="any"
                placeholder="-6.200000"
              />
              <p className="text-xs text-slate-400 mt-1">
                {formatCoordinate(selectedLat, 'lat')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Longitude (Bujur)
              </label>
              <input
                type="number"
                value={selectedLng.toFixed(6)}
                onChange={(e) => setSelectedLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                step="any"
                placeholder="106.800000"
              />
              <p className="text-xs text-slate-400 mt-1">
                {formatCoordinate(selectedLng, 'lng')}
              </p>
            </div>
          </div>
          
          {/* Selected Location Info */}
          <div className="bg-slate-50 p-4 rounded-xl mb-6">
            <div className="flex items-center mb-2">
              <MapPin size={16} className="text-slate-600 mr-2" />
              <span className="text-sm font-medium text-slate-700">Lokasi Terpilih</span>
            </div>
            <div className="text-sm text-slate-600 mb-3 font-mono">
              ðŸ“ {formatCoordinate(selectedLat, 'lat')}, {formatCoordinate(selectedLng, 'lng')}
            </div>
            
            {selectedZoneInfo && (
              <div className="border-t border-slate-200 pt-3">
                {selectedZoneInfo.zones && selectedZoneInfo.zones.length > 0 ? (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-2">âœ… Berada dalam zonasi:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedZoneInfo.zones.map((zone: any, index: number) => (
                        <div key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getZoneTypeColor(zone.zoneType)}`}>
                          {getZoneTypeIcon(zone.zoneType)}
                          <span className="ml-1">{zone.name}</span>
                        </div>
                      ))}
                    </div>
                    {selectedZoneInfo.isInRestrictedZone && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        âš ï¸ PERINGATAN: Lokasi ini berada dalam zona terlarang!
                      </div>
                    )}
                    {selectedZoneInfo.isInFishingZone && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        ðŸŽ£ Lokasi ini berada dalam zona tangkap yang diizinkan
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                    ðŸ“ Lokasi di luar zonasi tangkap resmi
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center font-medium"
          >
            <MapPin size={16} className="mr-2" />
            Pilih Lokasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerSimple;
