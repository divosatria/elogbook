import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Edit, Trash2, Eye, EyeOff, Save, X, Palette, ChevronLeft, ChevronRight, Search, Filter, Map } from 'lucide-react';


import { backendAPI } from '@/services/backendService';
import wppData from '@/assets/data/wpp_indonesia.json';

interface Coordinate {
  lat: number;
  lng: number;
}

interface CatchPolygon {
  id: number;
  name: string;
  description: string;
  coordinates?: Coordinate[];
  zoneType: 'fishing' | 'restricted' | 'conservation' | 'special';
  fishTypes?: string[];
  regulations: any;
  maxVessels: number | null;
  minGt: number | null;
  maxGt: number | null;
  seasonalRestrictions: any;
  isActive: boolean;
  color: string;
  createdAt: string;
}

declare global {
  interface Window {
    L: any;
  }
}

const normalizeArrayField = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean) as T[];
    }
  }

  return [];
};

const CatchPolygonManagement: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [polygons, setPolygons] = useState<CatchPolygon[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<Coordinate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPolygon, setEditingPolygon] = useState<CatchPolygon | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWPP, setShowWPP] = useState(true);
  const [showWPPLabels, setShowWPPLabels] = useState(true);
  
  const [isDrawing, setIsDrawing] = useState(false);
  
  const wppLayerRef = useRef<any>(null);
  const wppLabelsLayerRef = useRef<any>(null);
  const landMaskLayerRef = useRef<any>(null);
  const customZonesLayerRef = useRef<any>(null);
  
  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterZoneType, setFilterZoneType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter polygons based on search
  const filteredPolygons = polygons.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterZoneType ? p.zoneType === filterZoneType : true;
    const matchesStatus = filterStatus ? (filterStatus === 'active' ? p.isActive : !p.isActive) : true;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate pagination on filtered results
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPolygons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPolygons.length / itemsPerPage);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterZoneType, filterStatus]);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zoneType: 'fishing' as const,
    fishTypes: [] as string[],
    maxVessels: '',
    minGt: '',
    maxGt: '',
    color: '#3b82f6'
  });

  const zoneTypes = [
    { value: 'fishing', label: 'Zona Tangkap', color: '#3b82f6' },
    { value: 'restricted', label: 'Zona Terlarang', color: '#ef4444' },
    { value: 'conservation', label: 'Zona Konservasi', color: '#10b981' },
    { value: 'special', label: 'Zona Khusus', color: '#f59e0b' }
  ];

  const fishTypeOptions = [
    'Tuna', 'Cakalang', 'Tongkol', 'Kembung', 'Teri', 'Baronang', 
    'Kakap', 'Kerapu', 'Tenggiri', 'Layur', 'Udang', 'Kepiting'
  ];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const indonesiaBounds = [
        [-13.0, 92.0], // South West
        [10.0, 142.0]  // North East
      ];

      const map = window.L.map(mapRef.current, {
        center: [-2.5, 118], // Indonesia overview
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        maxBounds: indonesiaBounds,
        maxBoundsViscosity: 1.0, // Snaps map back to bounds
        zoomControl: true
      });

      // Create Custom Panes for the "Sandwich" effect
      // 1. Pane below landmass
      const underLandPane = map.createPane('underLandPane');
      underLandPane.style.zIndex = '250';
      underLandPane.style.pointerEvents = 'none';
      underLandPane.style.mixBlendMode = 'multiply'; // Authentic "underwater" blending

      // 2. Pane for the Land Mask (Covers polygons on land)
      const landMaskPane = map.createPane('landMaskPane');
      landMaskPane.style.zIndex = '400';
      landMaskPane.style.pointerEvents = 'none';

      // 3. Pane for top-most labels and reference boundaries
      const topLabelsPane = map.createPane('topLabelsPane');
      topLabelsPane.style.zIndex = '500';
      topLabelsPane.style.pointerEvents = 'none';

      // BASE LAYER: Voyager No Labels (Water and Island Shapes)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: 'Â© OpenStreetMap contributors Â© CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // TOP LAYER: Voyager Only Labels (Islands details, Boundaries, and Names)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
        attribution: 'Â© OpenStreetMap contributors Â© CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
        pane: 'topLabelsPane' // Place on top of everything
      }).addTo(map);

      // Initialize Layer Groups
      wppLayerRef.current = window.L.layerGroup().addTo(map);
      wppLabelsLayerRef.current = window.L.layerGroup().addTo(map);
      landMaskLayerRef.current = window.L.layerGroup().addTo(map);
      customZonesLayerRef.current = window.L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      loadPolygons();
      addLandMaskLayer(); // Add the land mask on top of WPP
    };

    if (window.L) {
      initMap();
    } else {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        // Load Turf.js for Bezier Smoothing
        const turfScript = document.createElement('script');
        turfScript.src = 'https://unpkg.com/@turf/turf@6/turf.min.js';
        turfScript.onload = initMap;
        document.head.appendChild(turfScript);
      };
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    if (showWPP) {
      if (wppLayerRef.current && wppData) {
        renderWPP(mapInstanceRef.current, wppData);
      }
      if (landMaskLayerRef.current) {
        addLandMaskLayer();
      }
    } else {
      if (wppLayerRef.current) wppLayerRef.current.clearLayers();
      if (landMaskLayerRef.current) landMaskLayerRef.current.clearLayers();
    }
  }, [showWPP]);

  const addLandMaskLayer = async () => {
    if (!landMaskLayerRef.current) return;
    landMaskLayerRef.current.clearLayers();

    try {
      const response = await fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province-simple.json');
      const data = await response.json();
      
      window.L.geoJSON(data, {
        pane: 'landMaskPane',
        style: {
          fillColor: '#7ED957', // Vibrant Green like the reference
          fillOpacity: 1, 
          color: '#5DAA42',     // Darker green coastline
          weight: 1,
          opacity: 0.8
        }
      }).addTo(landMaskLayerRef.current);
    } catch (err) {
      console.error('Failed to load land mask:', err);
    }
  };


  const renderWPP = (map: any, geojsonData: any) => {
    if (!wppLayerRef.current) return;
    wppLayerRef.current.clearLayers();
    if (wppLabelsLayerRef.current) wppLabelsLayerRef.current.clearLayers();
    
    // Use original coordinates directly (no smoothing â€” accurate shapes)
    const finalData = geojsonData;
    
    window.L.geoJSON(finalData, {
      pane: 'underLandPane',
      style: (feature: any) => ({
        color: '#ffffff',
        weight: 2, 
        opacity: 0.7,
        fillColor: feature.properties.color || '#3b82f6',
        fillOpacity: 0.55,
        className: 'wpp-polygon-ultra-smooth'
      }),
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties && feature.properties.nama) {
          // Permanent label at center of polygon
          const bounds = layer.getBounds();
          const center = bounds.getCenter();
          const wppCode = feature.properties.WPP || '';
          const namaShort = feature.properties.nama
            .replace('WPPNRI ', '')
            .replace(wppCode + ' - ', '');
          
          const labelIcon = window.L.divIcon({
            className: 'wpp-permanent-label',
            html: `<div style="
              text-align: center;
              text-shadow: 1px 1px 3px rgba(0,0,0,0.7), -1px -1px 3px rgba(0,0,0,0.7);
              pointer-events: none;
              white-space: nowrap;
            ">
              <div style="font-size: 13px; font-weight: 900; color: #fff; letter-spacing: 0.5px;">WPP ${wppCode}</div>
              <div style="font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.85); font-style: italic;">${namaShort}</div>
            </div>`,
            iconSize: [120, 40],
            iconAnchor: [60, 20]
          });
          
          // Add label to separate labels layer group
          if (wppLabelsLayerRef.current) {
            window.L.marker(center, {
              icon: labelIcon,
              interactive: false,
              pane: 'topLabelsPane'
            }).addTo(wppLabelsLayerRef.current);
          }

          // Tooltip on hover for extra info
          layer.bindTooltip(`
            <div class="px-2 py-1 bg-white/90 backdrop-blur-sm rounded border border-slate-200 shadow-sm">
              <p class="text-[10px] font-bold text-slate-700">${feature.properties.nama}</p>
            </div>
          `, { sticky: true, className: 'wpp-tooltip' });
          
          layer.on({
            mouseover: (e: any) => {
              const l = e.target;
              l.setStyle({ 
                fillOpacity: 0.7, 
                weight: 3,
                opacity: 1
              });
              if (l._path) {
                l._path.classList.add('wpp-polygon-hover');
              }
            },
            mouseout: (e: any) => {
              const l = e.target;
              l.setStyle({ 
                fillOpacity: 0.55, 
                weight: 2,
                opacity: 0.7
              });
              if (l._path) {
                l._path.classList.remove('wpp-polygon-hover');
              }
            }
          });
        }
      }
    }).addTo(wppLayerRef.current);
  };

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const handleMapClick = (e: any) => {
      console.log('Map clicked:', e.latlng, 'Drawing mode:', isDrawing);
      if (isDrawing) {
        const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        console.log('Adding point:', newPoint);
        setCurrentPolygon(prev => {
          const updated = [...prev, newPoint];
          console.log('Updated polygon:', updated);
          return updated;
        });
      }
    };

    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [isDrawing]);

  // Update map when drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing drawing
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer.options && layer.options.isDrawing) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Draw current polygon
    if (currentPolygon.length > 0) {
      const latLngs = currentPolygon.map(p => [p.lat, p.lng]);
      
      if (currentPolygon.length >= 3) {
        window.L.polygon(latLngs, {
          color: formData.color,
          fillOpacity: 0.3,
          isDrawing: true,
          pane: 'underLandPane'
        }).addTo(mapInstanceRef.current);
      } else {
        latLngs.forEach(latlng => {
          window.L.circleMarker(latlng, {
            radius: 5,
            color: formData.color,
            isDrawing: true,
            pane: 'underLandPane'
          }).addTo(mapInstanceRef.current);
        });
      }
    }
  }, [currentPolygon, formData.color]);

  const loadPolygons = async () => {
    try {
      console.log('ðŸ” Loading catch polygons...');
      const response = await backendAPI.getCatchPolygons();
      console.log('ðŸ“¡ Catch polygons response:', response);
      
      if (response.success && response.data) {
        console.log('Raw polygon data from API:', response.data.length, 'polygons');
        
        // Transform data to match frontend interface
        const transformedPolygons = response.data.map(polygon => ({
          ...polygon,
          // Ensure compatibility with both field naming conventions
          zoneType: polygon.zoneType || polygon.zone_type,
          fishTypes: normalizeArrayField<string>(polygon.fishTypes ?? polygon.fish_types),
          coordinates: normalizeArrayField<Coordinate>(polygon.coordinates),
          maxVessels: polygon.maxVessels || polygon.max_vessels,
          isActive: polygon.isActive !== undefined ? polygon.isActive : polygon.is_active,
          seasonalRestrictions: polygon.seasonalRestrictions || polygon.seasonal_restrictions
        }));
        
        console.log(`âœ… Loaded ${transformedPolygons.length} catch polygons successfully`);
        setPolygons(transformedPolygons);
        renderPolygons(transformedPolygons);
      } else {
        console.error('âŒ API returned error:', response.message);
        // Try direct API call as fallback
        try {
          const token = localStorage.getItem('token');
          const directResponse = await fetch(`${backendAPI.baseURL}/api/catch-polygons`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (directResponse.ok) {
            const directData = await directResponse.json();
            if (directData.success && directData.data) {
              console.log('âœ… Direct catch polygons API call successful, loaded', directData.data.length, 'polygons');
              const transformedData = directData.data.map(polygon => ({
                ...polygon,
                zoneType: polygon.zoneType || polygon.zone_type,
                fishTypes: normalizeArrayField<string>(polygon.fishTypes ?? polygon.fish_types),
                coordinates: normalizeArrayField<Coordinate>(polygon.coordinates),
                maxVessels: polygon.maxVessels || polygon.max_vessels,
                isActive: polygon.isActive !== undefined ? polygon.isActive : polygon.is_active,
                seasonalRestrictions: polygon.seasonalRestrictions || polygon.seasonal_restrictions
              }));
              setPolygons(transformedData);
              renderPolygons(transformedData);
              return;
            }
          }
        } catch (directError) {
          console.error('âŒ Direct catch polygons API call also failed:', directError);
        }
      }
    } catch (error) {
      console.error('âŒ Error loading polygons:', error);
      // Try direct API call as fallback
      try {
        const token = localStorage.getItem('token');
        const directResponse = await fetch(`${backendAPI.baseURL}/api/catch-polygons`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.success && directData.data) {
            console.log('âœ… Direct catch polygons API call successful, loaded', directData.data.length, 'polygons');
            const transformedData = directData.data.map(polygon => ({
              ...polygon,
              zoneType: polygon.zoneType || polygon.zone_type,
              fishTypes: normalizeArrayField<string>(polygon.fishTypes ?? polygon.fish_types),
              coordinates: normalizeArrayField<Coordinate>(polygon.coordinates),
              maxVessels: polygon.maxVessels || polygon.max_vessels,
              isActive: polygon.isActive !== undefined ? polygon.isActive : polygon.is_active,
              seasonalRestrictions: polygon.seasonalRestrictions || polygon.seasonal_restrictions
            }));
            setPolygons(transformedData);
            renderPolygons(transformedData);
            return;
          }
        }
      } catch (directError) {
        console.error('âŒ Direct catch polygons API call also failed:', directError);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPolygons = (polygonList: CatchPolygon[]) => {
    if (!mapInstanceRef.current || !window.L || !customZonesLayerRef.current) return;

    // Clear existing polygons from the group
    customZonesLayerRef.current.clearLayers();

    // Render polygons with basic validation
    polygonList.forEach(polygon => {
      // Only skip if polygon is inactive or has no coordinates
      if (!polygon.isActive || !polygon.coordinates || !Array.isArray(polygon.coordinates) || polygon.coordinates.length < 3) {
        return;
      }
      
      try {
        const latLngs = polygon.coordinates.map(c => [c.lat, c.lng]);
        const leafletPolygon = window.L.polygon(latLngs, {
          color: polygon.color || '#3b82f6',
          weight: 2.5,
          fillOpacity: 0.45,
          isPolygon: true,
          pane: 'underLandPane'
        }).addTo(customZonesLayerRef.current);

        const fishTypes = polygon.fishTypes || [];
        
        // Use Tooltip for hover info
        leafletPolygon.bindTooltip(`
          <div class="px-3 py-2 bg-white rounded-lg shadow-xl border-l-4" style="border-left-color: ${polygon.color}">
            <p class="font-bold text-slate-800 text-xs">${polygon.name}</p>
            <p class="text-[10px] text-slate-500 font-medium">${zoneTypes.find(z => z.value === polygon.zoneType)?.label}</p>
          </div>
        `, { sticky: true, className: 'custom-zone-tooltip' });

        leafletPolygon.bindPopup(`
          <div class="p-3 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
               <div class="w-3 h-3 rounded-full" style="background: ${polygon.color}"></div>
               <h3 class="font-bold text-slate-800">${polygon.name}</h3>
            </div>
            <p class="text-xs text-slate-600 mb-2 leading-relaxed">${polygon.description || 'Tidak ada deskripsi'}</p>
            <div class="space-y-1.5">
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Informasi Zona</p>
              <div class="flex justify-between text-[11px]">
                <span class="text-slate-500">Tipe:</span>
                <span class="font-bold text-slate-700">${zoneTypes.find(z => z.value === polygon.zoneType)?.label}</span>
              </div>
              ${fishTypes.length > 0 ? `
                <div class="mt-2 text-[11px]">
                  <span class="text-slate-500 block mb-1">Target Ikan:</span>
                  <div class="flex flex-wrap gap-1">
                    ${fishTypes.map(f => `<span class="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-bold text-[9px] border border-blue-100">${f}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${polygon.maxVessels ? `
                <div class="flex justify-between text-[11px] mt-1">
                  <span class="text-slate-500">Kapasitas Kapal:</span>
                  <span class="font-bold text-slate-700">${polygon.maxVessels} Kapal</span>
                </div>
              ` : ''}
            </div>
          </div>
        `);

        // Hover Effect
        leafletPolygon.on({
          mouseover: (e: any) => {
            const l = e.target;
            l.setStyle({
              fillOpacity: 0.6,
              weight: 4
            });
            l.bringToFront();
          },
          mouseout: (e: any) => {
            const l = e.target;
            l.setStyle({
              fillOpacity: 0.35,
              weight: 2
            });
          }
        });

      } catch (error) {
        console.warn('Error rendering polygon:', error, polygon.name);
      }
    });
  };

  const startDrawing = () => {
    console.log('Starting drawing mode');
    setIsDrawing(true);
    setCurrentPolygon([]);
    setShowForm(true);
    setEditingPolygon(null);
    setFormData({
      name: '',
      description: '',
      zoneType: 'fishing',
      fishTypes: [],
      maxVessels: '',
      minGt: '',
      maxGt: '',
      color: '#3b82f6'
    });
    
    // Add visual feedback
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getContainer().style.cursor = 'crosshair';
    }
  };

  const finishDrawing = () => {
    if (currentPolygon.length < 3) {
      alert('Poligon harus memiliki minimal 3 titik');
      return;
    }
    console.log('Finishing drawing with', currentPolygon.length, 'points');
    setIsDrawing(false);
    
    // Reset cursor
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getContainer().style.cursor = '';
    }
  };

  const cancelDrawing = () => {
    console.log('Canceling drawing mode');
    setIsDrawing(false);
    setCurrentPolygon([]);
    setShowForm(false);
    setEditingPolygon(null);
    
    // Reset cursor
    if (mapInstanceRef.current) {
      mapInstanceRef.current.getContainer().style.cursor = '';
    }
  };

  const savePolygon = async () => {
    if (!formData.name.trim()) {
      alert('Nama zona harus diisi');
      return;
    }

    if (currentPolygon.length < 3) {
      alert('Poligon harus memiliki minimal 3 titik');
      return;
    }

    // Validate coordinates
    const validCoords = currentPolygon.filter(coord => 
      coord && 
      typeof coord.lat === 'number' && 
      typeof coord.lng === 'number' &&
      !isNaN(coord.lat) && 
      !isNaN(coord.lng) &&
      coord.lat >= -90 && coord.lat <= 90 &&
      coord.lng >= -180 && coord.lng <= 180
    );

    if (validCoords.length < 3) {
      alert('Koordinat tidak valid. Pastikan semua titik memiliki koordinat yang benar.');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        coordinates: validCoords,
        zoneType: formData.zoneType,
        fishTypes: formData.fishTypes,
        maxVessels: formData.maxVessels ? parseInt(formData.maxVessels) : null,
        minGt: formData.minGt !== '' ? parseFloat(formData.minGt) : null,
        maxGt: formData.maxGt !== '' ? parseFloat(formData.maxGt) : null,
        color: formData.color
      };

      const response = await backendAPI.createCatchPolygon(payload);
      if (response.success) {
        loadPolygons();
        cancelDrawing();
        alert('Zonasi tangkap berhasil disimpan');
      } else {
        alert(response.message || 'Gagal menyimpan zonasi');
      }
    } catch (error) {
      console.error('Error saving polygon:', error);
      alert('Terjadi kesalahan saat menyimpan');
    }
  };

  const togglePolygonStatus = async (id: number) => {
    try {
      const response = await backendAPI.toggleCatchPolygonStatus(id.toString());
      if (response.success) {
        loadPolygons();
      }
    } catch (error) {
      console.error('Error toggling polygon status:', error);
    }
  };

  const deletePolygon = async (id: number) => {
    if (!confirm('Yakin ingin menghapus zonasi ini?')) return;

    try {
      const response = await backendAPI.deleteCatchPolygon(id.toString());
      if (response.success) {
        loadPolygons();
        alert('Zonasi berhasil dihapus');
      }
    } catch (error) {
      console.error('Error deleting polygon:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Maritime Theme (matching DataKapal) */}
      {/* Header Section - Maritime Theme (matching DataKapal) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
            <Map className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Zonasi Tangkap Poligon
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Kelola zona tangkap dengan bentuk poligon
            </p>
          </div>
        </div>
        <button
          onClick={startDrawing}
          disabled={isDrawing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 font-bold text-sm active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Buat Zona Baru</span>
        </button>
      </div>

        {/* Statistics Cards - Atomic Component Pattern */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Total Zona</p>
              <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{polygons.length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0 ml-3 flex items-center justify-center">
              <Map size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Zona Aktif</p>
              <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{polygons.filter(p => p.isActive).length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 ml-3 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Zona Tangkap</p>
              <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{polygons.filter(p => p.zoneType === 'fishing').length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 shrink-0 ml-3 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between group">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 truncate">Zona Terlarang</p>
              <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">{polygons.filter(p => p.zoneType === 'restricted').length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 shrink-0 ml-3 flex items-center justify-center">
              <MapPin size={20} />
            </div>
          </div>
        </div>


      {/* Map Section - Full Width, Dashboard Style */}
      <div className="w-full h-[650px] min-h-[500px] bg-slate-900 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-300 group z-0">
        <div className="absolute inset-0 z-0">
          <div ref={mapRef} className="w-full h-full" />
        </div>
        
        {/* Map Header Overlay */}
        <div className="absolute top-6 left-6 right-6 flex flex-col sm:flex-row justify-between items-start gap-4 pointer-events-none z-10">
          <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border border-white/40 pointer-events-auto flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <MapPin size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Peta Zonasi Tangkap</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Polygon Management</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end pointer-events-auto">
            {/* Layer Controls */}
            <div className="flex gap-2">
              <button 
                onClick={() => setShowWPP(!showWPP)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg border transition-all font-bold text-xs ${
                  showWPP 
                  ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {showWPP ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>{showWPP ? 'WPPNRI' : 'WPPNRI'}</span>
              </button>

              <button 
                onClick={() => {
                  setShowWPPLabels(!showWPPLabels);
                  if (wppLabelsLayerRef.current && mapInstanceRef.current) {
                    if (showWPPLabels) {
                      mapInstanceRef.current.removeLayer(wppLabelsLayerRef.current);
                    } else {
                      wppLabelsLayerRef.current.addTo(mapInstanceRef.current);
                    }
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg border transition-all font-bold text-xs ${
                  showWPPLabels 
                  ? "bg-slate-700 text-white border-slate-600 hover:bg-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {showWPPLabels ? <Eye size={16} /> : <EyeOff size={16} />}
                <span>Label</span>
              </button>
            </div>

            {/* Legend Card - Enhanced with WPP zones */}
            <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/40 min-w-[220px] max-h-[420px] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Legenda Peta</p>
              
              {/* Zona Operasi */}
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Zona Operasi</p>
              <div className="space-y-2 mb-3">
                {zoneTypes.map(type => (
                  <div key={type.value} className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ background: type.color }}></div>
                    <span className="text-[11px] font-bold text-slate-700">{type.label}</span>
                  </div>
                ))}
              </div>
              
              {/* WPP Zones */}
              {showWPP && (
                <>
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Wilayah Pengelolaan Perikanan</p>
                  </div>
                  <div className="space-y-1.5">
                    {(wppData as any).features
                      .map((f: any) => ({
                        wpp: f.properties.WPP,
                        nama: f.properties.nama.replace('WPPNRI ', '').replace(f.properties.WPP + ' - ', ''),
                        color: f.properties.color
                      }))
                      .sort((a: any, b: any) => a.wpp.localeCompare(b.wpp))
                      .map((item: any) => (
                        <div key={item.wpp} className="flex items-center gap-2 group cursor-default">
                          <div 
                            className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/50 shadow-sm" 
                            style={{ background: item.color, opacity: 0.85 }}
                          ></div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-slate-700 block leading-tight">{item.wpp}</span>
                            <span className="text-[9px] text-slate-400 block leading-tight truncate">{item.nama}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Drawing Mode Panel */}
        {isDrawing && (
          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg z-[1001] border border-blue-200 pointer-events-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-sm font-bold text-slate-800">Mode Menggambar Aktif</p>
            </div>
            <p className="text-xs text-slate-600 mb-3">Klik pada peta untuk menambah titik poligon</p>
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-lg">
              <MapPin size={14} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-700">{currentPolygon.length} titik</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={finishDrawing}
                disabled={currentPolygon.length < 3}
                className="flex-1 text-xs bg-emerald-600 text-white px-3 py-2.5 rounded-xl disabled:opacity-50 hover:bg-emerald-700 transition-colors font-bold shadow-md"
              >
                Selesai
              </button>
              <button
                onClick={cancelDrawing}
                className="text-xs bg-rose-600 text-white px-3 py-2.5 rounded-xl hover:bg-rose-700 transition-colors font-bold shadow-md"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form & List Section - Below Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form - Only shown when drawing */}
        {showForm && (
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Save size={16} className="text-blue-600" />
                Detail Zonasi Baru
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Nama Zona *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  placeholder="Contoh: Zona Tangkap Utara"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
                  rows={2}
                  placeholder="Deskripsi zona..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipe Zona</label>
                  <select
                    value={formData.zoneType}
                    onChange={(e) => setFormData({...formData, zoneType: e.target.value as any})}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                  >
                    {zoneTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Warna Zona</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Jenis Ikan</label>
                <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {fishTypeOptions.map(fish => (
                    <label key={fish} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.fishTypes.includes(fish)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, fishTypes: [...formData.fishTypes, fish]});
                          } else {
                            setFormData({...formData, fishTypes: formData.fishTypes.filter(f => f !== fish)});
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-blue-600"
                      />
                      <span className="text-slate-700">{fish}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={savePolygon}
                  disabled={!formData.name.trim() || currentPolygon.length < 3}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Simpan Zona
                </button>
                <button
                  onClick={cancelDrawing}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Polygon List - Styled List */}
        <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          
          {/* Search Bar - Sticky & Consistent Style */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/60 p-4 shadow-sm sticky top-0 z-20">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari nama zona..."
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm transition-all duration-200 shadow-sm hover:border-slate-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Toggle & Reset */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-sm shadow-sm ${
                    showFilters || filterZoneType || filterStatus
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <Filter size={16} />
                  Filter
                  {(filterZoneType || filterStatus) && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                      {[filterZoneType, filterStatus].filter(Boolean).length}
                    </span>
                  )}
                </button>
                {(searchTerm || filterZoneType || filterStatus) && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterZoneType("");
                      setFilterStatus("");
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-200 transition-all duration-200"
                    title="Reset semua filter"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipe Zona
                    </label>
                    <select
                      value={filterZoneType}
                      onChange={(e) => setFilterZoneType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white"
                    >
                      <option value="">Semua Tipe</option>
                      {zoneTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-white"
                    >
                      <option value="">Semua Status</option>
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterZoneType("");
                        setFilterStatus("");
                      }}
                      className="w-full px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <X size={16} />
                      Reset Filter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200/60 transition-all shadow-sm overflow-hidden">
             {/* Header removed from here as it's cleaner without double header with search bar roughly serving same purpose or just use table header */}
          
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-500 text-sm mt-3 font-medium">Memuat data zonasi...</p>
              </div>
            ) : filteredPolygons.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-50">
                  <MapPin size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-700 font-bold text-lg mb-1">{searchTerm ? 'Zonasi tidak ditemukan' : 'Belum ada zonasi'}</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  {searchTerm ? `Tidak ada hasil untuk pencarian "${searchTerm}"` : 'Mulai dengan membuat zona tangkap baru pada peta.'}
                </p>
              </div>
            ) : (
              <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs tracking-wider border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3">Nama Zona</th>
                      <th className="px-4 py-3 text-center">Tipe</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Koordinat</th>
                      <th className="px-4 py-3">Jenis Ikan</th>
                      <th className="px-4 py-3 text-center w-32">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.map((polygon, index) => {
                      // Adjust index for display based on page
                      const displayIndex = indexOfFirstItem + index + 1;
                      return (
                      <tr 
                        key={polygon.id} 
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: polygon.color }}
                          >
                            {displayIndex}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{polygon.name}</span>
                            {polygon.description && (
                              <span className="text-xs text-slate-400 mt-0.5 line-clamp-1">{polygon.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span 
                            className="inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border"
                            style={{ 
                              backgroundColor: `${polygon.color}15`, 
                              borderColor: `${polygon.color}30`,
                              color: polygon.color 
                            }}
                          >
                            {zoneTypes.find(z => z.value === polygon.zoneType)?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            onClick={() => togglePolygonStatus(polygon.id)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all border ${
                              polygon.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {polygon.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5 text-slate-500">
                            <MapPin size={14} />
                            <span className="text-sm font-medium">{polygon.coordinates?.length || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {polygon.fishTypes && polygon.fishTypes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {polygon.fishTypes.slice(0, 3).map((fish, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded"
                                >
                                  {fish}
                                </span>
                              ))}
                              {polygon.fishTypes.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded">
                                  +{polygon.fishTypes.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                             <button
                              onClick={() => deletePolygon(polygon.id)}
                              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus Zonasi"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Footer */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                 <div className="text-sm text-slate-500">
                   Menampilkan <span className="font-bold text-slate-700">{currentItems.length > 0 ? indexOfFirstItem + 1 : 0}</span> sampai <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, filteredPolygons.length)}</span> dari <span className="font-bold text-slate-700">{filteredPolygons.length}</span> data
                 </div>
                 
                 <div className="flex items-center space-x-2">
                   <button
                     onClick={prevPage}
                     disabled={currentPage === 1}
                     className="p-2.5 border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-sm"
                   >
                     <ChevronLeft size={16} className="text-slate-600" />
                   </button>
                   
                   <div className="flex items-center space-x-1">
                     {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                       <button
                         key={page}
                         onClick={() => setCurrentPage(page)}
                         className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                           currentPage === page
                             ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                             : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                         }`}
                       >
                         {page}
                       </button>
                     ))}
                   </div>

                   <button
                     onClick={nextPage}
                     disabled={currentPage === totalPages}
                     className="p-2.5 border border-slate-200 rounded-xl bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-sm"
                   >
                     <ChevronRight size={16} className="text-slate-600" />
                   </button>
                 </div>
              </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
      <style>{`
        .wpp-polygon-ultra-smooth {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 0 1px rgba(0,0,0,0.1));
        }
        .wpp-polygon-hover {
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 1)) blur(0.2px) !important;
          stroke-width: 5px !important;
        }
        .wpp-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* Soften the edges of all WPP zones */
        .leaflet-pane.underLandPane-pane svg path {
          filter: blur(0.4px);
        }
      `}</style>
    </div>
  );
};

export default CatchPolygonManagement;


