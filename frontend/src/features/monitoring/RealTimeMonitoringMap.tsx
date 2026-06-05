import React, { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Ship, MapPin, Wifi, WifiOff, Navigation, Activity, Clock, AlertTriangle, LocateFixed, CheckCircle, Anchor, List, Radio } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { monitoringService } from '@/services/monitoringService';
import { socketService } from '@/services/socketService';

interface RealTimeMapProps {
  className?: string;
}

declare global {
  interface Window {
    emergencyMarkers: any;
  }
}

const normalizeLatLng = (location: any) => {
  const lat = location?.lat ?? location?.latitude;
  const lng = location?.lng ?? location?.longitude;

  if (lat == null || lng == null) return null;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const RealTimeMonitoringMap: React.FC<RealTimeMapProps> = ({ className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<number, any>>(new Map());
  const zonesRef = useRef<Map<string | number, any>>(new Map());
  
  const [vessels, setVessels] = useState<any[]>([]);
  const [harborZones, setHarborZones] = useState<any[]>([]);
  const [pois, setPois] = useState<any[]>([]);
  const [catchPolygons, setCatchPolygons] = useState<any[]>([]);
  const [fishingPoints, setFishingPoints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  // Initialize monitoring service and map
  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        setIsLoading(true);
        await monitoringService.initialize();
        await loadMonitoringData();
        setupRealTimeListeners();
        setConnectionStatus('connected');
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
        setConnectionStatus('error');
        // Continue with basic functionality
        await loadMonitoringData();
      } finally {
        setIsLoading(false);
      }
    };

    initializeMonitoring();
    initializeMap();

    return () => {
      cleanup();
    };
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [-2.5, 118],
        zoom: 5,
        zoomControl: false,
        scrollWheelZoom: true
      });

      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: 'Â© <a href="https://carto.com/">CARTO</a> | Â© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: 'Â© <a href="http://www.openseamap.org">OpenSeaMap</a>',
        maxZoom: 19,
        opacity: 0.7
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsLoading(false);
    };

    initMap();
  };

  const loadMonitoringData = async () => {
    try {
      const response = await monitoringService.getMonitoringData();
      if (response.success) {
        const { activeTrips, harborZones, pois, catchPolygons, sosAlerts, fishingPoints } = response.data;
        
        const activeSOSVesselIds = new Set<string>();
        if (sosAlerts && sosAlerts.length > 0) {
          sosAlerts.forEach((alert: any) => {
            activeSOSVesselIds.add(String(alert.vesselId));
            // Normalize data structure to match what handleEmergencyAlert expects
            const normalizedAlert = {
              ...alert,
              emergencyType: alert.jenisEmergency || alert.emergencyType || 'SOS',
              description: alert.deskripsi || alert.description || 'Sinyal Darurat',
              timestamp: alert.waktuLapor || alert.timestamp || new Date().toISOString()
            };
            handleEmergencyAlert(normalizedAlert);
          });
        }
        
        // Transform trips to vessel format dengan validasi tambahan
        const vesselData = activeTrips.map((trip: any) => {
          // Validasi data kapal
          if (!trip.kapal) {
            console.warn(`Trip ${trip.id} tidak memiliki data kapal`);
            return null;
          }
          
          const kapal = trip.kapal;
          if (!kapal.namaKapal || !kapal.nomorRegistrasi) {
            console.warn(`Kapal ${kapal.id} memiliki data tidak lengkap:`, {
              nama: kapal.namaKapal,
              nomor: kapal.nomorRegistrasi
            });
            return null;
          }

          // Check if this vessel has an active SOS
          const vesselIdStr = String(kapal.id);
          const vesselRegStr = String(kapal.nomorRegistrasi);
          const hasActiveSOS = activeSOSVesselIds.has(vesselIdStr) || activeSOSVesselIds.has(vesselRegStr);
          const isTripEmergency = trip.status === 'darurat';
          const isEmergency = hasActiveSOS || isTripEmergency;

          return {
            id: trip.id,
            tripId: trip.id,
            kapalId: kapal.id, // Important for mapping socket events!
            name: kapal.namaKapal,
            vesselId: kapal.nomorRegistrasi,
            status: isEmergency ? 'darurat' : trip.status, // Override status if active SOS
            location: trip.currentLocation,
            harborZone: trip.harborZone,
            nahkoda: trip.nahkodaNahkoda?.nama || 'Belum Ditentukan',
            isGPSActive: !!trip.currentLocation,
            lastUpdate: trip.updatedAt,
            vesselType: kapal.tipeKapal || 'Unknown',
            operationalStatus: kapal.statusOperasional || 'Unknown',
            tracking: trip.tracking || [],
            isEmergency,
            distanceFromHarbor: trip.distanceFromHarbor || null
          };
        }).filter(vessel => vessel !== null);

        setVessels(vesselData);
        setHarborZones(harborZones || []);
        setPois(pois || []);
        setCatchPolygons(catchPolygons || []);
        setFishingPoints(fishingPoints || []);
        
        // Track vessels for real-time updates only if socket is connected
        if (monitoringService.isConnected()) {
          vesselData.forEach(vessel => {
            if (vessel.isGPSActive) {
              monitoringService.trackVessel(vessel.tripId);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      setConnectionStatus('error');
    }
  };

  const setupRealTimeListeners = () => {
    // Listen for vessel location updates
    monitoringService.on('vessel_location_update', (data) => {
      updateVesselLocation(data);
    });

    // Listen for vessel zone updates
    monitoringService.on('vessel_zone_update', (data) => {
      updateVesselZone(data);
    });

    // Listen for connection status changes
    monitoringService.on('connection_status', (status) => {
      setConnectionStatus(status);
    });

    // Listen for emergency alerts
    monitoringService.on('emergency_alert', (alert) => {
      handleEmergencyAlert(alert);
    });

    monitoringService.on('emergency_resolved', (data) => {
      handleEmergencyResolved(data);
    });

    // Listen for new fishing points
    monitoringService.on('fishing_point_added', (data) => {
      setFishingPoints(prev => [data, ...prev].slice(0, 200));
    });

    // Listen for vessel status updates
    monitoringService.on('vessel_status_update', (data) => {
      setVessels(prevVessels => {
        return prevVessels.map(vessel => {
          // Compare using kapalId (backend vesselId)
          if (String(vessel.kapalId) === String(data.vesselId) || vessel.id === data.vesselId || vessel.vesselId === data.vesselId) {
            const updatedVessel = {
              ...vessel,
              status: data.status,
              isEmergency: data.status === 'emergency'
            };
            updateVesselMarker(updatedVessel);
            return updatedVessel;
          }
          return vessel;
        });
      });
    });
  };

  const updateVesselLocation = (data: any) => {
    setVessels(prevVessels => {
      return prevVessels.map(vessel => {
        if (vessel.tripId === data.tripId) {
          const updatedVessel = {
            ...vessel,
            location: data.location,
            isGPSActive: true,
            lastUpdate: data.timestamp,
            tracking: [...(vessel.tracking || []), data.location]
          };
          
          // Update marker on map
          updateVesselMarker(updatedVessel);
          
          return updatedVessel;
        }
        return vessel;
      });
    });
  };

  const updateVesselZone = (data: any) => {
    setVessels(prevVessels => {
      return prevVessels.map(vessel => {
        if (vessel.tripId === data.tripId) {
          return {
            ...vessel,
            harborZone: data.newZoneId ? { id: data.newZoneId } : null
          };
        }
        return vessel;
      });
    });
  };

  const handleEmergencyAlert = (alert: any) => {
    if (!mapInstanceRef.current) return;

    if (window.emergencyMarkers && window.emergencyMarkers[alert.vesselId]) {
        const existing = window.emergencyMarkers[alert.vesselId];
        if (mapInstanceRef.current.hasLayer(existing)) {
            mapInstanceRef.current.removeLayer(existing);
        }
        delete window.emergencyMarkers[alert.vesselId];
    }

    // Add emergency marker
    const emergencyIcon = L.divIcon({
      html: `
        <div style="
          background-color: #ef4444;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.5s infinite;
          position: relative;
        ">
          <div style="
            position: absolute;
            width: 60px;
            height: 60px;
            background: #ef4444;
            border-radius: 50%;
            opacity: 0.3;
            animation: pulse 2s infinite;
          "></div>
          <span style="color: white; font-size: 24px; z-index: 1;">ðŸš¨</span>
        </div>
      `,
      className: 'emergency-marker-enhanced',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    // Safe date formatter
    const formatDateSafe = (dateString: string | Date) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Waktu tidak valid';
        return date.toLocaleString('id-ID');
      } catch (e) {
        return 'Waktu tidak valid';
      }
    };

    const emergencyMarker = L.marker([alert.location.lat, alert.location.lng], { 
      icon: emergencyIcon 
    }).addTo(mapInstanceRef.current)
      .bindPopup(`
        <div class="p-3">
          <h3 class="font-bold text-red-600 mb-2">ðŸš¨ DARURAT</h3>
          <p class="text-sm text-gray-700 mb-1">Kapal: ${alert.vesselName}</p>
          <p class="text-sm text-gray-700 mb-1">Jenis: ${alert.emergencyType}</p>
          <p class="text-xs text-gray-500">${alert.description}</p>
          <p class="text-xs text-gray-500 mt-2">${formatDateSafe(alert.timestamp || new Date().toISOString())}</p>
        </div>
      `)
      .openPopup();

    // Auto-remove after 5 minutes
    setTimeout(() => {
      if (mapInstanceRef.current && emergencyMarker) {
        // Verify it's still on the map before trying to remove
        if (mapInstanceRef.current.hasLayer(emergencyMarker)) {
             mapInstanceRef.current.removeLayer(emergencyMarker);
        }
      }
    }, 300000);

    // Store marker in a ref to be accessible for removal
    if (!window.emergencyMarkers) window.emergencyMarkers = {};
    window.emergencyMarkers[alert.vesselId] = emergencyMarker;
  };

  const handleEmergencyResolved = (data: any) => {
    if (!mapInstanceRef.current) return;

    // Remove marker if it exists
    if (window.emergencyMarkers && window.emergencyMarkers[data.vesselId]) {
      const marker = window.emergencyMarkers[data.vesselId];
      if (marker && mapInstanceRef.current.hasLayer(marker)) {
        mapInstanceRef.current.removeLayer(marker);
      }
      delete window.emergencyMarkers[data.vesselId];
    }

    // Force update status for this vessel
    setVessels(prevVessels => {
      return prevVessels.map(vessel => {
        // Compare using kapalId (backend vesselId) OR vesselId string (nomor registrasi)
        // Ensure robust type matching (string vs number)
        if (String(vessel.kapalId) === String(data.vesselId) || vessel.vesselId === data.vesselId) {
          const updatedVessel = {
            ...vessel,
            status: 'sedang_melaut',
            isEmergency: false
          };
          updateVesselMarker(updatedVessel);
          return updatedVessel;
        }
        return vessel;
      });
    });
  };

  const updateVesselMarker = (vessel: any) => {
    if (!mapInstanceRef.current || !vessel.location) return;

    const existingMarker = markersRef.current.get(vessel.id);
    if (existingMarker) {
      mapInstanceRef.current.removeLayer(existingMarker);
    }

    const { lat, lng, speed = 0, heading = 0 } = vessel.location;
    
    // Skip vessels without valid coordinates
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
    
    // Determine vessel color based on status
    let vesselColor = '#3b82f6';
    
    // Priority: If status is explicitly 'sedang_melaut', it should be cyan (sailing)
    if (vessel.status === 'sedang_melaut') {
      vesselColor = '#06b6d4'; // Cyan for sailing
    } else if (vessel.status === 'disetujui') {
      vesselColor = '#10b981'; // Green for approved
    } else if (vessel.status === 'emergency' || vessel.status === 'darurat' || (vessel.status === 'active' && vessel.isEmergency)) {
      vesselColor = '#ef4444'; // Red for emergency
    }

    const vesselIcon = L.divIcon({
      html: `
        <div style="
          width: 44px;
          height: 44px;
          transform: rotate(${heading}deg);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
        ">
          <div style="
            position: absolute;
            width: 44px;
            height: 44px;
            background: ${vesselColor};
            border-radius: 50%;
            opacity: 0.25;
            animation: pulse 2s infinite ease-in-out;
          "></div>
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, ${vesselColor} 0%, ${vesselColor}dd 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.05.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
            </svg>
          </div>
        </div>
      `,
      className: 'vessel-marker-modern',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([lat, lng], { icon: vesselIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`
        <div class="p-4 min-w-[300px]">
          <h3 class="font-bold text-slate-800 mb-3 text-sm flex items-center">
            ${renderToStaticMarkup(<Ship size={16} className="mr-2 text-blue-600" />)}
            ${vessel.name}
          </h3>
          <div class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 bg-white rounded-md border border-slate-200 shadow-sm">
                <span class="text-slate-500 font-bold block text-[10px] uppercase tracking-wide">ID Kapal</span>
                <span class="font-mono text-blue-600 text-xs font-bold">${vessel.vesselId}</span>
              </div>
              <div class="p-2 bg-white rounded-md border border-slate-200 shadow-sm">
                <span class="text-slate-500 font-bold block text-[10px] uppercase tracking-wide">Status</span>
                <span class="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide flex items-center gap-1 ${
                  vessel.status === 'sedang_melaut' ? 'bg-cyan-50 text-cyan-700' : 
                  vessel.status === 'disetujui' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }">
                  ${vessel.status === 'sedang_melaut' ? renderToStaticMarkup(<Ship size={10} />) : 
                    vessel.status === 'disetujui' ? renderToStaticMarkup(<CheckCircle size={10} />) : ''}
                  ${vessel.status === 'sedang_melaut' ? 'Berlayar' : 
                    vessel.status === 'disetujui' ? 'Disetujui' : vessel.status}
                </span>
              </div>
            </div>
            ${vessel.nahkoda ? `
            <div class="p-2 bg-white rounded-md border border-blue-100 shadow-sm">
              <div class="flex justify-between items-center">
                <div>
                  <span class="text-blue-600 font-bold block text-[10px] uppercase tracking-wide">Nahkoda</span>
                  <span class="text-blue-800 font-bold text-xs">${vessel.nahkoda}</span>
                </div>
                <button onclick="window.contactNahkoda('${vessel.tripId}', '${vessel.nahkoda}')" 
                        class="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  <span>Hubungi</span>
                </button>
              </div>
            </div>
            ` : ''}
            <div class="p-2 bg-white rounded-md border border-emerald-100 shadow-sm">
              <div class="flex items-center gap-1 mb-1">
                ${renderToStaticMarkup(<LocateFixed size={12} className="text-emerald-600" />)}
                <span class="text-emerald-600 font-bold block text-[10px] uppercase tracking-wide">GPS Koordinat</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-mono text-[10px] font-bold text-emerald-700">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                <div class="flex items-center space-x-1">
                  ${renderToStaticMarkup(<Radio size={12} className="text-emerald-500 animate-pulse" />)}
                  <span class="text-[10px] text-emerald-600 font-bold uppercase">Live</span>
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 bg-white rounded-md border border-cyan-100 shadow-sm">
                <span class="text-cyan-600 font-bold block text-[10px] uppercase tracking-wide">Kecepatan</span>
                <div class="flex items-center space-x-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#0891b2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span class="text-cyan-700 font-bold text-xs">${speed.toFixed(1)} kn</span>
                </div>
              </div>
              <div class="p-2 bg-white rounded-md border border-purple-100 shadow-sm">
                <span class="text-purple-600 font-bold block text-[10px] uppercase tracking-wide">Arah</span>
                <div class="flex items-center space-x-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#8b5cf6" style="transform: rotate(${heading}deg)">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span class="text-purple-700 font-bold text-xs">${heading.toFixed(0)}Â°</span>
                </div>
              </div>
            </div>
            <div class="p-2 bg-white rounded-md border border-orange-100 shadow-sm">
              <span class="text-orange-600 font-bold block text-[10px] uppercase tracking-wide">Update Terakhir</span>
              <div class="flex items-center space-x-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#ea580c">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
                </svg>
                <span class="text-orange-700 text-[10px] font-medium">${new Date(vessel.lastUpdate).toLocaleString('id-ID')}</span>
              </div>
            </div>
            ${vessel.harborZone ? `
            <div class="p-2 bg-white rounded-md border border-indigo-100 shadow-sm">
              <span class="text-indigo-600 font-bold block text-[10px] uppercase tracking-wide">Zona Pelabuhan</span>
              <span class="text-indigo-700 font-bold text-xs">${vessel.harborZone.name || 'Zona ' + vessel.harborZone.id}</span>
            </div>
            ` : ''}
            ${vessel.distanceFromHarbor ? `
            <div class="p-2 bg-white rounded-md border ${
              vessel.distanceFromHarbor.isViolating ? 'border-red-200' : 'border-emerald-100'
            } shadow-sm">
              <div class="flex items-center justify-between">
                <span class="${
                  vessel.distanceFromHarbor.isViolating ? 'text-red-600' : 'text-emerald-600'
                } font-bold block text-[10px] uppercase tracking-wide">Jarak dari Pelabuhan</span>
                ${vessel.distanceFromHarbor.maxMil ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  vessel.distanceFromHarbor.isViolating ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }">${vessel.distanceFromHarbor.isViolating ? 'âš  MELEBIHI' : 'âœ“ AMAN'}</span>` : ''}
              </div>
              <span class="font-bold text-xs ${
                vessel.distanceFromHarbor.isViolating ? 'text-red-700' : 'text-emerald-700'
              }">${vessel.distanceFromHarbor.nauticalMiles.toFixed(1)} mil laut</span>
              <span class="text-[10px] text-slate-400 block">dari ${vessel.distanceFromHarbor.harborName}${vessel.distanceFromHarbor.maxMil ? ' Â· Batas: ' + vessel.distanceFromHarbor.maxMil + ' mil' : ''}</span>
              <span class="text-[10px] text-slate-400">${vessel.distanceFromHarbor.kategori || ''}</span>
            </div>
            ` : ''}
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <button onclick="window.selectVessel(${vessel.id})" 
                    class="w-full bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="mr-1.5">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              Detail Lengkap
            </button>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="window.trackVessel(${vessel.id})" 
                      class="bg-emerald-600 text-white px-2 py-1.5 rounded-md text-[10px] font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center shadow-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="mr-1">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Lacak
              </button>
              <button onclick="window.showVesselHistory(${vessel.id})" 
                      class="bg-purple-600 text-white px-2 py-1.5 rounded-md text-[10px] font-bold hover:bg-purple-700 transition-colors flex items-center justify-center shadow-sm">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="mr-1">
                  <path d="M13,3A9,9 0 0,0 4,12H1L4.89,15.89L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,20 10.5,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z"/>
                </svg>
                Riwayat
              </button>
            </div>
          </div>
        </div>
      `);

    markersRef.current.set(vessel.id, marker);

    // Update Polyline
    if (vessel.tracking && Array.isArray(vessel.tracking) && vessel.tracking.length > 1) {
      const path = vessel.tracking.map((t: any) => [t.lat, t.lng]);
      const existingPolyline = zonesRef.current.get(`track_${vessel.id}`);
      
      if (existingPolyline) {
        existingPolyline.setLatLngs(path);
      } else {
        let trackColor = '#3b82f6';
        if (vessel.status === 'sedang_melaut') trackColor = '#06b6d4';
        
        const polyline = L.polyline(path, {
          color: trackColor,
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 5'
        }).addTo(mapInstanceRef.current);
        
        zonesRef.current.set(`track_${vessel.id}`, polyline);
      }
    }
  };

  // Render harbor zones, POIs, and catch polygons
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing zones
    zonesRef.current.forEach(zone => {
      mapInstanceRef.current.removeLayer(zone);
    });
    zonesRef.current.clear();


    // Render Vessel Tracks
    vessels.forEach(vessel => {
      if (vessel.tracking && Array.isArray(vessel.tracking) && vessel.tracking.length > 1) {
        const path = vessel.tracking.map((t: any) => [t.lat, t.lng]);
        let trackColor = '#3b82f6';
        if (vessel.status === 'sedang_melaut') trackColor = '#06b6d4';
        
        const polyline = L.polyline(path, {
          color: trackColor,
          weight: 2,
          opacity: 0.6,
          dashArray: '5, 5'
        }).addTo(mapInstanceRef.current);
        
        zonesRef.current.set(`track_${vessel.id}`, polyline);
      }
    });

    // Render Harbor Zones
    harborZones.forEach(zone => {

      const zoneColors = {
        harbor: '#10b981',
        port: '#3b82f6',
        anchorage: '#f59e0b',
        restricted: '#ef4444',
        conservation: '#8b5cf6'
      };

      const color = zone.color || zoneColors[zone.type] || '#10b981';
      
      // Check if zone is polygon or circle
      const isPolygon = Array.isArray(zone.coordinates);
      
      if (isPolygon) {
        // Render polygon zone
        if (zone.coordinates.length < 3) return;
        
        const coords = zone.coordinates.map((coord: any) => [coord.lat, coord.lng]);
        const polygon = L.polygon(coords, {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.8
        }).addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="padding: 14px; min-width: 280px; max-width: 320px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <div style="background: ${color}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17 15l1.55 1.55c-.96 1.69-3.33 3.04-5.55 3.37V11h3V9h-3V7.82C14.16 7.4 15 6.3 15 5c0-1.65-1.35-3-3-3S9 3.35 9 5c0 1.3.84 2.4 2 2.82V9H8v2h3v8.92c-2.22-.33-4.59-1.68-5.55-3.37L7 15l-4-3v3c0 3.88 4.92 7 9 7s9-3.12 9-7v-3l-4 3z"/>
                  </svg>
                </div>
                <div>
                  <h3 style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 700;">${zone.name}</h3>
                  <p style="margin: 2px 0 0 0; color: ${color}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">ZONA PELABUHAN</p>
                </div>
              </div>
              
              <div style="display: grid; gap: 8px; font-size: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <div style="background: #ecfdf5; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #059669; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> TIPE ZONA</p>
                    <p style="margin: 3px 0 0 0; color: #065f46; font-weight: 600;">${zone.type}</p>
                  </div>
                  <div style="background: #dbeafe; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #2563eb; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14zm-7-2h5v-5h-2v3h-3v2z"/></svg> BENTUK</p>
                    <p style="margin: 3px 0 0 0; color: #1e40af; font-weight: 600;">Polygon (${zone.coordinates.length} titik)</p>
                  </div>
                </div>
                
                ${zone.description ? `
                <div style="background: #f9fafb; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${color};">
                  <p style="margin: 0; color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> DESKRIPSI</p>
                  <p style="margin: 3px 0 0 0; color: #374151;">${zone.description}</p>
                </div>` : ''}
                
                ${zone.capacity ? `
                <div style="background: #f3e8ff; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #7c3aed; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2z"/></svg> KAPASITAS</p>
                  <p style="margin: 3px 0 0 0; color: #5b21b6; font-weight: 600;">${zone.capacity} kapal</p>
                </div>` : ''}
                
                ${zone.facilities && zone.facilities.length > 0 ? `
                <div style="background: #fef3c7; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #d97706; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> FASILITAS</p>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${zone.facilities.map(f => `<span style="background: #fde68a; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500;">${f}</span>`).join('')}
                  </div>
                </div>` : ''}
                
                <div style="background: #f3f4f6; padding: 8px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: ${color}; font-size: 14px;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17 15l1.55 1.55c-.96 1.69-3.33 3.04-5.55 3.37V11h3V9h-3V7.82C14.16 7.4 15 6.3 15 5c0-1.65-1.35-3-3-3S9 3.35 9 5c0 1.3.84 2.4 2 2.82V9H8v2h3v8.92c-2.22-.33-4.59-1.68-5.55-3.37L7 15l-4-3v3c0 3.88 4.92 7 9 7s9-3.12 9-7v-3l-4 3z"/></svg></span>
                    <p style="margin: 0; color: #6b7280; font-size: 10px;">Zona Pelabuhan</p>
                  </div>
                  <span style="background: #22c55e; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">AKTIF</span>
                </div>
              </div>
            </div>
          `);
        
        zonesRef.current.set(`harbor_${zone.id}`, polygon);
      } else {
        // Render circle zone
        if (!zone.coordinates?.lat || !zone.coordinates?.lng) return;
        
        const radius = zone.radius || 1000;
        const circle = L.circle([zone.coordinates.lat, zone.coordinates.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.8,
          radius: radius
        }).addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="padding: 14px; min-width: 280px; max-width: 320px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <div style="background: ${color}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17 15l1.55 1.55c-.96 1.69-3.33 3.04-5.55 3.37V11h3V9h-3V7.82C14.16 7.4 15 6.3 15 5c0-1.65-1.35-3-3-3S9 3.35 9 5c0 1.3.84 2.4 2 2.82V9H8v2h3v8.92c-2.22-.33-4.59-1.68-5.55-3.37L7 15l-4-3v3c0 3.88 4.92 7 9 7s9-3.12 9-7v-3l-4 3z"/>
                  </svg>
                </div>
                <div>
                  <h3 style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 700;">${zone.name}</h3>
                  <p style="margin: 2px 0 0 0; color: ${color}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">ZONA PELABUHAN</p>
                </div>
              </div>
              
              <div style="display: grid; gap: 8px; font-size: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <div style="background: #ecfdf5; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #059669; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> TIPE ZONA</p>
                    <p style="margin: 3px 0 0 0; color: #065f46; font-weight: 600;">${zone.type}</p>
                  </div>
                  <div style="background: #dbeafe; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #2563eb; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg> RADIUS</p>
                    <p style="margin: 3px 0 0 0; color: #1e40af; font-weight: 600;">${(radius/1000).toFixed(1)} km</p>
                  </div>
                </div>
                
                ${zone.description ? `
                <div style="background: #f9fafb; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${color};">
                  <p style="margin: 0; color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> DESKRIPSI</p>
                  <p style="margin: 3px 0 0 0; color: #374151;">${zone.description}</p>
                </div>` : ''}
                
                ${zone.capacity ? `
                <div style="background: #f3e8ff; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #7c3aed; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2z"/></svg> KAPASITAS</p>
                  <p style="margin: 3px 0 0 0; color: #5b21b6; font-weight: 600;">${zone.capacity} kapal</p>
                </div>` : ''}
                
                ${zone.facilities && zone.facilities.length > 0 ? `
                <div style="background: #fef3c7; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #d97706; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> FASILITAS</p>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${zone.facilities.map(f => `<span style="background: #fde68a; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500;">${f}</span>`).join('')}
                  </div>
                </div>` : ''}
                
                <div style="background: #f3f4f6; padding: 8px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: ${color}; font-size: 14px;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
                    <div>
                      <p style="margin: 0; color: #6b7280; font-size: 9px;">KOORDINAT</p>
                      <p style="margin: 2px 0 0 0; color: #374151; font-family: monospace; font-size: 10px;">${zone.coordinates.lat.toFixed(4)}, ${zone.coordinates.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  <span style="background: #22c55e; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">AKTIF</span>
                </div>
              </div>
            </div>
          `);

        zonesRef.current.set(`harbor_${zone.id}`, circle);
      }
    });

    // Render POIs
    pois.forEach((poi: any) => {
      const coordinates = normalizeLatLng(poi.coordinates);
      if (!coordinates) return;

      // SVG icons for each POI type
      const poiTypes = {
        harbor_office: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 12.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`, 
          color: '#3b82f6', 
          label: 'Kantor Pelabuhan' 
        },
        shipping_office: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg>`, 
          color: '#06b6d4', 
          label: 'Kantor Syahbandar' 
        },
        customs: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`, 
          color: '#8b5cf6', 
          label: 'Bea Cukai' 
        },
        fuel_station: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5z"/></svg>`, 
          color: '#ef4444', 
          label: 'SPBU Laut' 
        },
        repair_dock: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`, 
          color: '#f59e0b', 
          label: 'Dok Reparasi' 
        },
        warehouse: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 6H4V4h16v2zm-2 6H6v-2h12v2zm2 6H4v-2h16v2z"/></svg>`, 
          color: '#10b981', 
          label: 'Gudang' 
        },
        lighthouse: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12.5 3.5L8 8v3h1v9h6v-9h1V8l-4.5-4.5zM11 11V9h2v2h-2zm0 5v-3h2v3h-2zm1-10.2L14.2 8H9.8L12 5.8z"/></svg>`, 
          color: '#f97316', 
          label: 'Mercusuar' 
        },
        pilot_station: { 
          svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/></svg>`, 
          color: '#6366f1', 
          label: 'Stasiun Pilot' 
        }
      };

      const poiType = poiTypes[poi.type] || { 
        svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`, 
        color: '#f59e0b', 
        label: 'POI' 
      };

      const poiIcon = L.divIcon({
        html: `
          <div style="
            background-color: ${poiType.color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 0;
            left: 0;
            transform: translate(-50%, -50%);
          ">
            ${poiType.svg}
          </div>
        `,
        className: 'poi-marker-fixed',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([poi.coordinates.lat, poi.coordinates.lng], {
        icon: poiIcon,
        zIndexOffset: 2000,
        riseOnHover: true,
        riseOffset: 250
      }).addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="padding: 14px; min-width: 280px; max-width: 320px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <div style="background: ${poiType.color}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${poiType.svg}
              </div>
              <div>
                <h3 style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 700;">${poi.name}</h3>
                <p style="margin: 2px 0 0 0; color: ${poiType.color}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${poiType.label}</p>
              </div>
            </div>
            
            <div style="display: grid; gap: 8px; font-size: 12px;">
              ${poi.description ? `
              <div style="background: #f9fafb; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${poiType.color};">
                <p style="margin: 0; color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase;">Deskripsi</p>
                <p style="margin: 3px 0 0 0; color: #374151;">${poi.description}</p>
              </div>` : ''}
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                ${poi.operating_hours ? `
                <div style="background: #ecfdf5; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #059669; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> JAM OPERASI</p>
                  <p style="margin: 3px 0 0 0; color: #065f46; font-weight: 500;">${poi.operating_hours}</p>
                </div>` : ''}
                
                ${poi.contact?.phone ? `
                <div style="background: #eff6ff; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #2563eb; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg> TELEPON</p>
                  <p style="margin: 3px 0 0 0; color: #1e40af; font-weight: 500;">${poi.contact.phone}</p>
                </div>` : ''}
              </div>
              
              ${poi.services && poi.services.length > 0 ? `
              <div style="background: #faf5ff; padding: 8px 10px; border-radius: 6px;">
                <p style="margin: 0; color: #7c3aed; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg> LAYANAN</p>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                  ${poi.services.map(s => `<span style="background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500;">${s}</span>`).join('')}
                </div>
              </div>` : ''}
              
              <div style="background: #f3f4f6; padding: 8px 10px; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
                <span style="color: #ef4444; font-size: 14px;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
                <div>
                  <p style="margin: 0; color: #6b7280; font-size: 9px; font-weight: 600; text-transform: uppercase;">KOORDINAT</p>
                  <p style="margin: 2px 0 0 0; color: #374151; font-family: monospace; font-size: 11px;">${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
          </div>
        `);

      zonesRef.current.set(`poi_${poi.id}`, marker);
    });

    const validPoiBounds = pois
      .map((poi: any) => normalizeLatLng(poi.coordinates))
      .filter((coord): coord is { lat: number; lng: number } => coord !== null)
      .map((coord) => [coord.lat, coord.lng] as [number, number]);

    if (validPoiBounds.length > 0) {
      const bounds = L.latLngBounds(validPoiBounds);
      mapInstanceRef.current.fitBounds(bounds.pad(0.1));
    }

    // Render Catch Polygons with validation
    catchPolygons.forEach(polygon => {
      if (!polygon.coordinates || !Array.isArray(polygon.coordinates)) {
        console.warn('Invalid polygon coordinates structure:', polygon.name);
        return;
      }

      try {
        const validCoords = polygon.coordinates.filter((coord: any) => 
          coord && typeof coord.lat === 'number' && typeof coord.lng === 'number' &&
          !isNaN(coord.lat) && !isNaN(coord.lng) &&
          coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180
        );
        if (validCoords.length < 3) return;

        const coords = validCoords.map((coord: any) => [coord.lat, coord.lng]);
        
        const poly = L.polygon(coords, {
          color: '#8b5cf6',
          fillColor: '#8b5cf6',
          fillOpacity: 0.1,
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 5'
        }).addTo(mapInstanceRef.current)
          .bindPopup(`
            <div style="padding: 14px; min-width: 280px; max-width: 320px;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <div style="background: #8b5cf6; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <div>
                  <h3 style="margin: 0; color: #1f2937; font-size: 15px; font-weight: 700;">${polygon.name}</h3>
                  <p style="margin: 2px 0 0 0; color: #8b5cf6; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">ZONA TANGKAP</p>
                </div>
              </div>
              
              <div style="display: grid; gap: 8px; font-size: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                  <div style="background: #f3e8ff; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #7c3aed; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> TIPE ZONA</p>
                    <p style="margin: 3px 0 0 0; color: #5b21b6; font-weight: 600;">${polygon.type || 'Zona Tangkap'}</p>
                  </div>
                  <div style="background: #dbeafe; padding: 8px 10px; border-radius: 6px;">
                    <p style="margin: 0; color: #2563eb; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14zm-7-2h5v-5h-2v3h-3v2z"/></svg> AREA</p>
                    <p style="margin: 3px 0 0 0; color: #1e40af; font-weight: 600;">~${(coords.length * 0.5).toFixed(1)} kmÂ²</p>
                  </div>
                </div>
                
                ${polygon.description ? `
                <div style="background: #f9fafb; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #8b5cf6;">
                  <p style="margin: 0; color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> DESKRIPSI</p>
                  <p style="margin: 3px 0 0 0; color: #374151;">${polygon.description}</p>
                </div>` : ''}
                
                ${polygon.fishSpecies ? `
                <div style="background: #ecfdf5; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #059669; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20c4.42 0 8-3.58 8-8s-3.58-8-8-8-8 3.58-8 8 3.58 8 8 8zm0-14c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6z"/><circle cx="8.5" cy="11.5" r="1.5"/></svg> JENIS IKAN</p>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${polygon.fishSpecies.split(',').map(fish => `<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500;">${fish.trim()}</span>`).join('')}
                  </div>
                </div>` : ''}
                
                ${polygon.radius ? `
                <div style="background: #fef3c7; padding: 8px 10px; border-radius: 6px;">
                  <p style="margin: 0; color: #d97706; font-size: 10px; font-weight: 600;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg> RADIUS</p>
                  <p style="margin: 3px 0 0 0; color: #92400e; font-weight: 600;">${polygon.radius} km</p>
                </div>` : ''}
                
                <div style="background: #f3f4f6; padding: 8px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="color: #8b5cf6; font-size: 14px;"><svg style="display:inline;vertical-align:middle;margin-right:4px" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
                    <div>
                      <p style="margin: 0; color: #6b7280; font-size: 9px; font-weight: 600;">JUMLAH TITIK</p>
                      <p style="margin: 2px 0 0 0; color: #374151; font-weight: 600;">${coords.length} koordinat</p>
                    </div>
                  </div>
                  <span style="background: #22c55e; color: white; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">AKTIF</span>
                </div>
              </div>
            </div>
          `);

        zonesRef.current.set(`catch_${polygon.id}`, poly);
      } catch {
        // skip invalid polygon
      }
    });

    // Render Fishing Points (titik penurunan jaring)
    fishingPoints.forEach(point => {
      // Support both {lat,lng} and {latitude,longitude} formats
      const lat = point.location?.lat ?? point.location?.latitude;
      const lng = point.location?.lng ?? point.location?.longitude;
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      // Normalize location for use below
      point = { ...point, location: { ...point.location, lat, lng } };
      const isDeployed = point.actionType === 'net_deployed';
      const color = isDeployed ? '#0ea5e9' : '#f97316';
      const emoji = isDeployed ? 'ðŸŽ£' : 'â¬†ï¸';

      const icon = L.divIcon({
        html: `<div style="
          background:${color};
          width:32px;height:32px;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          font-size:14px;
        ">${emoji}</div>`,
        className: 'fishing-point-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([point.location.lat, point.location.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="padding:12px;min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
              <div style="background:${color};width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">${emoji}</div>
              <div>
                <h3 style="margin:0;font-size:13px;font-weight:700;color:#1f2937;">${isDeployed ? 'Penurunan Jaring' : 'Pengangkatan Jaring'}</h3>
                <p style="margin:0;font-size:11px;color:${color};font-weight:600;">${point.kapal?.namaKapal || 'Unknown'}</p>
              </div>
            </div>
            <div style="display:grid;gap:6px;font-size:11px;">
              <div style="background:#f0f9ff;padding:6px 8px;border-radius:6px;">
                <span style="color:#0369a1;font-weight:600;">ðŸš¢ Kapal:</span>
                <span style="color:#0c4a6e;font-weight:500;margin-left:4px;">${point.kapal?.namaKapal || '-'} (${point.kapal?.nomorKapal || '-'})</span>
              </div>
              <div style="background:#f0f9ff;padding:6px 8px;border-radius:6px;">
                <span style="color:#0369a1;font-weight:600;">ðŸŽ£ Alat Tangkap:</span>
                <span style="color:#0c4a6e;font-weight:500;margin-left:4px;">${point.kapal?.alatTangkap || '-'}</span>
              </div>
              ${point.depthMeters ? `
              <div style="background:#ecfdf5;padding:6px 8px;border-radius:6px;">
                <span style="color:#065f46;font-weight:600;">ðŸŒŠ Kedalaman:</span>
                <span style="color:#064e3b;font-weight:700;margin-left:4px;">${point.depthMeters} meter</span>
              </div>` : ''}
              <div style="background:#f9fafb;padding:6px 8px;border-radius:6px;">
                <span style="color:#6b7280;font-weight:600;">ðŸ“ Koordinat:</span>
                <span style="font-family:monospace;color:#374151;margin-left:4px;">${point.location.lat.toFixed(5)}, ${point.location.lng.toFixed(5)}</span>
              </div>
              <div style="background:#f9fafb;padding:6px 8px;border-radius:6px;">
                <span style="color:#6b7280;font-weight:600;">ðŸ• Waktu:</span>
                <span style="color:#374151;margin-left:4px;">${new Date(point.timestamp).toLocaleString('id-ID')}</span>
              </div>
              ${point.notes ? `
              <div style="background:#fffbeb;padding:6px 8px;border-radius:6px;border-left:3px solid #f59e0b;">
                <span style="color:#92400e;font-weight:600;">ðŸ“ Catatan:</span>
                <span style="color:#78350f;margin-left:4px;">${point.notes}</span>
              </div>` : ''}
            </div>
          </div>
        `);

      zonesRef.current.set(`fp_${point.id}`, marker);
    });
  }, [harborZones, pois, catchPolygons, fishingPoints]);

  // Render vessel markers
  useEffect(() => {
    vessels.forEach(vessel => {
      if (vessel.location) {
        updateVesselMarker(vessel);
      }
    });
  }, [vessels]);

  const cleanup = () => {
    markersRef.current.clear();
    zonesRef.current.clear();
    
    // Cleanup global emergency markers
    if (window.emergencyMarkers && mapInstanceRef.current) {
        Object.keys(window.emergencyMarkers).forEach(key => {
            const marker = window.emergencyMarkers[key];
            if (marker && mapInstanceRef.current.hasLayer(marker)) {
                mapInstanceRef.current.removeLayer(marker);
            }
        });
        window.emergencyMarkers = {};
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    
    monitoringService.destroy();
  };

  // Setup global vessel selection handler
  useEffect(() => {
    (window as any).selectVessel = (vesselId: number) => {
      const vessel = vessels.find(v => v.id === vesselId);
      const coordinates = normalizeLatLng(vessel?.location);
      if (vessel) {
        setSelectedVessel(vessel);
        if (coordinates && mapInstanceRef.current) {
          mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 15, {
            animate: true,
            duration: 1.5
          });
        }
      }
    };

    (window as any).contactNahkoda = (tripId: string, nahkodaName: string) => {
      // Implementasi kontak nahkoda
      const phoneNumber = '+6281234567890'; // Nomor contoh, seharusnya dari database
      const message = `Halo ${nahkodaName}, ini dari pusat monitoring. Bagaimana kondisi kapal saat ini?`;
      const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    };

    (window as any).trackVessel = (vesselId: number) => {
      const vessel = vessels.find(v => v.id === vesselId);
      const coordinates = normalizeLatLng(vessel?.location);
      if (vessel && coordinates && mapInstanceRef.current) {
        mapInstanceRef.current.setView([coordinates.lat, coordinates.lng], 16, {
          animate: true,
          duration: 2
        });
        // Mulai tracking real-time
        monitoringService.trackVessel(vessel.tripId);
      }
    };

    (window as any).showVesselHistory = (vesselId: number) => {
      const vessel = vessels.find(v => v.id === vesselId);
      if (vessel) {
        // Implementasi tampilkan riwayat perjalanan
        alert(`Menampilkan riwayat perjalanan untuk kapal: ${vessel.name}`);
        // TODO: Buka modal atau halaman riwayat
      }
    };

    return () => {
      delete (window as any).selectVessel;
      delete (window as any).contactNahkoda;
      delete (window as any).trackVessel;
      delete (window as any).showVesselHistory;
    };
  }, [vessels]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Real-time';
      case 'disconnected': return 'Reconnecting';
      case 'error': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Connection Status - with green pulse effect */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border-2 border-green-200">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <Radio size={16} className={`${getConnectionStatusColor().replace('bg-', 'text-')} shadow-sm`} />
            {connectionStatus === 'connected' && (
              <Radio size={16} className="absolute text-green-500 animate-ping opacity-75" />
            )}
          </div>
          <span className="text-sm font-bold text-slate-700">{getConnectionStatusText()}</span>
          {connectionStatus === 'connected' && (
            <span className="text-[10px] font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">LIVE</span>
          )}
        </div>
      </div>

      {/* Vessel Count */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border-2 border-slate-300">
        <div className="flex items-center space-x-3">
          <Ship size={20} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-700">
            {vessels.filter(v => v.isGPSActive).length} / {vessels.length} GPS Aktif
          </span>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50 z-[999]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-white text-sm">Memuat peta monitoring...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg" />

      {/* Legend Toggle Button */}
      <button
        onClick={() => setIsLegendOpen(!isLegendOpen)}
        className={`absolute bottom-4 right-4 z-[1001] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border-2 transition-all duration-200 cursor-pointer select-none active:scale-95 ${
          isLegendOpen 
            ? 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white shadow-blue-200' 
            : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-400'
        }`}
        title={isLegendOpen ? 'Klik untuk tutup legenda' : 'Klik untuk buka legenda'}
      >
        <List size={16} />
        <span className="text-sm font-semibold">Legenda</span>
        <svg 
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`transition-transform duration-200 ${isLegendOpen ? 'rotate-180' : ''}`}
        >
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>

      {/* Legend Panel */}
      <div className={`absolute bottom-16 right-4 z-[1000] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-200 ${isLegendOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95 pointer-events-none'}`}>
        {/* Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <p className="text-xs font-semibold text-gray-800 tracking-wide">LEGENDA PETA</p>
          </div>
        </div>
        
        <div className="p-3 space-y-0.5">
          {/* Status Kapal */}
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Status Kapal</p>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-blue-50/50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#06b6d4" className="flex-shrink-0">
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
            </svg>
            <span className="text-[11px] text-gray-700 font-medium">Sedang Berlayar</span>
            <span className="ml-auto text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded">{vessels.filter(v => v.status === 'sedang_melaut').length}</span>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-green-50/50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" className="flex-shrink-0">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-[11px] text-gray-700 font-medium">Disetujui</span>
            <span className="ml-auto text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{vessels.filter(v => v.status === 'disetujui').length}</span>
          </div>
          
          <div className="border-t border-gray-100 my-2"></div>
          
          {/* Zona & Lokasi */}
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Zona & Lokasi</p>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-emerald-50/50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981" className="flex-shrink-0">
              <path d="M17 15l1.55 1.55c-.96 1.69-3.33 3.04-5.55 3.37V11h3V9h-3V7.82C14.16 7.4 15 6.3 15 5c0-1.65-1.35-3-3-3S9 3.35 9 5c0 1.3.84 2.4 2 2.82V9H8v2h3v8.92c-2.22-.33-4.59-1.68-5.55-3.37L7 15l-4-3v3c0 3.88 4.92 7 9 7s9-3.12 9-7v-3l-4 3zM12 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
            </svg>
            <span className="text-[11px] text-gray-700 font-medium">Zona Pelabuhan</span>
            <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{harborZones.length}</span>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-orange-50/50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f97316" className="flex-shrink-0">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="text-[11px] text-gray-700 font-medium">Point of Interest</span>
            <span className="ml-auto text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{pois.length}</span>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-purple-50/50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6" className="flex-shrink-0">
              <path d="M12 20.5c4.41 0 8-3.59 8-8s-3.59-8-8-8-8 3.59-8 8 3.59 8 8 8zm0-14c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zm2 4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zM6 8.5c0-.28-.22-.5-.5-.5S5 8.22 5 8.5s.22.5.5.5.5-.22.5-.5zm-1.5 8c0-.28-.22-.5-.5-.5s-.5.22-.5.5.22.5.5.5.5-.22.5-.5z"/>
            </svg>
            <span className="text-[11px] text-gray-700 font-medium">Zona Tangkap</span>
            <span className="ml-auto text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{catchPolygons.length}</span>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-sky-50/50 transition-colors">
            <span className="text-sm">ðŸŽ£</span>
            <span className="text-[11px] text-gray-700 font-medium">Titik Jaring</span>
            <span className="ml-auto text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">{fishingPoints.length}</span>
          </div>
          
          <div className="border-t border-gray-100 my-2"></div>
          
          {/* Darurat */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-red-50/30 hover:bg-red-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" className="flex-shrink-0 animate-pulse">
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
            </svg>
            <span className="text-[11px] text-red-700 font-medium">Status Darurat</span>
            <span className="ml-auto">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block animate-ping"></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitoringMap;

