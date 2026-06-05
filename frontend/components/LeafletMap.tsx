import React, { useEffect, useRef, useState } from 'react';
import { MapPin, AlertTriangle, Building2, Anchor, Shield, Wrench, Phone, Clock, Search, X, User, Ship, Navigation, Activity } from 'lucide-react';
import { HarborPOI } from '../types';
import { API_ENDPOINTS } from '../config/urls';

interface LeafletMapProps {
  vessels: any[];
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

declare global {
  interface Window {
    L: any;
  }
}

const LeafletMap: React.FC<LeafletMapProps> = ({ vessels, calculateDistance }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const poiMarkersRef = useRef<any[]>([]);
  const [mapError, setMapError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pois, setPois] = useState<HarborPOI[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [showVesselDetails, setShowVesselDetails] = useState(false);
  const [filteredVessels, setFilteredVessels] = useState<any[]>([]);
  const [catchPolygons, setCatchPolygons] = useState<any[]>([]);
  const polygonLayersRef = useRef<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const poiTypes = {
    harbor_office: { icon: '🏛️', color: '#3b82f6', label: 'Kantor Pelabuhan' },
    shipping_office: { icon: '🚢', color: '#10b981', label: 'Kantor Pelayaran' },
    customs: { icon: '🛡️', color: '#f59e0b', label: 'Bea Cukai' },
    fuel_station: { icon: '⛽', color: '#ef4444', label: 'SPBU Laut' },
    repair_dock: { icon: '🔧', color: '#8b5cf6', label: 'Dok Reparasi' },
    warehouse: { icon: '📦', color: '#6b7280', label: 'Gudang' },
    lighthouse: { icon: '🗼', color: '#f97316', label: 'Mercusuar' },
    pilot_station: { icon: '⚓', color: '#06b6d4', label: 'Stasiun Pandu' }
  };
  
  // Simple fallback zones without context
  const [harborZones, setHarborZones] = useState([
    {
      id: '1',
      name: 'Pelabuhan Muara Baru',
      coordinates: { lat: -6.1075, lng: 106.7803 },
      radius: 2.5,
      type: 'harbor',
      status: 'active',
      description: 'Pelabuhan utama untuk kapal nelayan besar',
      capacity: 150
    },
    {
      id: '2', 
      name: 'Zona Berlabuh Teluk Jakarta',
      coordinates: { lat: -6.0889, lng: 106.7378 },
      radius: 1.8,
      type: 'anchorage',
      status: 'active',
      description: 'Area berlabuh sementara untuk kapal menunggu',
      capacity: 80
    },
    {
      id: '3',
      name: 'Zona Terlarang TNI AL',
      coordinates: { lat: -6.1234, lng: 106.8012 },
      radius: 3.0,
      type: 'restricted',
      status: 'active',
      description: 'Area terlarang untuk kapal sipil',
      capacity: 0
    }
  ]);

  // Filter vessels based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredVessels(vessels);
      setSearchResults([]);
      setShowDropdown(false);
    } else {
      const filtered = vessels.filter(vessel => 
        vessel.namaKapal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vessel.vesselId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vessel.nomorRegistrasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vessel.pemilik?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVessels(filtered);
      setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
      setShowDropdown(filtered.length > 0 && searchTerm.length > 0);
    }
  }, [vessels, searchTerm]);

  const handleVesselClick = async (vessel: any) => {
    console.log('handleVesselClick called with:', vessel);
    setSelectedVessel(vessel);
    setShowVesselDetails(true);
    
    // Zoom to vessel location if GPS data exists
    if (vessel.gps?.currentPosition && mapInstanceRef.current) {
      const { latitude, longitude } = vessel.gps.currentPosition;
      mapInstanceRef.current.setView([latitude, longitude], 15, {
        animate: true,
        duration: 1.5
      });
    }
    
    // Use existing nahkoda data from vessel object
    console.log('Vessel nahkoda data:', vessel.nahkoda);
  };

