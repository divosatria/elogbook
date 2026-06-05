import React, { useState, useEffect, useRef } from "react";

import { Plus, Edit2, Trash2, MapPin, Shield, AlertTriangle, CheckCircle, Building2, Phone, Mail, Clock, Wrench, ArrowLeft, Search, Filter, X, Anchor, Ship, Map, Fuel, Warehouse, TowerControl, Compass } from 'lucide-react';








import { backendAPI } from "@/services/backendService";
import { HarborPOI } from "../types";

interface HarborZone {
  id: string;
  name: string;
  coordinates:
    | { lat: number; lng: number }
    | Array<{ lat: number; lng: number }>;
  shape_type?: "circle" | "polygon";
  radius?: number;
  type: "harbor" | "port" | "anchorage" | "restricted" | "conservation";
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HarborZonesProps {
  onBack?: () => void;
}

const HarborZones: React.FC<HarborZonesProps> = ({ onBack }) => {
  const [zones, setZones] = useState<HarborZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"zones" | "pois">("zones");
  const [pois, setPois] = useState<HarborPOI[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showPOIForm, setShowPOIForm] = useState(false);
  const [editingZone, setEditingZone] = useState<HarborZone | null>(null);
  const [editingPOI, setEditingPOI] = useState<HarborPOI | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showZoneMapPicker, setShowZoneMapPicker] = useState(false);
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const zoneMapPickerRef = useRef<HTMLDivElement>(null);
  const mapPickerInstanceRef = useRef<any>(null);
  const zoneMapPickerInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [currentPolygon, setCurrentPolygon] = useState<any>(null);
  const [shapeType, setShapeType] = useState<"circle" | "polygon">("polygon");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPoiPage, setCurrentPoiPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState<{
    name: string;
    lat: string;
    lng: string;
    type: HarborZone["type"];
    radius: string;
    color: string;
  }>({
    name: "",
    lat: "",
    lng: "",
    type: "harbor",
    radius: "1000",
    color: "#10b981",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      lat: "",
      lng: "",
      type: "harbor",
      radius: "1000",
      color: "#10b981",
    });
    setPolygonPoints([]);
    setShapeType("polygon");
    setShowForm(false);
    setEditingZone(null);
  };

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const zoneData: any = {
      name: formData.name,
      type: formData.type,
      shape_type: "polygon",
      color: formData.color,
    };

    if (polygonPoints.length < 3) {
      alert("Polygon harus memiliki minimal 3 titik");
      return;
    }
    zoneData.coordinates = polygonPoints;

    try {
      let response;
      if (editingZone) {
        response = await backendAPI.updateHarborZone(editingZone.id, zoneData);
      } else {
        response = await backendAPI.createHarborZone(zoneData);
      }

      if (response.success) {
        loadZones(); // Reload zones
        resetForm();
        alert(
          editingZone ? "Zona berhasil diupdate" : "Zona berhasil ditambahkan",
        );
      } else {
        alert(response.message || "Gagal menyimpan zona");
      }
    } catch (error) {
      console.error("Error saving zone:", error);
      alert("Gagal menyimpan zona");
    }
  };

  const [poiFormData, setPoiFormData] = useState<{
    name: string;
    type: string;
    lat: string;
    lng: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    operatingHours: string;
    services: string;
  }>({
    name: "",
    type: "harbor_office",
    lat: "",
    lng: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    operatingHours: "",
    services: "",
  });

  const poiTypes = [
    {
      value: "harbor_office",
      label: "Kantor Pelabuhan",
      icon: Building2,
      color: "#3b82f6",
    },
    {
      value: "shipping_office",
      label: "Kantor Pelayaran",
      icon: Building2,
      color: "#10b981",
    },
    {
      value: "customs",
      label: "Kantor Bea Cukai",
      icon: Shield,
      color: "#f59e0b",
    },
    {
      value: "fuel_station",
      label: "SPBU Laut",
      icon: Fuel,
      color: "#ef4444",
    },
    {
      value: "repair_dock",
      label: "Dok Reparasi",
      icon: Wrench,
      color: "#8b5cf6",
    },
    { value: "warehouse", label: "Gudang", icon: Warehouse, color: "#6b7280" },
    { value: "lighthouse", label: "Mercusuar", icon: TowerControl, color: "#f97316" },
    {
      value: "pilot_station",
      label: "Stasiun Pandu",
      icon: Compass,
      color: "#06b6d4",
    },
  ];

  useEffect(() => {
    loadZones();
    loadPOIs();
  }, []);

  useEffect(() => {
    if (showForm && shapeType === "polygon") {
      setTimeout(() => {
        if (window.L) {
          initZoneMapPicker();
        } else {
          const cssLink = document.createElement("link");
          cssLink.rel = "stylesheet";
          cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(cssLink);

          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = initZoneMapPicker;
          document.head.appendChild(script);
        }
      }, 100);
    }

    return () => {
      if (zoneMapPickerInstanceRef.current) {
        zoneMapPickerInstanceRef.current.remove();
        zoneMapPickerInstanceRef.current = null;
      }
    };
  }, [showForm, shapeType]);

  const loadPOIs = async () => {
    try {
      console.log('ðŸ” Loading harbor POIs...');
      const response = await backendAPI.getHarborPOIs();
      console.log('ðŸ“¡ Harbor POIs response:', response);
      const poisData = response.data || response || [];
      console.log('ðŸ“Š Harbor POIs data:', poisData.length, 'POIs loaded');
      setPois(poisData);
    } catch (error) {
      console.error('âŒ Error loading POIs:', error);
      // Try direct API call as fallback
      try {
        const token = localStorage.getItem('token');
        const directResponse = await fetch(`${backendAPI.baseURL}/api/harbor-pois`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.success && directData.data) {
            console.log('âœ… Direct POI API call successful, loaded', directData.data.length, 'POIs');
            setPois(directData.data);
            return;
          }
        }
      } catch (directError) {
        console.error('âŒ Direct POI API call also failed:', directError);
      }
      
      alert("Gagal memuat data POI dari server. Menggunakan data contoh.");
      // Fallback to sample data if API fails
      const samplePOIs: HarborPOI[] = [
        {
          id: 1,
          name: "Kantor Pelabuhan Muara Baru",
          type: "harbor_office",
          coordinates: { lat: -6.1075, lng: 106.7803 },
          description: "Kantor administrasi pelabuhan utama",
          contact: {
            phone: "021-6693456",
            email: "admin@pelabuhanmuarabaru.id",
            address: "Jl. Muara Baru Raya No. 1",
          },
          operatingHours: "24 Jam",
          services: ["Perizinan Kapal", "Sertifikat Kelaikan", "Administrasi"],
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];
      setPois(samplePOIs);
    }
  };

  const loadZones = async () => {
    try {
      setLoading(true);
      console.log('ðŸ” Loading harbor zones...');
      const response = await backendAPI.getHarborZones();
      console.log('ðŸ“¡ Harbor zones response:', response);
      const zonesData = response.data || response || [];
      console.log('ðŸ“Š Harbor zones data:', zonesData.length, 'zones loaded');
      setZones(zonesData);
    } catch (error) {
      console.error('âŒ Error loading zones:', error);
      // Don't show alert immediately, try to get data anyway
      try {
        // Try direct API call as fallback
        const token = localStorage.getItem('token');
        const directResponse = await fetch(`${backendAPI.baseURL}/api/harbor-zones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (directResponse.ok) {
          const directData = await directResponse.json();
          if (directData.success && directData.data) {
            console.log('âœ… Direct API call successful, loaded', directData.data.length, 'zones');
            setZones(directData.data);
            return;
          }
        }
      } catch (directError) {
        console.error('âŒ Direct API call also failed:', directError);
      }
      
      // Only show alert and fallback if both methods fail
      alert("Gagal memuat data zona dari server. Menggunakan data contoh.");
      const sampleZones = [
        {
          id: "1",
          name: "Pelabuhan Muara Baru",
          coordinates: { lat: -6.1075, lng: 106.7803 },
          type: "harbor" as const,
          is_active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Pelabuhan Tanjung Priok",
          coordinates: { lat: -6.1044, lng: 106.8827 },
          type: "port" as const,
          is_active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setZones(sampleZones);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPOI = (poi: HarborPOI) => {
    setEditingPOI(poi);
    setPoiFormData({
      name: poi.name,
      type: poi.type,
      lat: poi.coordinates.lat.toString(),
      lng: poi.coordinates.lng.toString(),
      description: poi.description || "",
      phone: poi.contact?.phone || "",
      email: poi.contact?.email || "",
      address: poi.contact?.address || "",
      operatingHours: poi.operatingHours || "",
      services: poi.services?.join(", ") || "",
    });
    setShowPOIForm(true);
  };

  const handleDeletePOI = async (id: number) => {
    if (confirm("Yakin ingin menghapus POI ini?")) {
      try {
        const response = await backendAPI.deleteHarborPOI(id.toString());
        if (response.success) {
          setPois((prev) => prev.filter((p) => p.id !== id));
        }
      } catch (error) {
        console.error("Error deleting POI:", error);
        alert("Gagal menghapus POI");
      }
    }
  };

  const handlePOISubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lat = parseFloat(poiFormData.lat);
    const lng = parseFloat(poiFormData.lng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Koordinat harus berupa angka yang valid");
      return;
    }

    const poiData = {
      name: poiFormData.name,
      type: poiFormData.type,
      coordinates: { lat, lng },
      description: poiFormData.description,
      contact: {
        phone: poiFormData.phone || undefined,
        email: poiFormData.email || undefined,
        address: poiFormData.address || undefined,
      },
      operatingHours: poiFormData.operatingHours,
      services: poiFormData.services
        ? poiFormData.services
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
    };

    try {
      let response;
      if (editingPOI) {
        response = await backendAPI.updateHarborPOI(
          editingPOI.id.toString(),
          poiData,
        );
      } else {
        response = await backendAPI.createHarborPOI(poiData);
      }

      if (response.success) {
        loadPOIs(); // Reload POIs
        resetPOIForm();
        alert(
          editingPOI ? "POI berhasil diupdate" : "POI berhasil ditambahkan",
        );
      } else {
        alert(response.message || "Gagal menyimpan POI");
      }
    } catch (error) {
      console.error("Error saving POI:", error);
      alert("Gagal menyimpan POI");
    }
  };

  const resetPOIForm = () => {
    setPoiFormData({
      name: "",
      type: "harbor_office",
      lat: "",
      lng: "",
      description: "",
      phone: "",
      email: "",
      address: "",
      operatingHours: "",
      services: "",
    });
    setShowPOIForm(false);
    setEditingPOI(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "harbor":
        return <Anchor size={20} className="text-blue-600" />;
      case "anchorage":
        return <MapPin size={20} className="text-green-600" />;
      case "restricted":
        return <Shield size={20} className="text-red-600" />;
      default:
        return <MapPin size={20} className="text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "harbor":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "anchorage":
        return "bg-green-50 border-green-200 text-green-800";
      case "restricted":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const handleEdit = (zone: HarborZone) => {
    setEditingZone(zone);
    const isPolygon = Array.isArray(zone.coordinates);
    setShapeType("polygon");

    if (isPolygon) {
      setPolygonPoints(zone.coordinates as Array<{ lat: number; lng: number }>);
      setFormData({
        name: zone.name,
        lat: "",
        lng: "",
        type: zone.type,
        radius: "1000",
        color: (zone as any).color || "#10b981",
      });
    } else {
      const coords = zone.coordinates as { lat: number; lng: number };
      setFormData({
        name: zone.name,
        lat: coords.lat?.toString() || "",
        lng: coords.lng?.toString() || "",
        type: zone.type,
        radius: zone.radius?.toString() || "1000",
        color: (zone as any).color || "#10b981",
      });
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus zona ini?")) {
      try {
        const response = await backendAPI.deleteHarborZone(id);
        if (response.success) {
          setZones((prev) => prev.filter((z) => z.id !== id));
        }
      } catch (error) {
        console.error("Error deleting zone:", error);
        alert("Gagal menghapus zona");
      }
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const currentZones = await backendAPI.getHarborZones();
      const currentZone = currentZones.data.find(
        (z) => z.id.toString() === id.toString(),
      );

      if (!currentZone) {
        alert("Zona tidak ditemukan");
        return;
      }

      const newStatus = !currentZone.is_active;
      const isPolygon = Array.isArray(currentZone.coordinates);

      let updateData: any = {
        name: currentZone.name,
        type: currentZone.type,
        shape_type:
          currentZone.shape_type || (isPolygon ? "polygon" : "circle"),
        isActive: newStatus,
      };

      if (isPolygon) {
        updateData.coordinates = currentZone.coordinates;
      } else {
        const coords = currentZone.coordinates as { lat: number; lng: number };
        updateData.coordinates = {
          lat: parseFloat(coords.lat?.toString() || "0"),
          lng: parseFloat(coords.lng?.toString() || "0"),
        };
        updateData.radius = currentZone.radius || 1000;
      }

      const response = await backendAPI.updateHarborZone(id, updateData);

      if (response.success) {
        await loadZones();
      } else {
        alert(response.message || "Gagal mengubah status zona");
        await loadZones();
      }
    } catch (error) {
      console.error("Error toggling zone status:", error);
      alert("Gagal mengubah status zona");
      await loadZones();
    }
  };

  const initZoneMapPicker = () => {
    if (!zoneMapPickerRef.current || !window.L) return;

    if (zoneMapPickerInstanceRef.current) {
      zoneMapPickerInstanceRef.current.remove();
    }

    const map = window.L.map(zoneMapPickerRef.current, {
      center: [-6.1075, 106.7803],
      zoom: 13,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "Â© OpenStreetMap contributors",
    }).addTo(map);

    // Clear existing refs
    markersRef.current = [];
    polygonRef.current = null;

    let markers: any[] = [];
    let polygon: any = null;

    const updatePolygonFromMarkers = () => {
       const newPoints = markersRef.current.map((m) => {
          const pos = m.getLatLng();
          return { lat: pos.lat, lng: pos.lng };
        });
        
        if (polygonRef.current) {
          polygonRef.current.setLatLngs(newPoints.map((p) => [p.lat, p.lng]));
        }
        
        // Update state to reflect changes
        setPolygonPoints(newPoints);
    };

    // Load existing polygon if editing
    if (polygonPoints.length > 0) {
      const latlngs = polygonPoints.map((p) => [p.lat, p.lng]);
      polygon = window.L.polygon(latlngs, { 
        color: "blue",
        fillColor: "#3b82f6",
        fillOpacity: 0.3
      }).addTo(map);
      polygonRef.current = polygon;
      map.fitBounds(polygon.getBounds());

      polygonPoints.forEach((point, idx) => {
        const marker = window.L.marker([point.lat, point.lng], {
          draggable: true,
        })
          .addTo(map)
          .bindPopup(`Titik ${idx + 1}`);
        
        markers.push(marker);
        
        marker.on("drag", () => {
           // We update the polygon visually during drag, but state update happens on dragend to reduce renders if desired, 
           // but for <100 points direct update is fine.
           const newPoints = markers.map(m => { // Use local markers array for immediate closure access or ref
               const pos = m.getLatLng();
               return { lat: pos.lat, lng: pos.lng };
           });
           if (polygon) polygon.setLatLngs(newPoints.map(p => [p.lat, p.lng]));
        });

        marker.on("dragend", () => {
             updatePolygonFromMarkers();
        });
      });
      markersRef.current = markers;
    }

    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;

      const marker = window.L.marker([lat, lng], {
        draggable: true,
      })
        .addTo(map)
        .bindPopup(`Titik ${markersRef.current.length + 1}`)
        .openPopup();

      markersRef.current.push(marker);

      marker.on("drag", () => {
         const newPoints = markersRef.current.map(m => {
             const pos = m.getLatLng();
             return { lat: pos.lat, lng: pos.lng };
         });
         if (polygonRef.current) polygonRef.current.setLatLngs(newPoints.map((p: any) => [p.lat, p.lng]));
      });
      
      marker.on("dragend", () => {
          updatePolygonFromMarkers();
      });

      const points = markersRef.current.map((m) => {
        const pos = m.getLatLng();
        return { lat: pos.lat, lng: pos.lng };
      });

      if (points.length >= 3) {
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current);
        }
        polygonRef.current = window.L.polygon(
          points.map((p) => [p.lat, p.lng]),
          {
            color: "blue",
            fillColor: "#3b82f6",
            fillOpacity: 0.3,
          },
        ).addTo(map);
      }
      
      setPolygonPoints(points);
    });

    // Add clear button
    const clearControl = window.L.control({ position: "topright" });
    clearControl.onAdd = () => {
      const div = window.L.DomUtil.create("div", "leaflet-bar leaflet-control");
      div.innerHTML =
        '<a href="#" style="background: white; padding: 5px 10px; text-decoration: none; color: #333; font-weight: bold;">Clear</a>';
      div.onclick = (e) => {
        e.preventDefault();
        markersRef.current.forEach((m) => map.removeLayer(m));
        if (polygonRef.current) map.removeLayer(polygonRef.current);
        markersRef.current = [];
        polygonRef.current = null;
        setPolygonPoints([]);
      };
      return div;
    };
    clearControl.addTo(map);

    zoneMapPickerInstanceRef.current = map;
  };

  const initMapPicker = () => {
    if (!mapPickerRef.current || !window.L) return;

    if (mapPickerInstanceRef.current) {
      mapPickerInstanceRef.current.remove();
    }

    const map = window.L.map(mapPickerRef.current, {
      center: [-6.1075, 106.7803],
      zoom: 11,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "Â© OpenStreetMap contributors",
    }).addTo(map);

    let marker = null;

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;

      if (marker) {
        map.removeLayer(marker);
      }

      marker = window.L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        .openPopup();

      setPoiFormData((prev) => ({
        ...prev,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      }));
    });

    mapPickerInstanceRef.current = map;
  };

  // Two-way binding: Sync state changes to map
  useEffect(() => {
    // We only need to sync if the map exists and the change didn't come from the map itself 
    // (though re-setting setLatLngs is usually safe/idempotent enough for this scale)
    if (!zoneMapPickerInstanceRef.current || !window.L || !polygonRef.current) return;

    const map = zoneMapPickerInstanceRef.current;
    
    // Update polygon shape
    const latlngs = polygonPoints.map(p => [p.lat, p.lng]);
    polygonRef.current.setLatLngs(latlngs);
    
    // Update markers positions
    // If length mismatch (e.g. point added/removed manually), we might need to rebuild markers.
    // For now, let's assume length is stable or handle rebuild if needed.
    // If length changed, it's safer to rebuild markers.
    if (markersRef.current.length !== polygonPoints.length) {
       // Clear existing markers
       markersRef.current.forEach(m => map.removeLayer(m));
       markersRef.current = [];
       
       // Recreate markers
       polygonPoints.forEach((point, idx) => {
          const marker = window.L.marker([point.lat, point.lng], { draggable: true }).addTo(map).bindPopup(`Titik ${idx + 1}`);
          markersRef.current.push(marker);
          
          marker.on("drag", () => {
             const newPoints = markersRef.current.map(m => {
                 const pos = m.getLatLng();
                 return { lat: pos.lat, lng: pos.lng };
             });
             // Visual update only
             if (polygonRef.current) polygonRef.current.setLatLngs(newPoints.map((p: any) => [p.lat, p.lng]));
          });
          
          marker.on("dragend", () => {
             // State update
             const newPoints = markersRef.current.map(m => {
                 const pos = m.getLatLng();
                 return { lat: pos.lat, lng: pos.lng };
             });
             setPolygonPoints(newPoints);
          });
       });
    } else {
       // Just update positions
       markersRef.current.forEach((marker, idx) => {
          if (polygonPoints[idx]) {
             marker.setLatLng([polygonPoints[idx].lat, polygonPoints[idx].lng]);
             marker.bindPopup(`Titik ${idx + 1}`); // Update label if index changed
          }
       });
    }
    
  }, [polygonPoints]);

  const handlePointChange = (index: number, field: 'lat' | 'lng', value: string) => {
    // Allow only numbers, minus sign, and dot
    if (!/^-?[\d.]*$/.test(value)) return;
    
    // Update state immediately for input responsiveness
    const newPoints = [...polygonPoints];
    
    // Handle standard update
    if (value === '-' || value === '') {
        // Allow temporary raw string in local state if we typed 'string' in state? 
        // But our state is number. We might need temporary local state or just parse 0/NaN.
        // For simplicity with number state, we might block empty or just parse to 0, 
        // or better: let the input be controlled by a formatted string if complex.
        // Here we'll try to parse, but if invalid, we might need to handle it.
        // Let's toggle to using string in input `value` and parse onBlur?
        // Or simpler: just update if it parses.
    }
    
    const numValue = parseFloat(value);
    
    // Validation limits
    if (!isNaN(numValue)) {
        if (field === 'lat' && (numValue < -90 || numValue > 90)) return; // Strict limit
        if (field === 'lng' && (numValue < -180 || numValue > 180)) return; // Strict limit
        
        // Precision check - string based
        if (value.includes('.') && value.split('.')[1].length > 6) return;
    }

    // We need to store the raw string value to allow typing like "12." or "-".
    // Since our state is `{ lat: number, lng: number }`, we can't store string.
    // We will parse immediately, but this prevents typing "12."
    // Solution: Cast to any or change state type. For this feature, let's assume valid nums.
    // If user types ".", `parseFloat("12.")` is `12`.
    // To allow smooth typing, usually we need a separate string state or controlled inputs.
    // Let's implement controlled inputs with direct state update for now, acknowledging "12." limitation.
    // BETTER: Use `e.target.value` passed directly to `value` prop if we use a helper, but here we update `lat/lng` numbers.
    // Compromise: We will update if it's a valid number.
    
    if (!isNaN(numValue)) {
       newPoints[index] = { ...newPoints[index], [field]: numValue };
       setPolygonPoints(newPoints);
    }
  };

  const addManualPoint = () => {
    // Add point near center or last point
    const center = { lat: -6.1075, lng: 106.7803 };
    const lastPoint = polygonPoints[polygonPoints.length - 1];
    const newPoint = lastPoint ? { lat: lastPoint.lat + 0.001, lng: lastPoint.lng + 0.001 } : center;
    setPolygonPoints([...polygonPoints, newPoint]);
  };

  const removePoint = (index: number) => {
     if (polygonPoints.length <= 3) {
         alert("Minimal 3 titik untuk polygon");
         return;
     }
     const newPoints = polygonPoints.filter((_, i) => i !== index);
     setPolygonPoints(newPoints);
  };


  const openMapPicker = () => {
    setShowMapPicker(true);
    setTimeout(() => {
      if (window.L) {
        initMapPicker();
      } else {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(cssLink);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = initMapPicker;
        document.head.appendChild(script);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">


      {/* Header */}
      {/* Header - Dashboard Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
            <Anchor className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Zonasi Pelabuhan
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Kelola zona pelabuhan dan fasilitas maritim
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("zones")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "zones"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Zona Pelabuhan
            </button>
            <button
              onClick={() => setActiveTab("pois")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "pois"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Fasilitas & POI
            </button>
          </div>
          <button
            onClick={() =>
              activeTab === "zones" ? setShowForm(true) : setShowPOIForm(true)
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>{activeTab === "zones" ? "Tambah Zona" : "Tambah POI"}</span>
          </button>
        </div>
      </div>



      {/* Content based on active tab */}
      {activeTab === "pois" ? (
        <>
          {/* POI Statistics - Atomic Component Pattern */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {poiTypes.slice(0, 4).map((type) => {
              const count = pois.filter(
                (poi) => poi.type === type.value,
              ).length;
              const IconComponent = type.icon;
              return (
                <div
                  key={type.value}
                  className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 truncate">
                      {type.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">
                      {count}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg shrink-0 ml-3 flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <IconComponent size={20} style={{ color: type.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Additional POI Types */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {poiTypes.slice(4).map((type) => {
              const count = pois.filter(
                (poi) => poi.type === type.value,
              ).length;
              const IconComponent = type.icon;
              return (
                <div
                  key={type.value}
                  className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 truncate">
                      {type.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">
                      {count}
                    </p>
                  </div>
                  <div
                    className="p-2.5 rounded-lg shrink-0 ml-3 flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <IconComponent size={20} style={{ color: type.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search Bar - POI Specific */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm sticky top-0 z-20">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari fasilitas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 shadow-sm hover:border-slate-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all font-bold text-sm shadow-sm ${
                    showFilters || filterType
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <Filter size={16} />
                  Filter
                  {filterType && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                      1
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipe POI
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white"
                    >
                      <option value="">Semua Tipe</option>
                      {poiTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterType("");
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

          {/* POI List - Table View */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {pois.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">Belum ada fasilitas</p>
                <p className="text-sm text-slate-400">
                  Klik "Tambah POI" untuk menambahkan fasilitas baru
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4 text-left">Nama Fasilitas</th>
                        <th className="px-6 py-4 text-center">Tipe</th>
                        <th className="px-6 py-4 text-left">Layanan</th>
                        <th className="px-6 py-4 text-left">Koordinat</th>
                        <th className="px-6 py-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pois
                        .filter((poi) => {
                          const matchesSearch = poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            poi.description?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = !filterType || poi.type === filterType;
                          return matchesSearch && matchesType;
                        })
                        .slice((currentPoiPage - 1) * itemsPerPage, currentPoiPage * itemsPerPage)
                        .map((poi) => {
                          const poiType = poiTypes.find((t) => t.value === poi.type);
                          const IconComponent = poiType?.icon || Building2;
                          return (
                            <tr
                              key={poi.id}
                              className="group hover:bg-blue-50/50 transition-all duration-150"
                            >
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="p-1.5 rounded-lg shrink-0 flex items-center justify-center"
                                    style={{
                                      backgroundColor: `${poiType?.color || "#6b7280"}15`,
                                    }}
                                  >
                                    <IconComponent
                                      size={18}
                                      style={{ color: poiType?.color || "#6b7280" }}
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">
                                      {poi.name}
                                    </span>
                                    {poi.description && (
                                      <span className="text-xs text-slate-500 truncate max-w-xs block">
                                        {poi.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                <span
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide shadow-sm"
                                  style={{
                                    backgroundColor: `${poiType?.color || "#6b7280"}10`,
                                    color: poiType?.color || "#6b7280",
                                    borderColor: `${poiType?.color || "#6b7280"}30`,
                                  }}
                                >
                                  {poiType?.label}
                                </span>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <div className="flex flex-wrap gap-1">
                                  {poi.services && poi.services.length > 0 ? (
                                    poi.services.slice(0, 2).map((service, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded border border-slate-200"
                                      >
                                        {service}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                  {poi.services && poi.services.length > 2 && (
                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded border border-slate-200">
                                      +{poi.services.length - 2}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <code className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                  {poi.coordinates?.lat?.toFixed(4) || "N/A"}, {poi.coordinates?.lng?.toFixed(4) || "N/A"}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <button
                                    onClick={() => handleEditPOI(poi)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePOI(poi.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {pois.length > 0 && (
                  <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-600">
                      Halaman{" "}
                      <span className="font-semibold text-slate-700">
                        {currentPoiPage}
                      </span>{" "}
                      dari{" "}
                      <span className="font-semibold text-slate-700">
                        {Math.max(1, Math.ceil(pois.filter((poi) => {
                          const matchesSearch = poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            poi.description?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = !filterType || poi.type === filterType;
                          return matchesSearch && matchesType;
                        }).length / itemsPerPage))}
                      </span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={currentPoiPage === 1}
                        onClick={() => setCurrentPoiPage((prev) => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        disabled={currentPoiPage >= Math.ceil(pois.filter((poi) => {
                          const matchesSearch = poi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            poi.description?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesType = !filterType || poi.type === filterType;
                          return matchesSearch && matchesType;
                        }).length / itemsPerPage)}
                        onClick={() => setCurrentPoiPage((prev) => prev + 1)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Statistics - Atomic Component Pattern */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Total Pelabuhan"
              value={zones.filter((z) => z.type === "harbor").length}
              icon={Anchor}
              color="cyan"
            />
            <StatCard
              label="Zona Berlabuh"
              value={zones.filter((z) => z.type === "anchorage").length}
              icon={Anchor}
              color="emerald"
            />
            <StatCard
              label="Pelabuhan Besar"
              value={zones.filter((z) => z.type === "port").length}
              icon={Ship}
              color="rose"
            />
            <StatCard
              label="Zona Aktif"
              value={zones.filter((z) => z.is_active).length}
              icon={Map}
              color="violet"
            />
          </div>

          {/* Search Bar - Zones Specific */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm sticky top-0 z-20">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari zona pelabuhan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all duration-200 shadow-sm hover:border-slate-300"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all font-bold text-sm shadow-sm ${
                    showFilters || filterType || filterStatus
                      ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <Filter size={16} />
                  Filter
                  {(filterType || filterStatus) && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-md leading-none">
                      {[filterType, filterStatus].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Tipe Zona
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white"
                    >
                      <option value="">Semua Tipe</option>
                      <option value="harbor">Pelabuhan</option>
                      <option value="port">Pelabuhan Besar</option>
                      <option value="anchorage">Zona Berlabuh</option>
                      <option value="restricted">Terlarang</option>
                      <option value="conservation">Konservasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 bg-white"
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
                        setFilterType("");
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

          {/* Zones List */}
            {/* Zones List - Table View */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-12 flex flex-col justify-center items-center text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                  <p>Memuat data zona...</p>
                </div>
              ) : zones.length === 0 ? (
                <div className="p-12 text-center">
                  <Anchor size={48} className="text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-2">Belum ada zona pelabuhan</p>
                  <p className="text-sm text-slate-400">
                    Klik "Tambah Zona" untuk menambahkan zona baru
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-4 text-left">Nama Zona</th>
                          <th className="px-6 py-4 text-center">Tipe</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-left">Bentuk</th>
                          <th className="px-6 py-4 text-left">Koordinat</th>
                          <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {zones
                          .filter((zone) => {
                            const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = !filterType || zone.type === filterType;
                            const matchesStatus = !filterStatus || 
                              (filterStatus === "active" && zone.is_active) ||
                              (filterStatus === "inactive" && !zone.is_active);
                            return matchesSearch && matchesType && matchesStatus;
                          })
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((zone) => (
                            <tr
                              key={zone.id}
                              className="group hover:bg-blue-50/50 transition-all duration-150"
                            >
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${
                                      zone.type === "harbor" ? "bg-blue-50 text-blue-600" :
                                      zone.type === "anchorage" ? "bg-emerald-50 text-emerald-600" :
                                      zone.type === "port" ? "bg-cyan-50 text-cyan-600" :
                                      "bg-rose-50 text-rose-600"
                                    }`}
                                  >
                                    {getTypeIcon(zone.type)}
                                  </div>
                                  <span className="font-bold text-slate-800 text-sm">
                                    {zone.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${getTypeColor(zone.type)}`}
                                >
                                  {zone.type === "harbor" ? "Pelabuhan" :
                                   zone.type === "anchorage" ? "Berlabuh" :
                                   zone.type === "port" ? "Pelabuhan Besar" : "Terlarang"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                                    zone.is_active
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {zone.is_active ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                  {zone.is_active ? "Aktif" : "Nonaktif"}
                                </span>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <div className="flex items-center gap-2 text-slate-600">
                                  <MapPin size={14} className="text-slate-400" />
                                  <span className="text-xs font-medium">
                                    {zone.shape_type === "polygon"
                                      ? `Polygon (${Array.isArray(zone.coordinates) ? zone.coordinates.length : 0} titik)`
                                      : `Circle (${zone.radius || 1000}m)`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 align-middle">
                                <code className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                  {Array.isArray(zone.coordinates)
                                    ? `${zone.coordinates.length} pts`
                                    : `${zone.coordinates?.lat?.toFixed(4)}, ${zone.coordinates?.lng?.toFixed(4)}`}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-center align-middle">
                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <button
                                    onClick={() => toggleStatus(zone.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      zone.is_active
                                        ? "text-emerald-600 hover:bg-emerald-50"
                                        : "text-amber-600 hover:bg-amber-50"
                                    }`}
                                    title={zone.is_active ? "Nonaktifkan" : "Aktifkan"}
                                  >
                                    {zone.is_active ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                  </button>
                                  <button
                                    onClick={() => handleEdit(zone)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(zone.id)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Footer */}
                  {zones.length > 0 && (
                    <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Halaman{" "}
                        <span className="font-semibold text-slate-700">
                          {currentPage}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold text-slate-700">
                          {Math.max(1, Math.ceil(zones.filter((zone) => {
                            const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = !filterType || zone.type === filterType;
                            const matchesStatus = !filterStatus || 
                              (filterStatus === "active" && zone.is_active) ||
                              (filterStatus === "inactive" && !zone.is_active);
                            return matchesSearch && matchesType && matchesStatus;
                          }).length / itemsPerPage))}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentPage >= Math.ceil(zones.filter((zone) => {
                            const matchesSearch = zone.name.toLowerCase().includes(searchTerm.toLowerCase());
                            const matchesType = !filterType || zone.type === filterType;
                            const matchesStatus = !filterStatus || 
                              (filterStatus === "active" && zone.is_active) ||
                              (filterStatus === "inactive" && !zone.is_active);
                            return matchesSearch && matchesType && matchesStatus;
                          }).length / itemsPerPage)}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
        </>
      )}

      {/* Zone Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">
                {editingZone ? "Edit Zona" : "Tambah Zona Baru"}
              </h3>
              <form onSubmit={handleZoneSubmit} className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nama Zona
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tipe Zona
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as
                            | "harbor"
                            | "port"
                            | "anchorage",
                        })
                      }
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="harbor">Pelabuhan</option>
                      <option value="port">Pelabuhan Besar</option>
                      <option value="anchorage">Zona Berlabuh</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Warna Zona
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="h-12 w-20 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                        placeholder="#10b981"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: "#10b981" })
                        }
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#10b981" }}
                        title="Hijau"
                      ></button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: "#3b82f6" })
                        }
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#3b82f6" }}
                        title="Biru"
                      ></button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: "#f59e0b" })
                        }
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#f59e0b" }}
                        title="Orange"
                      ></button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: "#ef4444" })
                        }
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#ef4444" }}
                        title="Merah"
                      ></button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, color: "#8b5cf6" })
                        }
                        className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: "#8b5cf6" }}
                        title="Ungu"
                      ></button>
                    </div>
                  </div>
                </div>
                {/* Polygon Config Always Shown */ }
                <>
                    {/* Coordinate List UI */}
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-slate-700">
                           Koordinat Polygon ({polygonPoints.length} titik)
                        </label>
                        <button
                          type="button"
                          onClick={addManualPoint}
                          className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          <Plus size={14} />
                          Tambah Titik
                        </button>
                      </div>

                      <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {polygonPoints.map((point, index) => (
                           <div key={index} className="flex items-center gap-2 group animate-in fade-in slide-in-from-top-1 duration-200">
                              <span className="text-xs font-mono text-slate-400 w-6 shrink-0">{index + 1}.</span>
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Lat</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={point.lat}
                                    onChange={(e) => handlePointChange(index, 'lat', e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    placeholder="Latitude"
                                  />
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Lng</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={point.lng}
                                    onChange={(e) => handlePointChange(index, 'lng', e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    placeholder="Longitude"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removePoint(index)}
                                disabled={polygonPoints.length <= 3}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Hapus titik"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        ))}
                      </div>
                      
                      {polygonPoints.length < 3 && (
                         <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Polygon membutuhkan minimal 3 titik
                         </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Klik pada peta</strong> untuk menambah titik
                        polygon (minimal 3 titik)
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Titik: {polygonPoints.length}{" "}
                        {polygonPoints.length >= 3 ? "âœ“ Siap disimpan" : ""}
                      </p>
                    </div>
                    <div className="h-96 rounded-lg overflow-hidden border-2 border-slate-300 mb-4">
                      <div ref={zoneMapPickerRef} className="w-full h-full" />
                    </div>
                  </>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingZone ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* POI Form Modal */}
      {showPOIForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingPOI ? "Edit POI" : "Tambah POI Baru"}
            </h3>
            <form onSubmit={handlePOISubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nama POI
                  </label>
                  <input
                    type="text"
                    value={poiFormData.name}
                    onChange={(e) =>
                      setPoiFormData({ ...poiFormData, name: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipe POI
                  </label>
                  <select
                    value={poiFormData.type}
                    onChange={(e) =>
                      setPoiFormData({
                        ...poiFormData,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {poiTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={poiFormData.lat}
                    onChange={(e) =>
                      setPoiFormData({ ...poiFormData, lat: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={poiFormData.lng}
                    onChange={(e) =>
                      setPoiFormData({ ...poiFormData, lng: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={() => openMapPicker()}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MapPin size={16} />
                  <span>Pilih di Peta</span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={poiFormData.description}
                  onChange={(e) =>
                    setPoiFormData({
                      ...poiFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={poiFormData.phone}
                    onChange={(e) =>
                      setPoiFormData({ ...poiFormData, phone: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={poiFormData.email}
                    onChange={(e) =>
                      setPoiFormData({ ...poiFormData, email: e.target.value })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alamat
                </label>
                <input
                  type="text"
                  value={poiFormData.address}
                  onChange={(e) =>
                    setPoiFormData({ ...poiFormData, address: e.target.value })
                  }
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Jam Operasi
                  </label>
                  <input
                    type="text"
                    value={poiFormData.operatingHours}
                    onChange={(e) =>
                      setPoiFormData({
                        ...poiFormData,
                        operatingHours: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="08:00 - 17:00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Layanan (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={poiFormData.services}
                    onChange={(e) =>
                      setPoiFormData({
                        ...poiFormData,
                        services: e.target.value,
                      })
                    }
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Perizinan, Sertifikat, Administrasi"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetPOIForm}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPOI ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zone Map Picker Modal */}
      {showZoneMapPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Gambar Zona Pelabuhan
                </h3>
                <p className="text-sm text-slate-600">
                  Klik pada peta untuk menambah titik polygon
                </p>
              </div>
              <button
                onClick={() => setShowZoneMapPicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-2xl"
              >
                Ã—
              </button>
            </div>
            <div className="flex-1 p-4">
              <div className="h-full rounded-lg overflow-hidden border border-slate-300">
                <div ref={zoneMapPickerRef} className="w-full h-full" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                <p>ðŸ“ Klik pada peta untuk menambah titik (minimal 3 titik)</p>
                <p className="font-medium text-blue-600 mt-1">
                  Titik polygon: {polygonPoints.length}{" "}
                  {polygonPoints.length >= 3 ? "âœ“" : ""}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowZoneMapPicker(false)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => setShowZoneMapPicker(false)}
                  disabled={polygonPoints.length < 3}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Gunakan Polygon ({polygonPoints.length} titik)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                Pilih Koordinat di Peta
              </h3>
              <button
                onClick={() => setShowMapPicker(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-2xl"
              >
                Ã—
              </button>
            </div>
            <div className="flex-1 p-4">
              <div className="h-full rounded-lg overflow-hidden border border-slate-300">
                <div ref={mapPickerRef} className="w-full h-full" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                <p>ðŸ“ Klik pada peta untuk memilih koordinat</p>
                {poiFormData.lat && poiFormData.lng && (
                  <p className="font-medium text-blue-600">
                    Koordinat: {poiFormData.lat}, {poiFormData.lng}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMapPicker(false)}
                  className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => setShowMapPicker(false)}
                  disabled={!poiFormData.lat || !poiFormData.lng}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Gunakan Koordinat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB COMPONENTS FOR STYLING - Maritime Professional Theme ---
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) => {
  const colorConfig: any = {
    cyan: {
      border: "border-l-cyan-500",
      iconBg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
      iconColor: "text-cyan-600",
      glow: "shadow-cyan-100",
    },
    emerald: {
      border: "border-l-emerald-500",
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
      glow: "shadow-emerald-100",
    },
    amber: {
      border: "border-l-amber-500",
      iconBg: "bg-gradient-to-br from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
      glow: "shadow-amber-100",
    },
    rose: {
      border: "border-l-rose-500",
      iconBg: "bg-gradient-to-br from-rose-50 to-rose-100",
      iconColor: "text-rose-600",
      glow: "shadow-rose-100",
    },
    violet: {
      border: "border-l-violet-500",
      iconBg: "bg-gradient-to-br from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
      glow: "shadow-violet-100",
    },
  };

  const config = colorConfig[color] || colorConfig.cyan;

  return (
    <div
      className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 truncate">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800 mt-1 tracking-tight">
          {value}
        </p>
      </div>
      <div
        className={`p-2.5 rounded-lg shrink-0 ml-3 flex items-center justify-center ${config.iconBg.replace('bg-gradient-to-br from-', 'bg-').replace(' to-', '-100/50 ').split(' ')[0]}`}
      >
        <Icon size={20} className={`${config.iconColor}`} />
      </div>
    </div>
  );
};

export default HarborZones;