  const handleVesselSelect = (vessel: any) => {
    setSearchTerm(`${vessel.vesselId || vessel.nomorRegistrasi} - ${vessel.namaKapal}`);
    setShowDropdown(false);
    setFilteredVessels([vessel]); // Show only selected vessel
    
    // Zoom to vessel location if GPS data exists
    if (vessel.gps?.currentPosition && mapInstanceRef.current) {
      const { latitude, longitude } = vessel.gps.currentPosition;
      mapInstanceRef.current.setView([latitude, longitude], 15, {
        animate: true,
        duration: 1.5
      });
    }
  };

  const handleSearchClear = () => {
    setSearchTerm('');
    setShowDropdown(false);
    setFilteredVessels(vessels); // Show all vessels
  };

  const handleCallCaptain = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const handleWhatsAppCaptain = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, '_blank');
  };

  // Check if point is inside polygon
  const pointInPolygon = (point: [number, number], polygon: [number, number][]) => {
    const x = point[0];
    const y = point[1];
    
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  };

  // Check vessel zone status
  const getVesselZoneStatus = (position: any) => {
    if (!position) return { inDanger: false, inFishingZone: false, zones: [] };
    
    const vesselPoint: [number, number] = [position.lng, position.lat];
    const matchingZones = [];
    let inDanger = false;
    let inFishingZone = false;
    
    // Check harbor zones (circular)
    harborZones.forEach(zone => {
      if (zone.type === 'restricted') {
        const distance = calculateDistance(
          position.lat, position.lng,
          zone.coordinates.lat, zone.coordinates.lng
        );
        if (distance <= zone.radius) {
          inDanger = true;
          matchingZones.push({ name: zone.name, type: 'harbor_restricted' });
        }
      }
    });
    
    // Check catch polygons
    catchPolygons.forEach(polygon => {
      if (polygon.coordinates && Array.isArray(polygon.coordinates)) {
        const polygonCoords = polygon.coordinates.map((c: any) => [c.lng, c.lat]);
        if (pointInPolygon(vesselPoint, polygonCoords)) {
          matchingZones.push({ name: polygon.name, type: polygon.zoneType });
          if (polygon.zoneType === 'restricted') {
            inDanger = true;
          } else if (polygon.zoneType === 'fishing') {
            inFishingZone = true;
          }
        }
      }
    });
    
    return { inDanger, inFishingZone, zones: matchingZones };
  };

  const getActiveZones = () => harborZones.filter(z => z.status === 'active');

  // Load harbor zones and POIs from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load harbor zones
        const zonesResponse = await fetch(API_ENDPOINTS.HARBOR_ZONES.LIST, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (zonesResponse.ok) {
          const zonesData = await zonesResponse.json();
          const zones = zonesData.data || zonesData || [];
          if (zones.length > 0) {
            setHarborZones(zones);
          }
        }
        
        // Load POIs (sample data for now)
        const samplePOIs: HarborPOI[] = [
          {
            id: 1,
            name: 'Kantor Pelabuhan Muara Baru',
            type: 'harbor_office',
            coordinates: { lat: -6.1075, lng: 106.7803 },
            description: 'Kantor administrasi pelabuhan utama',
            contact: { phone: '021-6693456', email: 'admin@pelabuhanmuarabaru.id' },
            operatingHours: '24 Jam',
            services: ['Perizinan Kapal', 'Sertifikat Kelaikan'],
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            name: 'PT. Pelayaran Nusantara',
            type: 'shipping_office',
            coordinates: { lat: -6.1085, lng: 106.7813 },
            description: 'Kantor perusahaan pelayaran',
            contact: { phone: '021-6693789' },
            operatingHours: '08:00 - 17:00',
            services: ['Charter Kapal', 'Logistik Laut'],
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 3,
            name: 'SPBU Laut Pertamina',
            type: 'fuel_station',
            coordinates: { lat: -6.1065, lng: 106.7793 },
            description: 'Stasiun pengisian bahan bakar kapal',
            contact: { phone: '021-6693123' },
            operatingHours: '06:00 - 22:00',
            services: ['Solar', 'Bensin', 'Oli Kapal'],
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Mercusuar Tanjung Priok',
            type: 'lighthouse',
            coordinates: { lat: -6.0950, lng: 106.8800 },
            description: 'Mercusuar navigasi pelabuhan',
            operatingHours: '24 Jam',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        setPois(samplePOIs);
        
        // Load catch polygons
        const polygonsResponse = await fetch(API_ENDPOINTS.CATCH_POLYGONS.LIST, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (polygonsResponse.ok) {
          const polygonsData = await polygonsResponse.json();
          const polygons = polygonsData.data || [];
          setCatchPolygons(polygons.filter((p: any) => p.isActive));
        }
        
      } catch (error) {
        console.log('Using default data');
      }
    };
    
    loadData();
    
    // Listen for harbor zone updates
    const handleZoneUpdate = (event: CustomEvent) => {
      setHarborZones(event.detail);
    };
    
    window.addEventListener('harborZonesUpdated', handleZoneUpdate as EventListener);
    
    return () => {
      window.removeEventListener('harborZonesUpdated', handleZoneUpdate as EventListener);
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      try {
        // Check if map is already initialized
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.warn('Error removing existing map:', e);
          }
          mapInstanceRef.current = null;
        }

        // Clear the container
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        // Wait for container to be ready
        setTimeout(() => {
          if (!mapRef.current || mapInstanceRef.current) return;
          
          try {
            const map = window.L.map(mapRef.current, {
              center: [-6.1075, 106.7803], // Jakarta Bay
              zoom: 11
            });

            // Add OpenStreetMap tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            mapInstanceRef.current = map;
            setIsLoading(false);
            setMapError(false);
          } catch (error) {
            console.error('Map initialization error:', error);
            setMapError(true);
            setIsLoading(false);
          }
        }, 100);
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError(true);
        setIsLoading(false);
      }
    };

    if (window.L) {
      initMap();
    } else {
      try {
        // Load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initMap;
        script.onerror = () => {
          setMapError(true);
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setMapError(true);
        setIsLoading(false);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update zones on map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing circles
    circlesRef.current.forEach(circle => {
      try {
        mapInstanceRef.current.removeLayer(circle);
      } catch (e) {
        console.warn('Error removing circle:', e);
      }
    });
    circlesRef.current = [];

    const activeZones = getActiveZones();
    activeZones.forEach(zone => {
      // Validate coordinates
      if (!zone.coordinates || 
          typeof zone.coordinates.lat !== 'number' || 
          typeof zone.coordinates.lng !== 'number' ||
          Math.abs(zone.coordinates.lat) > 90 ||
          Math.abs(zone.coordinates.lng) > 180) {
        console.warn('Invalid coordinates for zone:', zone.name, zone.coordinates);
        return;
      }
      
      try {
        const color = zone.type === 'restricted' ? '#ef4444' : 
                     zone.type === 'harbor' ? '#10b981' : '#f59e0b';

        const circle = window.L.circle([zone.coordinates.lat, zone.coordinates.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          radius: zone.radius * 1000 // Convert km to meters
        }).addTo(mapInstanceRef.current)
          .bindPopup(`
            <div class="p-2">
              <h3 class="font-bold text-blue-600">${zone.name}</h3>
              <p class="text-sm text-gray-600">${zone.description}</p>
              <p class="text-xs text-gray-500">Jari-jari: ${zone.radius} km</p>
              <p class="text-xs text-gray-500">Kapasitas: ${zone.capacity} kapal</p>
            </div>
          `);

        circlesRef.current.push(circle);
      } catch (error) {
        console.warn('Error adding zone circle:', error);
      }
    });
  }, [mapInstanceRef.current, harborZones]);

  // Update catch polygons on map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing polygon layers
    polygonLayersRef.current.forEach(layer => {
      mapInstanceRef.current.removeLayer(layer);
    });
    polygonLayersRef.current = [];

    // Add catch polygons
    catchPolygons.forEach(polygon => {
      if (!polygon.coordinates || !Array.isArray(polygon.coordinates)) return;
      
      // Convert coordinates to Leaflet format
      const latLngs = polygon.coordinates.map((coord: any) => [coord.lat, coord.lng]);
      
      const zoneTypeColors = {
        fishing: '#10b981',
        restricted: '#ef4444', 
        conservation: '#f59e0b',
        special: '#8b5cf6'
      };
      
      const color = polygon.color || zoneTypeColors[polygon.zoneType] || '#3b82f6';
      
      const polygonLayer = window.L.polygon(latLngs, {
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
        opacity: 0.8
      }).addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="p-3">
            <h3 class="font-bold text-blue-600 mb-2">${polygon.name}</h3>
            <p class="text-sm text-gray-600 mb-1">Jenis: ${getZoneTypeLabel(polygon.zoneType)}</p>
            ${polygon.description ? `<p class="text-xs text-gray-500 mb-2">${polygon.description}</p>` : ''}
            ${polygon.maxVessels ? `<p class="text-xs text-gray-500 mb-1">Maks Kapal: ${polygon.maxVessels}</p>` : ''}
            ${polygon.fishTypes && polygon.fishTypes.length > 0 ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 mb-1">Jenis Ikan:</p>
                <div class="flex flex-wrap gap-1">
                  ${polygon.fishTypes.map((fish: string) => `<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">${fish}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `);

      polygonLayersRef.current.push(polygonLayer);
    });
  }, [mapInstanceRef.current, catchPolygons]);

  const getZoneTypeLabel = (zoneType: string) => {
    const labels = {
      fishing: 'Zona Tangkap',
      restricted: 'Zona Terlarang',
      conservation: 'Zona Konservasi',
      special: 'Zona Khusus'
    };
    return labels[zoneType] || zoneType;
  };

  // Update vessel markers and POIs
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];
    
    poiMarkersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    poiMarkersRef.current = [];

    const harborZones = getActiveZones();
    
    // Only use real vessel data, no dummy data
    filteredVessels.forEach(vessel => {
      // Check if vessel has GPS position data
      const position = vessel.gps?.currentPosition || vessel.lastPosition;
      if (!position || !position.latitude || !position.longitude) {
        console.log('No GPS data for vessel:', vessel.namaKapal);
        return;
      }

      // Convert latitude/longitude to lat/lng for consistency
      const vesselPosition = {
        lat: position.latitude,
        lng: position.longitude
      };

      console.log('Adding vessel to map:', vessel.namaKapal, vesselPosition);

      // Check vessel zone status (both harbor zones and catch polygons)
      const zoneStatus = getVesselZoneStatus(vesselPosition);
      const inDanger = zoneStatus.inDanger;

      // Get vessel heading/direction from GPS data
      const heading = position.heading || 0;
      
      // Determine vessel color based on status and zone
      let vesselColor = '#3b82f6'; // Default blue
      if (inDanger) {
        vesselColor = '#ef4444'; // Red for danger
      } else if (zoneStatus.inFishingZone) {
        vesselColor = '#10b981'; // Green for fishing zone
      } else if (vessel.statusPelayaran === 'sailing') {
        vesselColor = '#06b6d4'; // Cyan for sailing
      } else if (vessel.statusPelayaran === 'docked') {
        vesselColor = '#8b5cf6'; // Purple for docked
      } else if (vessel.statusPelayaran === 'maintenance') {
        vesselColor = '#f59e0b'; // Amber for maintenance
      }

      // Create arrow icon pointing in vessel's direction
      const icon = window.L.divIcon({
        html: `
          <div style="
            width: 24px;
            height: 24px;
            transform: rotate(${heading}deg);
            display: flex;
            align-items: center;
            justify-content: center;
            ${inDanger ? 'animation: pulse 2s infinite;' : ''}
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" 
                    fill="${vesselColor}" 
                    stroke="white" 
                    stroke-width="2"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"/>
            </svg>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.1); }
            }
          </style>
        `,
        className: 'vessel-arrow-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const zoneInfo = zoneStatus.zones.length > 0 ? 
        `<p class="text-xs text-blue-600 mb-1">Zona: ${zoneStatus.zones.map(z => z.name).join(', ')}</p>` : '';

      const marker = window.L.marker([vesselPosition.lat, vesselPosition.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="p-3">
            <h3 class="font-bold text-blue-600 mb-2">${vessel.namaKapal || vessel.name || 'Kapal'}</h3>
            <p class="text-sm text-gray-600 mb-1">ID Kapal: ${vessel.vesselId || 'Belum ada'}</p>
            <p class="text-sm text-gray-600 mb-1">Status: ${vessel.statusPelayaran === 'sailing' ? 'Berlayar' : vessel.statusPelayaran === 'docked' ? 'Berlabuh' : vessel.statusPelayaran === 'maintenance' ? 'Perawatan' : vessel.statusPelayaran === 'idle' ? 'Menganggur' : 'Tidak Diketahui'}</p>
            <p class="text-xs text-gray-500 mb-1">Pemilik: ${vessel.pemilik || 'Belum ada'}</p>
            ${zoneInfo}
            <p class="text-xs text-gray-500 mb-2">GPS: ${vesselPosition.lat.toFixed(4)}, ${vesselPosition.lng.toFixed(4)}</p>
            ${inDanger ? '<p class="text-sm text-red-600 font-bold mb-2">⚠️ ZONA BAHAYA</p>' : 
              zoneStatus.inFishingZone ? '<p class="text-sm text-green-600 mb-2">🎣 Zona Tangkap</p>' : 
              '<p class="text-sm text-blue-600 mb-2">Posisi Aman</p>'}
            <button onclick="window.handleVesselClick('${vessel.id}')" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Lihat Detail</button>
          </div>
        `);

      markersRef.current.push(marker);
    });
    
    // Add POI markers
    pois.filter(poi => poi.isActive).forEach(poi => {
      const poiType = poiTypes[poi.type];
      if (!poiType) return;

      const icon = window.L.divIcon({
        html: `
          <div style="
            background-color: ${poiType.color};
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          ">
            ${poiType.icon}
          </div>
        `,
        className: 'custom-poi-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = window.L.marker([poi.coordinates.lat, poi.coordinates.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="p-3 min-w-[200px]">
            <h3 class="font-bold text-blue-600 mb-2">${poi.name}</h3>
            <p class="text-xs text-gray-500 mb-2">${poiType.label}</p>
            <p class="text-sm text-gray-600 mb-2">${poi.description || ''}</p>
            ${poi.contact?.phone ? `<p class="text-xs text-gray-500 flex items-center mb-1"><span class="mr-1">📞</span>${poi.contact.phone}</p>` : ''}
            ${poi.operatingHours ? `<p class="text-xs text-gray-500 flex items-center mb-1"><span class="mr-1">🕐</span>${poi.operatingHours}</p>` : ''}
            ${poi.services && poi.services.length > 0 ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 mb-1">Layanan:</p>
                <div class="flex flex-wrap gap-1">
                  ${poi.services.map(service => `<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">${service}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        `);

      poiMarkersRef.current.push(marker);
    });
  }, [mapInstanceRef.current, filteredVessels, calculateDistance, harborZones, pois, catchPolygons]);

  // Add global function for vessel click handling
  useEffect(() => {
    (window as any).handleVesselClick = (vesselId: string) => {
      console.log('Vessel clicked:', vesselId);
      console.log('Available vessels:', vessels);
      const vessel = vessels.find(v => v.id.toString() === vesselId);
      console.log('Found vessel:', vessel);
      if (vessel) {
        handleVesselClick(vessel);
      } else {
        console.error('Vessel not found with ID:', vesselId);
      }
    };
    
    return () => {
      delete (window as any).handleVesselClick;
    };
  }, [vessels]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kapal berdasarkan IPO, nama kapal, atau pemilik..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
          
          {/* Dropdown Results */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {searchResults.map((vessel, index) => (
                <button
                  key={vessel.id || index}
                  onClick={() => handleVesselSelect(vessel)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Ship size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">
                        {vessel.vesselId || vessel.nomorRegistrasi} - {vessel.namaKapal}
                      </div>
                      <div className="text-sm text-slate-500">
                        Pemilik: {vessel.pemilik} • Status: {vessel.statusPelayaran === 'sailing' ? 'Berlayar' : vessel.statusPelayaran === 'docked' ? 'Berlabuh' : 'Tidak Diketahui'}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      vessel.statusPelayaran === 'sailing' ? 'bg-blue-100 text-blue-700' :
                      vessel.statusPelayaran === 'docked' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {vessel.gps?.currentPosition ? '📍 GPS' : '❌ No GPS'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {searchTerm && (
          <div className="mt-3 text-sm text-slate-600">
            {showDropdown ? `Menampilkan ${searchResults.length} hasil` : `Ditemukan ${filteredVessels.length} kapal dari ${vessels.length} total kapal`}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-280px)] rounded-[2.5rem] overflow-hidden relative border border-slate-800 shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-[1001]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Memuat peta...</p>
          </div>
        </div>
      )}
      
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-[1001]">
          <div className="text-center p-8">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Gagal Memuat Peta</h3>
            <p className="text-slate-600 mb-4">Tidak dapat memuat peta interaktif.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      )}
      
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Legend */}
      {!mapError && !isLoading && (
        <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-300 z-[1000] max-w-xs">
          <h4 className="font-bold text-slate-800 text-sm mb-3">Pemantauan Langsung</h4>
          <div className="space-y-2 text-xs">
            <div className="mb-3">
              <p className="font-semibold text-slate-700 mb-1">Status Kapal:</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" fill="#06b6d4" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-slate-700">Berlayar</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-slate-700">Berlabuh</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" fill="#f59e0b" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-slate-700">Perawatan</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" fill="#10b981" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-slate-700">Di Zona Tangkap</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L22 12L12 22L12 16L2 16L2 8L12 8L12 2Z" fill="#ef4444" stroke="white" strokeWidth="2"/>
                  </svg>
                  <span className="text-slate-700">Zona Terlarang (Berkedip)</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-1">Zona:</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-green-500 rounded-full bg-green-100"></div>
                  <span className="text-slate-700">Zona Pelabuhan</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-amber-500 rounded-full bg-amber-100"></div>
                  <span className="text-slate-700">Zona Berlabuh</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-red-500 rounded-full bg-red-100"></div>
                  <span className="text-slate-700">Zona Terlarang</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-xs">🏛️</div>
                  <span className="text-slate-700">Fasilitas Pelabuhan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vessel Count */}
      {!mapError && !isLoading && (
        <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-white/20 z-[1000]">
          <div className="text-white text-center">
            <div className="text-2xl font-bold">{filteredVessels.length}</div>
            <div className="text-xs opacity-75">{searchTerm ? 'Hasil Pencarian' : 'Kapal Aktif'}</div>
          </div>
        </div>
      )}
      </div>

      {/* Vessel Details Modal */}
      {showVesselDetails && selectedVessel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Ship size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{selectedVessel.namaKapal}</h3>
                  <p className="text-sm text-slate-500">Detail Kapal & Lokasi GPS</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVesselDetails(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex h-[70vh]">
              {/* Left Panel - Vessel Info */}
              <div className="w-1/3 p-6 border-r border-slate-200 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Nomor Registrasi</label>
                    <p className="text-sm text-slate-800 font-medium">{selectedVessel.nomorRegistrasi}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Pemilik</label>
                    <p className="text-sm text-slate-800">{selectedVessel.pemilik}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Status Kapal</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                      selectedVessel.statusPelayaran === 'sailing' ? 'bg-blue-100 text-blue-700' :
                      selectedVessel.statusPelayaran === 'docked' ? 'bg-green-100 text-green-700' :
                      selectedVessel.statusPelayaran === 'maintenance' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedVessel.statusPelayaran === 'sailing' ? 'Berlayar' :
                       selectedVessel.statusPelayaran === 'docked' ? 'Berlabuh' :
                       selectedVessel.statusPelayaran === 'maintenance' ? 'Perawatan' :
                       selectedVessel.statusPelayaran === 'idle' ? 'Menganggur' : 'Tidak Diketahui'}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">Status GPS</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedVessel.gps?.currentPosition ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-600 font-medium">Aktif</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-red-600 font-medium">Tidak Aktif</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {selectedVessel.gps?.currentPosition && (
                    <>
                      <div className="border-t border-slate-200 pt-4">
                        <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">Posisi Terakhir</label>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <MapPin size={14} className="text-blue-500" />
                            <span className="font-mono text-xs">
                              {selectedVessel.gps.currentPosition.latitude.toFixed(6)}, {selectedVessel.gps.currentPosition.longitude.toFixed(6)}
                            </span>
                          </div>
                          {selectedVessel.gps.currentPosition.speed && (
                            <div className="flex items-center space-x-2">
                              <Activity size={14} className="text-green-500" />
                              <span>Kecepatan: {selectedVessel.gps.currentPosition.speed.toFixed(1)} knot</span>
                            </div>
                          )}
                          {selectedVessel.gps.currentPosition.heading && (
                            <div className="flex items-center space-x-2">
                              <Navigation size={14} className="text-purple-500" />
                              <span>Arah: {selectedVessel.gps.currentPosition.heading.toFixed(0)}°</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Clock size={14} className="text-orange-500" />
                            <span>Update: {new Date(selectedVessel.gps.currentPosition.timestamp || Date.now()).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-slate-200 pt-4">
                        <label className="text-xs font-medium text-slate-500 uppercase">Akurasi GPS</label>
                        <p className="text-sm text-slate-600">{selectedVessel.gps.currentPosition.accuracy || 'Tidak tersedia'}</p>
                      </div>
                    </>
                  )}
                  
                  {(selectedVessel.nahkoda || selectedVessel.nahkodaId) && (
                    <div className="border-t border-slate-200 pt-4">
                      <label className="text-xs font-medium text-slate-500 uppercase mb-2 block">Nahkoda</label>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">
                              {selectedVessel.nahkoda?.nama || selectedVessel.nahkoda?.username || `Nahkoda ID: ${selectedVessel.nahkodaId}` || 'Nahkoda'}
                            </p>
                            <p className="text-xs text-slate-500">{selectedVessel.nahkoda?.email || 'Data nahkoda'}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleCallCaptain('081234567890')}
                              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                              title="Hubungi via Telepon"
                            >
                              <Phone size={14} />
                            </button>
                            <button
                              onClick={() => handleWhatsAppCaptain('081234567890')}
                              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                              title="Hubungi via WhatsApp"
                            >
                              <Phone size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Panel - Map */}
              <div className="flex-1 relative">
                {selectedVessel.gps?.currentPosition ? (
                  <>
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border">
                      <div className="flex items-center space-x-2">
                        <MapPin size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">Lokasi Real-time</span>
                      </div>
                    </div>
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin size={48} className="mx-auto text-blue-500 mb-4" />
                        <p className="text-slate-700 font-medium">Peta Lokasi Kapal</p>
                        <p className="text-slate-500 text-sm mt-1">
                          {selectedVessel.gps.currentPosition.latitude.toFixed(6)}, {selectedVessel.gps.currentPosition.longitude.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-slate-50">
                    <div className="text-center">
                      <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500">Tidak ada data GPS</p>
                      <p className="text-slate-400 text-sm">Kapal belum mengirim lokasi</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;