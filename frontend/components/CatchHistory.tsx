import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { backendAPI } from '../services/backendService';
import { MapPin, Calendar, BarChart3, TrendingUp, Plus, Edit, Trash2, X, Map, ArrowLeft, Ship, Navigation, Anchor, Wallet, Activity, Ban, FileText, CheckCircle2, ChevronDown, FileSpreadsheet, Fish, Sun, Cloud, CloudRain, CloudLightning, AlertTriangle, Wind, Smartphone, Wifi, Scale, Monitor, Clock, Check } from 'lucide-react';
import { getAssetUrl } from '../config/urls';
import { getFishingRecommendation } from '../services/geminiService';


import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import LocationPickerSimple from './LocationPickerSimple';
import MapsBlockedNotification from './MapsBlockedNotification';
import LogbookKKP from './LogbookKKPModal';
import { useMapsDetection, useNotificationDismissed } from '../utils/useMapsDetection';

// Import logos for PDF
import logoKementrian from '../src/assets/images/logokementrian.png';
import logoIPB from '../src/assets/images/logoipbfull.png';

interface CatchReport {
  _id: string;
  vesselId: string;
  vesselName: string;
  date: string;
  fishType: string;
  weightKg: number;
  weightMobile?: number | null;
  weightIot?: number | null;
  pricePerKg?: number;
  totalPrice?: number;
  location: { lat: number; lng: number; zone?: string; name?: string; depth?: number };
  method?: string;
  weather?: string;
  notes?: string;
  createdAt?: string;
  // Mobile Data Fields
  tripId?: string;
  quantity?: number;
  crewCount?: number;
  fuelCost?: number;
  operationalCost?: number;
  totalCost?: number;
  netProfit?: number;
  photoUrl?: string | null;
  mobileData?: any;
  status?: string;
  _loadedAt?: string;
  // Extended Mobile Data Fields
  condition?: string;
  captainName?: string;
  vesselNumber?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  tripDurationHours?: number;
  tripDurationMinutes?: number;
  fishingZone?: string;
  locationName?: string;
  waterDepth?: number;
  mobileTax?: number;
  totalRevenue?: number;
  // Trip Data Fields (sumber tunggal dari JOIN backend)
  tripDepartureDate?: string;
  tripArrivalDate?: string;
  tripEstimatedReturn?: string;
  tripArea?: any;
  tripTargetFish?: string;
  tripDuration?: number;
  tripCrew?: { nama: string; noTelepon?: string }[];
  tripCrewCount?: number;
  tripCaptainName?: string;
  tripCaptainPhone?: string;
  vesselRegistration?: string;
  vesselGT?: number;
  vesselLength?: number;
  vesselOwner?: string;
  vesselFishingGear?: string;
  vesselHomePort?: string;
}

interface FishPrice {
  id?: number;
  fishType: string;
  pricePerKg: number;
  taxPercentage: number;
  isActive: boolean;
}

interface CatchHistoryProps {
  onBack?: () => void;
}

const CatchHistory: React.FC<CatchHistoryProps> = ({ onBack }) => {
  const [reports, setReports] = useState<CatchReport[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [fishPrices, setFishPrices] = useState<FishPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CatchReport | null>(null);
  const [editingReport, setEditingReport] = useState<CatchReport | null>(null);
  const [dateFilter, setDateFilter] = useState('all'); // today, yesterday, 3days, week, month, all, date, monthpick
  const [customDate, setCustomDate] = useState('');   // YYYY-MM-DD
  const [customMonth, setCustomMonth] = useState(''); // YYYY-MM
  const [dateRangeStart, setDateRangeStart] = useState(''); // YYYY-MM-DD
  const [dateRangeEnd, setDateRangeEnd] = useState('');     // YYYY-MM-DD
  const [validationFilter, setValidationFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('all'); // all | vesselId
  const [fishTypeFilter, setFishTypeFilter] = useState('all'); // all | fishType string
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('all');
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [excelExportPeriod, setExcelExportPeriod] = useState('all');
  const [showMapsNotification, setShowMapsNotification] = useState(false);
  const [catchZones, setCatchZones] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // States for Recommendation Modal
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [recSelectedZone, setRecSelectedZone] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [recData, setRecData] = useState<any>(null);

  // Maps detection - skip untuk performa
  // const mapsStatus = useMapsDetection();
  // const { isDismissed } = useNotificationDismissed();
  const mapsStatus = { isBlocked: false, isLoading: false, error: null, canUseGPS: true };
  const isDismissed = true;

  // Weather icon helper function
  const getWeatherIcon = (weather: string) => {
    const weatherLower = weather?.toLowerCase() || 'cerah';
    switch (weatherLower) {
      case 'cerah':
        return { 
          icon: Sun, 
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
      case 'berawan':
        return { 
          icon: Cloud, 
          color: 'text-slate-500',
          bgColor: 'bg-slate-50',
          borderColor: 'border-slate-200'
        };
      case 'hujan':
        return { 
          icon: CloudRain, 
          color: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'badai':
        return { 
          icon: CloudLightning, 
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      default:
        return { 
          icon: Sun, 
          color: 'text-amber-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200'
        };
    }
  };

  // Show notification if maps are blocked and user hasn't dismissed it
  useEffect(() => {
    if (mapsStatus.isBlocked && !mapsStatus.isLoading && !isDismissed) {
      setShowMapsNotification(true);
    }
  }, [mapsStatus.isBlocked, mapsStatus.isLoading, isDismissed]);

  const getReportsByPeriod = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return reports.filter(report => {
      const rawDate = report.date || report.createdAt || '';
      let reportDate: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [y, m, d] = rawDate.split('-').map(Number);
        reportDate = new Date(y, m - 1, d);
      } else {
        reportDate = new Date(rawDate);
      }

      switch (period) {
        case 'today':     return reportDate >= today;
        case 'yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return reportDate >= yesterday && reportDate < today;
        }
        case '3days': {
          const d3 = new Date(today); d3.setDate(d3.getDate() - 3);
          return reportDate >= d3;
        }
        case 'week': {
          const w = new Date(today); w.setDate(w.getDate() - 7);
          return reportDate >= w;
        }
        case 'month': {
          const m = new Date(today); m.setDate(m.getDate() - 30);
          return reportDate >= m;
        }
        case 'date': {
          if (!customDate) return true;
          const [y, m, d] = customDate.split('-').map(Number);
          const target = new Date(y, m - 1, d);
          const next = new Date(y, m - 1, d + 1);
          return reportDate >= target && reportDate < next;
        }
        case 'monthpick': {
          if (!customMonth) return true;
          const [y, m] = customMonth.split('-').map(Number);
          const start = new Date(y, m - 1, 1);
          const end = new Date(y, m, 1);
          return reportDate >= start && reportDate < end;
        }
        case 'range': {
          if (!dateRangeStart && !dateRangeEnd) return true;
          const start = dateRangeStart ? new Date(dateRangeStart + 'T00:00:00') : new Date(0);
          const end = dateRangeEnd ? new Date(dateRangeEnd + 'T23:59:59') : new Date();
          return reportDate >= start && reportDate <= end;
        }
        default: return true;
      }
    });
  };

  const getFilteredReports = () => {
    let results = getReportsByPeriod(dateFilter);

    if (vesselFilter !== 'all') {
      results = results.filter(r => String(r.vesselId) === vesselFilter);
    }

    if (fishTypeFilter !== 'all') {
      results = results.filter(r => r.fishType === fishTypeFilter);
    }

    if (validationFilter === 'pending') {
      results = results.filter(r => r.status === 'pending' || !r.weightKg || r.weightKg === 0);
    } else if (validationFilter === 'validated') {
      results = results.filter(r => r.weightKg > 0 && r.status !== 'pending');
    }

    return results;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, customDate, customMonth, dateRangeStart, dateRangeEnd, selectedZone, validationFilter, vesselFilter, fishTypeFilter]);


  const filteredReports = getFilteredReports();

  // Get fish price settings for specific fish type
  const getFishPriceSettings = (fishType: string) => {
    return fishPrices.find(fp => 
      fp.fishType.toLowerCase() === fishType.toLowerCase() && fp.isActive
    );
  };

  // Tax calculation function using settings
  const calculateTax = (weightKg: number, fishType: string, pricePerKg?: number) => {
    const fishSettings = getFishPriceSettings(fishType);
    
    // Use settings price if available, otherwise use provided price or default
    const price = fishSettings?.pricePerKg || pricePerKg || 15000;
    const taxRate = fishSettings ? (fishSettings.taxPercentage / 100) : 0.025; // Default 2.5%
    
    const totalValue = weightKg * price;
    const taxAmount = totalValue * taxRate;
    
    return {
      totalValue,
      taxAmount,
      netIncome: totalValue - taxAmount,
      taxRate: taxRate * 100, // Return as percentage
      priceUsed: price
    };
  };

  const handleViewDetail = (report: CatchReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };
  const [formData, setFormData] = useState({
    kapalId: '',
    tripId: '',
    jenisIkan: '',
    beratKg: '' as string | number,
    hargaPerKg: '' as string | number,
    lokasi: { lat: 0, lng: 0 },
    tanggalTangkap: new Date().toISOString().split('T')[0],
    metodeTangkap: '',
    kondisiCuaca: 'cerah',
    catatan: ''
  });
  const [vesselTrips, setVesselTrips] = useState<any[]>([]);

  const handleCheckRecommendation = async () => {
    if (!recSelectedZone) return;

    setRecLoading(true);
    setRecData(null);
    try {
      const zoneData = catchZones.find(z => String(z.id) === recSelectedZone);
      if (!zoneData) return;

      let lat = zoneData.center?.lat || 0;
      let lng = zoneData.center?.lng || 0;
      
      if (lat === 0 && lng === 0 && Array.isArray(zoneData.coordinates)) {
        let totalLat = 0, totalLng = 0, validPoints = 0;
        zoneData.coordinates.forEach((point: any) => {
          if (Array.isArray(point) && point.length >= 2) {
            let pLat = point[0];
            let pLng = point[1];
            if (pLat > 90 || pLat < -90) { pLat = point[1]; pLng = point[0]; }
            totalLat += pLat; totalLng += pLng; validPoints++;
          }
        });
        if (validPoints > 0) {
          lat = totalLat / validPoints;
          lng = totalLng / validPoints;
        }
      }

      const weatherResponse = await backendAPI.getWeatherData(lat, lng);
      const weatherData = weatherResponse?.data?.current?.weather || weatherResponse?.data?.weather || weatherResponse?.data || null;

      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yDateStr = yesterday.toISOString().split('T')[0];

      const yesterdayReports = reports.filter(r => {
           const reportDateStr = new Date(r.date || r.createdAt || r._loadedAt).toISOString().split('T')[0];
           if (reportDateStr !== yDateStr) return false;
           
           if (!r.location) return true;
           const dLat = Math.abs((r.location.lat || 0) - lat);
           const dLng = Math.abs((r.location.lng || 0) - lng);
           return dLat < 0.5 && dLng < 0.5;
      });

      const yesterdayTotalWeight = yesterdayReports.reduce((sum, r) => sum + (r.weightKg || 0), 0);

      const rec = await getFishingRecommendation(weatherData, yesterdayTotalWeight);
      
      setRecData({
          weather: weatherData,
          yesterdayTotal: yesterdayTotalWeight,
          recommendation: rec,
          zoneName: zoneData.name || 'Zona Terpilih',
          lat, lng
      });

    } catch (error) {
        console.error("Error check recommendation:", error);
        alert('Gagal mengambil data rekomendasi.');
    } finally {
        setRecLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    loadVessels();
    loadFishPrices();
    loadCatchZones();
    
    // Auto-refresh data every 30 seconds to ensure fresh data
    const interval = setInterval(() => {
      loadReports();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadFishPrices = async () => {
    try {
      const response = await backendAPI.getFishPrices();
      setFishPrices(response.data || []);
    } catch (error) {
      console.error('Load fish prices error:', error);
      setFishPrices([]);
    }
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      // Use getCatchReports (Admin Endpoint) which now includes mobile data
      const response = await backendAPI.getCatchReports();
      const reportsData = (response as any)?.data || response || [];
      
      const freshReports = Array.isArray(reportsData) ? reportsData.map((report: any) => ({
        _id: report._id || report.id,
        vesselId: report.vesselId || report.kapal?.id || 'Unknown',
        vesselName: report.vesselName || report.kapal?.namaKapal || 'Unknown',
        date: report.date || report.tanggalTangkap || new Date().toISOString().split('T')[0],
        fishType: report.fishType || report.jenisIkan || 'Unknown',
        weightKg: typeof report.weightKg === 'number' ? report.weightKg : parseFloat(report.weightKg || 0),
        weightMobile: report.weightMobile != null ? parseFloat(report.weightMobile) : null,
        weightIot: report.weightIot != null ? parseFloat(report.weightIot) : null,
        pricePerKg: report.pricePerKg || report.hargaPerKg,
        totalPrice: report.totalPrice || report.totalHarga,
        location: report.location || { lat: 0, lng: 0 },
        method: report.method || report.metodeTangkap,
        weather: report.weather || report.kondisiCuaca,
        notes: report.notes || report.catatan,
        createdAt: report.createdAt || report.date || new Date().toISOString(),
        status: report.status || 'pending',
        _loadedAt: new Date().toISOString(),
        
        // Mobile extended data
        tripId: report.tripId || null,
        quantity: report.quantity || report.mobileData?.quantity,
        crewCount: report.crewCount || report.mobileData?.crew_count,
        fuelCost: report.fuelCost || report.mobileData?.fuel_cost,
        operationalCost: report.operationalCost || report.mobileData?.operational_cost,
        totalCost: report.totalCost || report.mobileData?.total_cost,
        netProfit: report.netProfit || report.mobileData?.net_profit,
        photoUrl: getAssetUrl(report.photoUrl || report.mobileData?.photo_path),
        mobileData: report.mobileData || {},
        condition: report.mobileData?.condition || null,
        captainName: report.mobileData?.captain_name || null,
        vesselNumber: report.vesselNumber || report.mobileData?.vessel_number || null,
        departureDate: report.mobileData?.departure_date || null,
        departureTime: report.mobileData?.departure_time || null,
        arrivalDate: report.mobileData?.arrival_date || null,
        arrivalTime: report.mobileData?.arrival_time || null,
        tripDurationHours: report.mobileData?.trip_duration_hours || null,
        tripDurationMinutes: report.mobileData?.trip_duration_minutes || null,
        fishingZone: report.location?.zone || report.mobileData?.fishing_zone || null,
        locationName: report.location?.name || report.mobileData?.location_name || null,
        waterDepth: report.location?.depth || report.mobileData?.water_depth || null,
        mobileTax: report.mobileData?.tax || null,
        totalRevenue: report.totalPrice || report.mobileData?.total_revenue || null,

        // === Trip & Kapal fields — langsung dari backend JOIN, tidak ada fallback ke mobileData ===
        tripDepartureDate: report.tripDepartureDate || null,
        tripArrivalDate: report.tripArrivalDate || null,
        tripEstimatedReturn: report.tripEstimatedReturn || null,
        tripArea: report.tripArea || null,
        tripTargetFish: report.tripTargetFish || null,
        tripDuration: report.tripDuration || null,
        tripCrew: report.tripCrew || [],          // sudah berupa [{nama, noTelepon}]
        tripCrewCount: report.tripCrewCount || 0,
        tripCaptainName: report.tripCaptainName || null,
        tripCaptainPhone: report.tripCaptainPhone || null,
        vesselRegistration: report.vesselRegistration || null,
        vesselGT: report.vesselGT || null,
        vesselLength: report.vesselLength || null,
        vesselOwner: report.vesselOwner || null,
        vesselFishingGear: report.vesselFishingGear || null,
        vesselHomePort: report.vesselHomePort || null,
      })) : [];
      
      setReports(freshReports);
    } catch (error) {
      console.error('Load reports error:', error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVessels = async () => {
    try {
      const response = await backendAPI.getVessels();
      setVessels(response || []);
    } catch (error) {
      console.error('Load vessels error:', error);
      setVessels([]);
    }
  };

  const loadVesselTrips = async (kapalId: string) => {
    if (!kapalId) { setVesselTrips([]); return; }
    try {
      const response = await backendAPI.getTrips();
      const trips = (response?.data || response || []) as any[];
      // Filter trip milik kapal ini yang sudah aktif/selesai
      const filtered = trips.filter((t: any) =>
        String(t.kapal?.id || t.kapalId) === String(kapalId) &&
        ['disetujui', 'sedang_melaut', 'selesai'].includes(t.status)
      );
      setVesselTrips(filtered);
    } catch (error) {
      console.error('Load vessel trips error:', error);
      setVesselTrips([]);
    }
  };

  const loadCatchZones = async () => {
    try {
      const response = await backendAPI.getCatchPolygons();
      // Handle both { data: [...] } and direct array response format
      const zonesData = response?.data || response || [];
      setCatchZones(Array.isArray(zonesData) ? zonesData : []);
    } catch (error) {
      console.error('Load catch zones error:', error);
      setCatchZones([]);
    }
  };

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId);
    if (zoneId) {
      // Backend returns 'id' (number) but select value is string, so we compare loosely or convert
      const selectedZoneData = catchZones.find(z => String(z.id) === zoneId);
      
      if (selectedZoneData) {
        // Calculate centroid if coordinates exist
        let lat = 0;
        let lng = 0;
        
        if (selectedZoneData.coordinates && Array.isArray(selectedZoneData.coordinates) && selectedZoneData.coordinates.length > 0) {
          // Assume flattened array of points [[lat, lng], ...] or [[lng, lat], ...] depending on format
          // Based on backend log, coordinates is length of array.
          // Let's safe handle it.
          const points = selectedZoneData.coordinates;
          
          if (Array.isArray(points)) {
            // Simple centroid calculation
            let totalLat = 0;
            let totalLng = 0;
            let validPoints = 0;
            
            points.forEach((point: any) => {
              if (Array.isArray(point) && point.length >= 2) {
                // Determine which is lat/lng based on value range usually
                // Lat: -90 to 90, Lng: -180 to 180. Indonesia: Lat -11 to 6, Lng 95 to 141.
                let pLat = point[0];
                let pLng = point[1];
                
                // If it looks like GeoJSON [lng, lat]
                if (pLat > 90 || pLat < -90) {
                   pLat = point[1];
                   pLng = point[0];
                }
                
                totalLat += pLat;
                totalLng += pLng;
                validPoints++;
              }
            });
            
            if (validPoints > 0) {
              lat = totalLat / validPoints;
              lng = totalLng / validPoints;
            }
          }
        }
        
        // Only update if we calculated valid coordinates or if center property exists
        if (lat !== 0 || lng !== 0 || selectedZoneData.center) {
           setFormData({
            ...formData,
            lokasi: {
              lat: selectedZoneData.center?.lat || lat,
              lng: selectedZoneData.center?.lng || lng
            }
          });
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Construct date with current time if the selected date is today
      const now = new Date();
      const selectedDate = new Date(formData.tanggalTangkap);
      const isToday = selectedDate.toDateString() === now.toDateString();
      
      let finalDate = formData.tanggalTangkap;
      if (isToday) {
         // Combine selected date (YYYY-MM-DD) with current time
         const timeString = now.toTimeString().split(' ')[0]; // HH:mm:ss
         finalDate = `${formData.tanggalTangkap}T${timeString}`;
      } else {
         // If not today, default to mid-day or start of day, but typically just the date string is handled as 00:00
         finalDate = `${formData.tanggalTangkap}T00:00:00`;
      }

      const reportData = {
        ...formData,
        date: new Date(finalDate).toISOString(), // Send as 'date' field matching interface
        createdAt: now.toISOString(), // Explicitly send creation time
        beratKg: Number(formData.beratKg),
        hargaPerKg: formData.hargaPerKg ? parseInt(formData.hargaPerKg.toString().replace(/\./g, '')) : null
      };

      if (editingReport) {
        await backendAPI.updateCatchReport(editingReport._id, reportData);
      } else {
        await backendAPI.submitCatchReport(reportData);
      }
      
      await loadReports();
      resetForm();
      alert(editingReport ? 'Data berhasil diupdate!' : 'Data berhasil ditambahkan!');
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(`Gagal menyimpan data: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      kapalId: '',
      tripId: '',
      jenisIkan: '',
      beratKg: '',
      hargaPerKg: '',
      lokasi: { lat: 0, lng: 0 },
      tanggalTangkap: new Date().toISOString().split('T')[0],
      metodeTangkap: '',
      kondisiCuaca: 'cerah',
      catatan: ''
    });
    setVesselTrips([]);
    setSelectedZone('');
    setShowAddForm(false);
    setEditingReport(null);
  };

  const handleEdit = (report: CatchReport) => {
    setFormData({
      kapalId: report.vesselId,
      tripId: report.tripId || '',
      jenisIkan: report.fishType,
      beratKg: report.weightKg,
      hargaPerKg: report.pricePerKg || '',
      lokasi: report.location,
      tanggalTangkap: report.date,
      metodeTangkap: report.method || '',
      kondisiCuaca: report.weather || 'cerah',
      catatan: report.notes || ''
    });
    loadVesselTrips(report.vesselId);
    setEditingReport(report);
    setShowAddForm(true);
  };

  const handleDelete = async (reportId: string) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      try {
        await backendAPI.deleteCatchReport(reportId);
        await loadReports();
        alert('Data berhasil dihapus!');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Gagal menghapus data');
      }
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const fishDistribution = filteredReports.reduce((acc: any[], report) => {
    const existing = acc.find(item => item.name === report.fishType);
    if (existing) {
      existing.value += report.weightKg;
    } else {
      acc.push({ name: report.fishType, value: report.weightKg });
    }
    return acc;
  }, []);

  const totalWeight = filteredReports.reduce((sum, r) => {
    // Smart priority: validated (manual) > mobile > iot
    return sum + (r.weightKg || r.weightMobile || r.weightIot || 0);
  }, 0);

  const handleDownloadMonthlyReport = async (periodOverride?: string) => {
    const period = periodOverride || exportPeriod;
    const targetReports = getReportsByPeriod(period);
    const periodText = period === 'today' ? 'Hari Ini' : period === 'week' ? '7 Hari Terakhir' : period === 'month' ? '30 Hari Terakhir' : 'Semua Waktu';
    
    setShowExportModal(false); // Close modal

    try {
      // Load signature settings
      const signatureSettings = await backendAPI.getSignatureSettings();

      const doc = new jsPDF();

      // Load logos (left and right)
      const leftLogoPath = logoKementrian;  // Dinas Perikanan
      const rightLogoPath = logoIPB;     // IPB Logo
      let leftLogoDataUrl: string | null = null;
      let rightLogoDataUrl: string | null = null;

      // Load left logo
      try {
        const logoResponse = await fetch(leftLogoPath);
        if (logoResponse.ok) {
          const blob = await logoResponse.blob();
          leftLogoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Left logo not found, continuing without it');
      }

      // Load right logo
      try {
        const logoResponse = await fetch(rightLogoPath);
        if (logoResponse.ok) {
          const blob = await logoResponse.blob();
          rightLogoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.warn('Right logo not found, continuing without it');
      }

      // === HEADER SECTION ===
      let currentY = 20;

      // Add left logo if available
      if (leftLogoDataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const maxWidth = 35;
              const maxHeight = 18;
              
              const aspectRatio = img.width / img.height;
              let logoWidth = maxWidth;
              let logoHeight = maxWidth / aspectRatio;
              
              if (logoHeight > maxHeight) {
                logoHeight = maxHeight;
                logoWidth = maxHeight * aspectRatio;
              }
              
              doc.addImage(leftLogoDataUrl, 'PNG', 14, currentY, logoWidth, logoHeight);
              resolve();
            } catch (error) {
              console.warn('Error adding left logo:', error);
              resolve();
            }
          };
          img.onerror = () => {
            console.warn('Failed to load left logo');
            resolve();
          };
          img.src = leftLogoDataUrl;
        });
      }

      // Add right logo if available
      if (rightLogoDataUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const maxWidth = 35;
              const maxHeight = 18;
              
              const aspectRatio = img.width / img.height;
              let logoWidth = maxWidth;
              let logoHeight = maxWidth / aspectRatio;
              
              if (logoHeight > maxHeight) {
                logoHeight = maxHeight;
                logoWidth = maxHeight * aspectRatio;
              }
              
              // Position on right side
              const rightX = 196 - logoWidth;
              doc.addImage(rightLogoDataUrl, 'PNG', rightX, currentY, logoWidth, logoHeight);
              resolve();
            } catch (error) {
              console.warn('Error adding right logo:', error);
              resolve();
            }
          };
          img.onerror = () => {
            console.warn('Failed to load right logo');
            resolve();
          };
          img.src = rightLogoDataUrl;
        });
      }

      // Organization details - CENTERED between logos
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PEMERINTAH DAERAH", 105, currentY + 3, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("DINAS KELAUTAN DAN PERIKANAN", 105, currentY + 10, { align: "center" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Jl. Dramaga, Bogor 16680", 105, currentY + 17, { align: "center" });
      doc.text("Telp: (0251) 8622642 | Email: dkp@ipb.ac.id", 105, currentY + 23, { align: "center" });

      // Horizontal line below header
      doc.setLineWidth(0.8);
      doc.setDrawColor(30, 41, 59);
      doc.line(14, currentY + 30, 196, currentY + 30);

      currentY += 40;

      // === TITLE SECTION ===
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN HASIL TANGKAPAN IKAN", 105, currentY, { align: "center" });

      currentY += 10;

      // Period and report number
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Periode: ${periodText}`, 105, currentY, { align: "center" });

      currentY += 6;

      doc.setFontSize(9);
      const reportNumber = `LT/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
      doc.text(`Nomor: ${reportNumber}`, 105, currentY, { align: "center" });

      currentY += 10;

      // Horizontal line
      doc.setLineWidth(0.5);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY, 196, currentY);

      currentY += 10;

      // Introduction paragraph
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const introText = "Berdasarkan data yang tercatat dalam sistem E-Logbook, dengan ini dilaporkan hasil tangkapan ikan sebagai berikut:";
      const splitIntro = doc.splitTextToSize(introText, 182);
      doc.text(splitIntro, 14, currentY);

      currentY += splitIntro.length * 5 + 5;

      // === TABLE SECTION ===
      const tableBody = targetReports.map((report, index) => {
        const taxCalc = calculateTax(report.weightKg, report.fishType, report.pricePerKg);
        return [
          index + 1,
          new Date(report.date).toLocaleDateString('id-ID'),
          `${report.vesselName}\n(${report.vesselId})`,
          report.fishType,
          `${report.weightKg} kg`,
          `Rp ${taxCalc.priceUsed.toLocaleString('id-ID')}`,
          `Rp ${taxCalc.totalValue.toLocaleString('id-ID')}`
        ];
      });

      const totalValue = targetReports.reduce((sum, r) => sum + calculateTax(r.weightKg, r.fishType, r.pricePerKg).totalValue, 0);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Tanggal', 'Kapal', 'Jenis Ikan', 'Berat', 'Harga/Kg', 'Total Nilai']],
        body: tableBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [30, 41, 59],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right', fontStyle: 'bold' }
        },
        foot: [[
           '', 
           '', 
           'TOTAL', 
           '', 
           `${targetReports.reduce((s, r) => s + (r.weightKg || 0), 0).toLocaleString('id-ID')} kg`, 
           '', 
           `Rp ${totalValue.toLocaleString('id-ID')}`
        ]],
        footStyles: {
           fillColor: [241, 245, 249],
           textColor: [30, 41, 59],
           fontStyle: 'bold',
           halign: 'right'
        }
      });

      // Get position after table
      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // === SUMMARY SECTION ===
      let summaryY = finalY;
      
      // Check if we need a new page
      if (summaryY > 220) {
        doc.addPage();
        summaryY = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Ringkasan:", 14, summaryY);

      summaryY += 7;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`• Total Laporan: ${targetReports.length} transaksi`, 20, summaryY);
      const exportTotalWeight = targetReports.reduce((s, r) => s + (r.weightKg || 0), 0);
      doc.text(`• Total Berat: ${exportTotalWeight.toLocaleString('id-ID')} Kg`, 20, summaryY + 6);
      doc.text(`• Total Nilai Ekonomi: Rp ${totalValue.toLocaleString('id-ID')}`, 20, summaryY + 12);

      const totalTax = targetReports.reduce((sum, r) => sum + calculateTax(r.weightKg, r.fishType, r.pricePerKg).taxAmount, 0);
      doc.text(`• Estimasi Pajak Daerah: Rp ${totalTax.toLocaleString('id-ID')}`, 20, summaryY + 18);

      summaryY += 32;

      // === SIGNATURE SECTION ===
      // Check if we need a new page for signature
      if (summaryY > 230) {
        doc.addPage();
        summaryY = 20;
      }

      const signatureX = 120;
      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Bogor, ${dateStr}`, signatureX, summaryY);

      summaryY += 6;

      doc.setFont("helvetica", "bold");
      doc.text(signatureSettings.position || 'Kepala Dinas', signatureX, summaryY);

      summaryY += 5;

      // Add signature image if available
      if (signatureSettings.signature_image_path) {
        try {
          const signatureUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${signatureSettings.signature_image_path}`;
          const signatureResponse = await fetch(signatureUrl);
          if (signatureResponse.ok) {
            const signatureBlob = await signatureResponse.blob();
            const signatureDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(signatureBlob);
            });
            
            // Wait for signature image to load before calculating dimensions
            await new Promise<void>((resolveImg) => {
              const sigImg = new Image();
              sigImg.onload = () => {
                try {
                  // Set max dimensions for signature area
                  const maxSigWidth = 50;
                  const maxSigHeight = 25;
                  
                  // Calculate proportional dimensions
                  const sigAspectRatio = sigImg.width / sigImg.height;
                  let sigWidth = maxSigWidth;
                  let sigHeight = maxSigWidth / sigAspectRatio;
                  
                  // If height exceeds max, scale by height instead
                  if (sigHeight > maxSigHeight) {
                    sigHeight = maxSigHeight;
                    sigWidth = maxSigHeight * sigAspectRatio;
                  }
                  
                  doc.addImage(signatureDataUrl, 'PNG', signatureX, summaryY, sigWidth, sigHeight);
                  summaryY += sigHeight + 2;
                  resolveImg();
                } catch (error) {
                  console.warn('Error adding signature:', error);
                  summaryY += 20;
                  resolveImg();
                }
              };
              sigImg.onerror = () => {
                console.warn('Failed to load signature image');
                summaryY += 20;
                resolveImg();
              };
              sigImg.src = signatureDataUrl;
            });
          } else {
            // Empty space if signature image not found
            summaryY += 20;
          }
        } catch (error) {
          console.warn('Failed to load signature image:', error);
          summaryY += 20;
        }
      } else {
        // Empty space for manual signature
        summaryY += 20;
      }

      // Signature name with underline
      doc.setFont("helvetica", "bold");
      doc.text(signatureSettings.name || '_______________________', signatureX, summaryY);
      doc.setLineWidth(0.3);
      if (signatureSettings.name) {
        const textWidth = doc.getTextWidth(signatureSettings.name);
        doc.line(signatureX, summaryY + 1, signatureX + textWidth, summaryY + 1);
      }

      // === FOOTER (all pages) ===
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150);
        doc.text('E-Logbook Maritime System - Dokumen Resmi', 14, 285);
        doc.text(`Halaman ${i} dari ${pageCount}`, 196, 285, { align: 'right' });
        doc.setFontSize(7);
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 105, 290, { align: 'center' });
      }

      // Save PDF
      doc.save(`Laporan_Tangkapan_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
  };


  // ============================================================
  // LOGBOOK KKP — Format resmi sesuai PERMEN-KP 33/2021
  // Format sama dengan TripManagement tapi data dari hasil tangkapan
  // ============================================================
  const handleDownloadLogbookKKP = async (vesselIdFilter?: string) => {
    setLogbookLoading(true);
    try {
      const targetReports = vesselIdFilter
        ? reports.filter(r => String(r.vesselId) === String(vesselIdFilter))
        : reports;

      if (targetReports.length === 0) {
        alert('Tidak ada data tangkapan untuk dicetak.');
        return;
      }

      const signatureSettings = await backendAPI.getSignatureSettings();
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 14;
      const contentW = pageW - margin * 2;

      // Kelompokkan per kapal
      const byVessel: Record<string, CatchReport[]> = {};
      targetReports.forEach(r => {
        const key = `${r.vesselId}||${r.vesselName}`;
        if (!byVessel[key]) byVessel[key] = [];
        byVessel[key].push(r);
      });

      let isFirstPage = true;

      for (const [vesselKey, vesselReports] of Object.entries(byVessel)) {
        const [, vesselName] = vesselKey.split('||');
        const firstReport = vesselReports[0];

        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        let y = 10;

        // ── HEADER KOP ──────────────────────────────────────────
        doc.setDrawColor(0);
        doc.setLineWidth(0.8);
        doc.rect(margin, y, contentW, 28);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('KEMENTERIAN KELAUTAN DAN PERIKANAN', pageW / 2, y + 6, { align: 'center' });
        doc.text('DIREKTORAT JENDERAL PERIKANAN TANGKAP', pageW / 2, y + 11, { align: 'center' });

        doc.setFontSize(11);
        doc.text('LOGBOOK PENANGKAPAN IKAN', pageW / 2, y + 18, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('(Form C — Laporan Harian Kapal Penangkap Ikan)', pageW / 2, y + 23, { align: 'center' });

        y += 32;

        // ── NOMOR & TANGGAL ──────────────────────────────────────
        const nomorLogbook = `LBK/${new Date().getFullYear()}/${String(Date.now()).slice(-5)}`;
        const tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nomor Logbook : ${nomorLogbook}`, margin, y);
        doc.text(`Tanggal Cetak : ${tglCetak}`, pageW - margin, y, { align: 'right' });
        y += 6;

        // ── BAGIAN I: IDENTITAS KAPAL ────────────────────────────
        doc.setLineWidth(0.4);
        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, contentW, 6, 'FD');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('BAGIAN I — IDENTITAS KAPAL DAN NAHKODA', margin + 2, y + 4);
        y += 8;

        const colW = contentW / 2 - 2;
        const identitas: [string, string][] = [
          ['Nama Kapal', vesselName],
          ['No. Registrasi / SIPI', firstReport.vesselRegistration || firstReport.vesselNumber || firstReport.vesselId || '-'],
          ['Nama Nahkoda', firstReport.tripCaptainName || '-'],
          ['Jumlah ABK', firstReport.tripCrewCount ? `${firstReport.tripCrewCount} Orang` : '-'],
          ['Alat Tangkap', firstReport.vesselFishingGear || '-'],
          ['GT Kapal', firstReport.vesselGT ? `${firstReport.vesselGT} GT` : '-'],
          ['Panjang Kapal', firstReport.vesselLength ? `${firstReport.vesselLength} m` : '-'],
          ['Pemilik Kapal', firstReport.vesselOwner || '-'],
          ['Pelabuhan Pangkalan', firstReport.vesselHomePort || '-'],
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        identitas.forEach(([label, value], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const xBase = margin + col * (colW + 4);
          const yRow = y + row * 6;
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}`, xBase, yRow);
          doc.setFont('helvetica', 'normal');
          doc.text(`: ${value}`, xBase + 38, yRow);
        });
        y += Math.ceil(identitas.length / 2) * 6 + 4;

        // ── BAGIAN II: RINCIAN PERJALANAN ────────────────────────
        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, contentW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('BAGIAN II — RINCIAN PERJALANAN', margin + 2, y + 4);
        y += 8;

        const dates = vesselReports.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
        const tglBerangkat = firstReport.tripDepartureDate
          ? new Date(firstReport.tripDepartureDate).toLocaleDateString('id-ID')
          : dates[0]?.toLocaleDateString('id-ID') || '-';
        const tglKembali = firstReport.tripArrivalDate
          ? new Date(firstReport.tripArrivalDate).toLocaleDateString('id-ID')
          : dates[dates.length - 1]?.toLocaleDateString('id-ID') || '-';
        const durasiTrip = firstReport.tripDuration ? `${firstReport.tripDuration} Hari` : '-';
        const areaTangkap = (() => {
          const area = firstReport.tripArea;
          if (!area) return '-';
          if (typeof area === 'string') return area;
          if (area.nama) return area.nama;
          if (area.name) return area.name;
          return '-';
        })();

        const perjalanan: [string, string][] = [
          ['Tanggal Berangkat', tglBerangkat],
          ['Tanggal Kembali', tglKembali],
          ['Durasi Trip', durasiTrip],
          ['Area Tangkap', areaTangkap],
          ['Target Ikan', firstReport.tripTargetFish || '-'],
          ['Trip ID', firstReport.tripId ? `#${firstReport.tripId}` : '-'],
        ];

        doc.setFont('helvetica', 'normal');
        perjalanan.forEach(([label, value], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const xBase = margin + col * (colW + 4);
          const yRow = y + row * 6;
          doc.setFont('helvetica', 'bold');
          doc.text(`${label}`, xBase, yRow);
          doc.setFont('helvetica', 'normal');
          doc.text(`: ${value}`, xBase + 38, yRow);
        });
        y += Math.ceil(perjalanan.length / 2) * 6 + 4;

        // ── BAGIAN III: TABEL HASIL TANGKAPAN HARIAN ─────────────
        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, contentW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('BAGIAN III — CATATAN HASIL TANGKAPAN HARIAN', margin + 2, y + 4);
        y += 6;

        const tableRows = vesselReports.map((r, idx) => {
          const berat = r.weightKg || r.weightMobile || r.weightIot || 0;
          const taxCalc = calculateTax(berat, r.fishType, r.pricePerKg);
          const koordinat = r.location?.lat && r.location?.lng
            ? `${r.location.lat.toFixed(4)}, ${r.location.lng.toFixed(4)}`
            : '-';
          return [
            String(idx + 1),
            new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            r.fishType,
            r.method || '-',
            `${berat.toLocaleString('id-ID')} kg`,
            koordinat,
            r.weather || '-',
            `Rp ${taxCalc.totalValue.toLocaleString('id-ID')}`,
          ];
        });

        const totalBerat = vesselReports.reduce((s, r) => s + (r.weightKg || r.weightMobile || r.weightIot || 0), 0);
        const totalNilai = vesselReports.reduce((s, r) => {
          const berat = r.weightKg || r.weightMobile || r.weightIot || 0;
          return s + calculateTax(berat, r.fishType, r.pricePerKg).totalValue;
        }, 0);

        autoTable(doc, {
          startY: y,
          head: [['No', 'Tanggal', 'Jenis Ikan', 'Alat Tangkap', 'Berat (Kg)', 'Posisi (Lat, Lng)', 'Cuaca', 'Nilai (Rp)']],
          body: tableRows,
          foot: [['', '', '', 'TOTAL', `${totalBerat.toLocaleString('id-ID')} kg`, '', '', `Rp ${totalNilai.toLocaleString('id-ID')}`]],
          theme: 'grid',
          headStyles: { fillColor: [30, 64, 120], fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
          footStyles: { fillColor: [240, 244, 250], fontStyle: 'bold', fontSize: 7, halign: 'right' },
          styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
          columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { cellWidth: 22 },
            2: { cellWidth: 28 },
            3: { cellWidth: 28 },
            4: { halign: 'right', cellWidth: 22 },
            5: { cellWidth: 32, fontSize: 6.5 },
            6: { halign: 'center', cellWidth: 18 },
            7: { halign: 'right', cellWidth: 24 },
          },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 6;

        // ── BAGIAN IV: REKAPITULASI PER JENIS IKAN ───────────────
        if (y > 230) { doc.addPage(); y = 14; }

        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, contentW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('BAGIAN IV — REKAPITULASI PER JENIS IKAN', margin + 2, y + 4);
        y += 6;

        const rekapByFish: Record<string, { berat: number; nilai: number }> = {};
        vesselReports.forEach(r => {
          const berat = r.weightKg || r.weightMobile || r.weightIot || 0;
          const nilai = calculateTax(berat, r.fishType, r.pricePerKg).totalValue;
          if (!rekapByFish[r.fishType]) rekapByFish[r.fishType] = { berat: 0, nilai: 0 };
          rekapByFish[r.fishType].berat += berat;
          rekapByFish[r.fishType].nilai += nilai;
        });

        const rekapRows = Object.entries(rekapByFish).map(([jenis, data], i) => [
          String(i + 1),
          jenis,
          `${data.berat.toLocaleString('id-ID')} kg`,
          `Rp ${data.nilai.toLocaleString('id-ID')}`,
          `${((data.berat / totalBerat) * 100).toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: y,
          head: [['No', 'Jenis Ikan', 'Total Berat', 'Estimasi Nilai', '% Komposisi']],
          body: rekapRows,
          foot: [['', 'TOTAL', `${totalBerat.toLocaleString('id-ID')} kg`, `Rp ${totalNilai.toLocaleString('id-ID')}`, '100%']],
          theme: 'grid',
          headStyles: { fillColor: [30, 64, 120], fontSize: 7, fontStyle: 'bold', halign: 'center', cellPadding: 2 },
          footStyles: { fillColor: [240, 244, 250], fontStyle: 'bold', fontSize: 7 },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'center' },
          },
          margin: { left: margin, right: margin },
        });

        y = (doc as any).lastAutoTable.finalY + 8;

        // ── BAGIAN V: PERNYATAAN & TANDA TANGAN ──────────────────
        if (y > 220) { doc.addPage(); y = 14; }

        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, contentW, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('BAGIAN V — PERNYATAAN NAHKODA', margin + 2, y + 4);
        y += 9;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const pernyataan = 'Saya yang bertanda tangan di bawah ini menyatakan bahwa data yang tercantum dalam logbook ini adalah benar dan dapat dipertanggungjawabkan sesuai dengan kondisi sebenarnya di lapangan.';
        const splitPernyataan = doc.splitTextToSize(pernyataan, contentW);
        doc.text(splitPernyataan, margin, y);
        y += splitPernyataan.length * 4 + 6;

        // Tanda tangan 2 kolom: Nahkoda (kiri) & Petugas Pelabuhan (kanan)
        const sigColW = contentW / 2 - 5;
        const sigY = y;

        // Kiri — Nahkoda
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Nahkoda Kapal,', margin, sigY);
        doc.line(margin, sigY + 20, margin + sigColW, sigY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(firstReport.tripCaptainName || '(Nama Nahkoda)', margin, sigY + 24);

        // Kanan — Petugas
        const sigRightX = margin + sigColW + 10;
        const tglTtd = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.setFont('helvetica', 'normal');
        doc.text(`Mengetahui, ${tglTtd}`, sigRightX, sigY);
        doc.setFont('helvetica', 'bold');
        doc.text(signatureSettings.position || 'Petugas Pelabuhan / Syahbandar', sigRightX, sigY + 5);

        // Tambah tanda tangan digital jika ada
        if (signatureSettings.signature_image_path) {
          try {
            const sigUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${signatureSettings.signature_image_path}`;
            const sigResp = await fetch(sigUrl);
            if (sigResp.ok) {
              const sigBlob = await sigResp.blob();
              const sigDataUrl = await new Promise<string>(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(sigBlob);
              });
              doc.addImage(sigDataUrl, 'PNG', sigRightX, sigY + 6, 35, 14);
            }
          } catch { /* skip */ }
        }

        doc.line(sigRightX, sigY + 20, sigRightX + sigColW, sigY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(signatureSettings.name || '(Nama Petugas)', sigRightX, sigY + 24);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text('NIP. ___________________________', sigRightX, sigY + 28);
      }

      // ── FOOTER SEMUA HALAMAN ──────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(180);
        doc.setLineWidth(0.3);
        doc.line(margin, 287, pageW - margin, 287);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120);
        doc.text('Logbook Penangkapan Ikan — Sistem E-Logbook Maritim | Dinas Kelautan dan Perikanan', margin, 291);
        doc.text(`Hal. ${p} / ${totalPages}`, pageW - margin, 291, { align: 'right' });
        doc.setTextColor(0);
      }

      const vesselSuffix = vesselIdFilter ? `_${Object.values(byVessel)[0]?.[0]?.vesselName?.replace(/\s/g, '_') || vesselIdFilter}` : '_Semua_Kapal';
      doc.save(`Logbook_KKP${vesselSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error generating Logbook KKP:', error);
      alert('Gagal membuat Logbook KKP. Silakan coba lagi.');
    } finally {
      setLogbookLoading(false);
    }
  };

  // State untuk modal logbook KKP
  const [showLogbookModal, setShowLogbookModal] = useState(false);
  const [logbookVesselFilter, setLogbookVesselFilter] = useState('');
  const [logbookLoading, setLogbookLoading] = useState(false);

  // State untuk filter statistik periode — dihapus, pakai dateFilter global

  // State untuk titik jaring
  const [fishingPoints, setFishingPoints] = useState<any[]>([]);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpTripFilter, setFpTripFilter] = useState('');
  const [showFishingPoints, setShowFishingPoints] = useState(false);

  const loadFishingPoints = async (tripId?: string) => {
    setFpLoading(true);
    try {
      const res = await backendAPI.getFishingPoints(tripId);
      setFishingPoints(res.data || []);
    } catch (e) {
      console.error('Load fishing points error:', e);
      setFishingPoints([]);
    } finally {
      setFpLoading(false);
    }
  };

  const handleDeleteFishingPoint = async (pointId: string, withCatches: boolean) => {
    const msg = withCatches
      ? 'Hapus titik jaring beserta semua hasil tangkapan yang terkait?'
      : 'Hapus titik jaring ini? (hasil tangkapan terkait tidak ikut dihapus)';
    if (!confirm(msg)) return;
    try {
      await backendAPI.deleteFishingPoint(pointId, withCatches);
      setFishingPoints(prev => prev.filter(p => p.id !== pointId));
      if (withCatches) await loadReports();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
    }
  };
  const [showLogbookPreview, setShowLogbookPreview] = useState(false);
  const [logbookPreviewVesselId, setLogbookPreviewVesselId] = useState<string | undefined>(undefined);

  const handleExportExcel = (periodOverride?: string) => {
    const period = periodOverride || excelExportPeriod;
    const targetReports = getReportsByPeriod(period);

    setShowExcelExportModal(false);

    const headers = ['No', 'Tanggal', 'Kapal', 'ID Kapal', 'Jenis Ikan', 'Berat (Kg)', 'Harga/Kg (Rp)', 'Total Nilai (Rp)', 'Cuaca', 'Metode', 'Catatan'];

    const rows = targetReports.map((report, index) => {
      const taxCalc = calculateTax(report.weightKg, report.fishType, report.pricePerKg);
      return [
        index + 1,
        new Date(report.date).toLocaleDateString('id-ID'),
        report.vesselName,
        report.vesselId,
        report.fishType,
        report.weightKg,
        taxCalc.priceUsed,
        taxCalc.totalValue,
        report.weather || '-',
        report.method || '-',
        report.notes || '-'
      ];
    });

    const totalRow = [
      '', 'TOTAL', '', '', '',
      targetReports.reduce((s, r) => s + (r.weightKg || 0), 0),
      '',
      targetReports.reduce((s, r) => s + calculateTax(r.weightKg, r.fishType, r.pricePerKg).totalValue, 0),
      '', '', ''
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalRow]);

    // Column widths
    ws['!cols'] = [5, 14, 20, 14, 14, 12, 16, 18, 12, 14, 30].map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    const periodSuffix = period === 'today' ? '_HariIni' : period === 'week' ? '_7Hari' : period === 'month' ? '_30Hari' : '';
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Tangkapan');
    XLSX.writeFile(wb, `Laporan_Tangkapan${periodSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalEstimatedValue = filteredReports.reduce((sum, report) => {
    const taxCalc = calculateTax(report.weightKg, report.fishType, report.pricePerKg);
    return sum + taxCalc.totalValue;
  }, 0);

  const activeVesselsCount = new Set(filteredReports.map(r => r.vesselId)).size;

  // ── Statistik per periode — pakai filteredReports agar filter kapal ikut berpengaruh
  const getPeriodStats = () => {
    const now = new Date();
    const buckets: Record<string, { label: string; berat: number; nilai: number; count: number }> = {};

    // Tentukan window berdasarkan dateFilter global
    const windowDays = dateFilter === 'today' ? 1
      : dateFilter === 'yesterday' ? 2
      : dateFilter === '3days' ? 3
      : dateFilter === 'week' ? 7
      : dateFilter === 'month' ? 30
      : 30; // 'all' → tampilkan 30 hari terakhir di chart

    // Tentukan granularitas bucket
    const granularity = windowDays <= 7 ? 'daily' : windowDays <= 30 ? 'daily' : 'monthly';

    filteredReports.forEach(r => {
      const d = new Date(r.date || r.createdAt || '');
      if (isNaN(d.getTime())) return;
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      if (diffDays > windowDays && dateFilter !== 'all') return;

      const berat = r.weightKg || r.weightMobile || r.weightIot || 0;
      const nilai = calculateTax(berat, r.fishType, r.pricePerKg).totalValue;

      let key = '';
      let label = '';

      if (granularity === 'daily') {
        key = d.toISOString().split('T')[0];
        label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      }

      if (!buckets[key]) buckets[key] = { label, berat: 0, nilai: 0, count: 0 };
      buckets[key].berat += berat;
      buckets[key].nilai += nilai;
      buckets[key].count += 1;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  };

  const periodStats = getPeriodStats();
  const maxBerat = Math.max(...periodStats.map(s => s.berat), 1);

  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const monthInputRef = React.useRef<HTMLInputElement>(null);
  const hasActiveFilter = vesselFilter !== 'all' || fishTypeFilter !== 'all' || validationFilter !== 'all' || dateFilter !== 'all';
  const pendingCount = filteredReports.filter(r => r.status === 'pending' || !r.weightKg || r.weightKg === 0).length;
  const validatedCount = filteredReports.filter(r => r.weightKg > 0 && r.status !== 'pending').length;

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-sm">
            <Fish className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Laporan Hasil Tangkapan</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {reports.length} total data &bull; {new Set(reports.map(r => r.vesselId)).size} kapal
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowLogbookModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-xs font-semibold shadow-sm">
            <FileText size={14} /><span className="hidden sm:inline">Logbook KKP</span>
          </button>
          <button onClick={() => setShowRecommendationModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-xs font-semibold">
            <Navigation size={14} /><span className="hidden sm:inline">Rekomendasi</span>
          </button>
          <button onClick={() => setShowExcelExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-emerald-600 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-xs font-semibold">
            <FileSpreadsheet size={14} /><span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors text-xs font-semibold">
            <FileText size={14} /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold shadow-sm">
            <Plus size={14} strokeWidth={2.5} />Input Data
          </button>
        </div>
      </div>

      {/* ── SUMMARY CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Tangkapan</p>
          <p className="text-2xl font-black text-slate-800">{totalWeight.toLocaleString('id-ID')}</p>
          <p className="text-xs text-slate-400 mt-0.5">Kilogram</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Estimasi Nilai</p>
          <p className="text-2xl font-black text-emerald-600">Rp {(totalEstimatedValue / 1000000).toFixed(1)}<span className="text-sm font-bold text-slate-400"> Jt</span></p>
          <p className="text-xs text-slate-400 mt-0.5">Pendapatan kotor</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Laporan</p>
          <p className="text-2xl font-black text-blue-600">{filteredReports.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">dari {reports.length} total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Kapal Aktif</p>
          <p className="text-2xl font-black text-violet-600">{activeVesselsCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">kapal tercatat</p>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {/* Baris 1: Periode */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0 flex items-center gap-1 mr-1">
            <Calendar size={12} /> Periode
          </span>
          {(['today','yesterday','3days','week','month','all'] as const).map(v => {
            const labels: Record<string, string> = {
              today:'Hari Ini', yesterday:'Kemarin', '3days':'3 Hari',
              week:'7 Hari', month:'30 Hari', all:'Semua'
            };
            const active = dateFilter === v;
            return (
              <button key={v} onClick={() => setDateFilter(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {labels[v]}
                {active && <span className="ml-1 opacity-75">({getReportsByPeriod(v).length})</span>}
              </button>
            );
          })}

          {/* Tombol Rentang Tanggal */}
          <button
            type="button"
            onClick={() => setDateFilter(dateFilter === 'range' ? 'all' : 'range')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1 ${
              dateFilter === 'range' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <Calendar size={11} /> Rentang Tanggal
          </button>

          {/* Input rentang tanggal — muncul saat aktif */}
          {dateFilter === 'range' && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
              <input
                ref={dateInputRef}
                type="date"
                value={dateRangeStart}
                max={dateRangeEnd || undefined}
                onChange={e => setDateRangeStart(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-32"
                placeholder="Dari"
              />
              <span className="text-slate-400 text-xs font-bold">—</span>
              <input
                ref={monthInputRef}
                type="date"
                value={dateRangeEnd}
                min={dateRangeStart || undefined}
                onChange={e => setDateRangeEnd(e.target.value)}
                className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-32"
                placeholder="Sampai"
              />
              {(dateRangeStart || dateRangeEnd) && (
                <button
                  onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }}
                  className="text-blue-400 hover:text-blue-600 ml-1"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Baris 2: Kapal + Ikan + Status + Reset */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          {/* Kapal */}
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0 mr-1">Kapal</span>
          <button onClick={() => setVesselFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              vesselFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}>Semua</button>
          {vessels.filter(v => reports.some(r => String(r.vesselId) === String(v.id))).map(v => {
            const active = vesselFilter === String(v.id);
            return (
              <button key={v.id} onClick={() => setVesselFilter(String(v.id))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}>
                {v.namaKapal}
                <span className={`ml-1 text-[10px] ${ active ? 'opacity-75' : 'text-slate-400'}`}>
                  ({reports.filter(r => String(r.vesselId) === String(v.id)).length})
                </span>
              </button>
            );
          })}

          <span className="text-slate-200">|</span>

          {/* Jenis Ikan */}
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0 mr-1">Ikan</span>
          <select value={fishTypeFilter} onChange={e => setFishTypeFilter(e.target.value)}
            className={`px-2.5 py-1 border rounded-lg text-xs font-semibold cursor-pointer appearance-none outline-none transition-all ${
              fishTypeFilter !== 'all' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
            <option value="all">Semua Jenis</option>
            {Array.from(new Set(reports.map(r => r.fishType))).sort().map(ft => (
              <option key={ft} value={ft}>{ft}</option>
            ))}
          </select>

          <span className="text-slate-200">|</span>

          {/* Status */}
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0 mr-1">Status</span>
          <select value={validationFilter} onChange={e => setValidationFilter(e.target.value)}
            className={`px-2.5 py-1 border rounded-lg text-xs font-semibold cursor-pointer appearance-none outline-none transition-all ${
              validationFilter === 'pending' ? 'bg-amber-50 border-amber-300 text-amber-700'
              : validationFilter === 'validated' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
            <option value="all">Semua</option>
            <option value="pending">Belum Validasi</option>
            <option value="validated">Tervalidasi</option>
          </select>

          {hasActiveFilter && (
            <button onClick={() => { setVesselFilter('all'); setFishTypeFilter('all'); setValidationFilter('all'); setDateFilter('all'); setCustomDate(''); setCustomMonth(''); setDateRangeStart(''); setDateRangeEnd(''); }}
              className="ml-auto px-2.5 py-1 text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              ✕ Reset
            </button>
          )}
        </div>

        {/* Baris 3: Info hasil filter */}
        <div className="px-4 py-2 flex items-center gap-3 bg-slate-50/60 rounded-b-xl">
          <span className="text-xs text-slate-500">
            Menampilkan <span className="font-bold text-slate-700">{filteredReports.length}</span> dari <span className="font-bold text-slate-700">{reports.length}</span> data
          </span>
          <span className="w-px h-3 bg-slate-300" />
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{pendingCount} belum validasi
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{validatedCount} tervalidasi
          </span>
        </div>
      </div>
{/* ... modals ... */}
      {/* Export Period Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-100 rounded-xl">
                   <FileText size={20} className="text-red-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Export PDF</h3>
               </div>
               <button 
                 onClick={() => setShowExportModal(false)}
                 className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
               >
                 <X size={24} />
               </button>
             </div>
             
             <div className="p-6">
               <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Periode</label>
               <div className="relative">
                 <select
                    value={exportPeriod}
                    onChange={(e) => setExportPeriod(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 transition-all appearance-none bg-white font-medium text-slate-700"
                 >
                   <option value="today">Hari Ini</option>
                   <option value="week">7 Hari Terakhir</option>
                   <option value="month">30 Hari Terakhir</option>
                   <option value="all">Semua Data</option>
                 </select>
                 <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
               </div>
               <p className="text-xs text-slate-500 mt-2">
                 Akan mencetak {getReportsByPeriod(exportPeriod).length} data laporan dalam format PDF.
               </p>
             </div>
             
             <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-end space-x-3">
               <button
                 type="button"
                 onClick={() => setShowExportModal(false)}
                 className="bg-white text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-800 transition-all border border-slate-200 shadow-sm"
               >
                 Batal
               </button>
               <button
                 onClick={() => handleDownloadMonthlyReport()}
                 className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center"
               >
                 <FileText size={18} className="mr-2" />
                 Download
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Excel Export Period Modal */}
      {showExcelExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-3xl">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-100 rounded-xl">
                   <FileSpreadsheet size={20} className="text-emerald-600" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Export Excel</h3>
               </div>
               <button 
                 onClick={() => setShowExcelExportModal(false)}
                 className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
               >
                 <X size={24} />
               </button>
             </div>
             
             <div className="p-6">
               <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Periode</label>
               <div className="relative">
                 <select
                    value={excelExportPeriod}
                    onChange={(e) => setExcelExportPeriod(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all appearance-none bg-white font-medium text-slate-700"
                 >
                   <option value="today">Hari Ini</option>
                   <option value="week">7 Hari Terakhir</option>
                   <option value="month">30 Hari Terakhir</option>
                   <option value="all">Semua Data</option>
                 </select>
                 <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
               </div>
               <p className="text-xs text-slate-500 mt-2">
                 Akan mengekspor {getReportsByPeriod(excelExportPeriod).length} data laporan dalam format CSV/Excel.
               </p>
             </div>
             
             <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-end space-x-3">
               <button
                 type="button"
                 onClick={() => setShowExcelExportModal(false)}
                 className="bg-white text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-800 transition-all border border-slate-200 shadow-sm"
               >
                 Batal
               </button>
               <button
                 onClick={() => handleExportExcel()}
                 className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center"
               >
                 <FileSpreadsheet size={18} className="mr-2" />
                 Download
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Logbook KKP Modal */}
      {showLogbookModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-700 rounded-xl">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Logbook KKP</h3>
                  <p className="text-xs text-slate-500">Form C — Laporan Harian Kapal</p>
                </div>
              </div>
              <button onClick={() => setShowLogbookModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Filter Kapal</label>
                <div className="relative">
                  <select
                    value={logbookVesselFilter}
                    onChange={(e) => setLogbookVesselFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-white font-medium text-slate-700"
                  >
                    <option value="">Semua Kapal</option>
                    {Array.from(new Set(reports.map(r => r.vesselId))).map(vid => {
                      const name = reports.find(r => r.vesselId === vid)?.vesselName || vid;
                      return <option key={vid} value={vid}>{name}</option>;
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-blue-700 mb-1">Format Resmi KKP</p>
                <ul className="text-xs text-blue-600 space-y-0.5">
                  <li>• Bagian I: Identitas Kapal & Nahkoda</li>
                  <li>• Bagian II: Rincian Perjalanan</li>
                  <li>• Bagian III: Catatan Hasil Tangkapan Harian</li>
                  <li>• Bagian IV: Rekapitulasi per Jenis Ikan</li>
                  <li>• Bagian V: Pernyataan & Tanda Tangan</li>
                </ul>
              </div>
              <p className="text-xs text-slate-500">
                {logbookVesselFilter
                  ? `${reports.filter(r => r.vesselId === logbookVesselFilter).length} data untuk kapal terpilih`
                  : `${reports.length} data dari ${new Set(reports.map(r => r.vesselId)).size} kapal`
                }
              </p>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowLogbookModal(false)} className="bg-white text-slate-600 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-100 transition-all border border-slate-200">
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLogbookModal(false);
                  setLogbookPreviewVesselId(logbookVesselFilter || undefined);
                  setShowLogbookPreview(true);
                }}
                className="bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg flex items-center gap-2"
              >
                <FileText size={16} /> Buka & Cetak Logbook
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    {editingReport ? <Edit size={20} /> : <Plus size={20} />}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {editingReport ? 'Edit Data Tangkapan' : 'Input Data Tangkapan Baru'}
                    </h3>
                    <p className="text-sm text-slate-500">Isi formulir di bawah ini dengan lengkap</p>
                 </div>
              </div>
              <button 
                onClick={resetForm} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kapal</label>
                  <select
                    value={formData.kapalId}
                    onChange={(e) => {
                      const newKapalId = e.target.value;
                      setFormData({...formData, kapalId: newKapalId, tripId: ''});
                      loadVesselTrips(newKapalId);
                    }}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  >
                    <option value="">Pilih Kapal</option>
                    {vessels.map(vessel => (
                      <option key={vessel.id} value={vessel.id}>
                        {vessel.namaKapal} ({vessel.nomorKapal})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Trip <span className="text-slate-400">(untuk perbandingan data)</span>
                  </label>
                  <select
                    value={formData.tripId}
                    onChange={(e) => setFormData({...formData, tripId: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    disabled={!formData.kapalId}
                  >
                    <option value="">-- Pilih Trip (opsional) --</option>
                    {vesselTrips.map((trip: any) => (
                      <option key={trip.id} value={trip.id}>
                        Trip #{trip.id} — {new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID')} [{trip.status}]
                      </option>
                    ))}
                  </select>
                  {formData.kapalId && vesselTrips.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Tidak ada trip aktif/selesai untuk kapal ini</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Ikan</label>
                  <input
                    type="text"
                    value={formData.jenisIkan}
                    onChange={(e) => setFormData({...formData, jenisIkan: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Tuna, Kakap, dll"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Berat (Kg)</label>
                  <input
                    type="number"
                    value={formData.beratKg}
                    onChange={(e) => setFormData({...formData, beratKg: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    step="0.1"
                    min="0"
                    placeholder="Contoh: 45.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Harga per Kg <span className="text-slate-400">(opsional)</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-slate-500 font-bold">Rp</span>
                    <input
                      type="text"
                      value={formData.hargaPerKg}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value ? parseInt(value).toLocaleString('id-ID') : '';
                        setFormData({...formData, hargaPerKg: formatted});
                      }}
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Contoh: 25.000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Tangkap</label>
                  <input
                    type="date"
                    value={formData.tanggalTangkap}
                    onChange={(e) => setFormData({...formData, tanggalTangkap: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Kondisi Cuaca Laut</label>
                  <select
                    value={formData.kondisiCuaca}
                    onChange={(e) => setFormData({...formData, kondisiCuaca: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                    required
                  >
                    <option value="cerah">Cerah</option>
                    <option value="berawan">Berawan</option>
                    <option value="hujan">Hujan</option>
                    <option value="badai">Badai</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Metode Tangkap <span className="text-slate-400">(opsional)</span></label>
                  <input
                    type="text"
                    value={formData.metodeTangkap}
                    onChange={(e) => setFormData({...formData, metodeTangkap: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Jaring, Pancing, dll"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Zonasi Tangkap <span className="text-slate-400">(pilih zona atau input manual)</span></label>
                  <select
                    value={selectedZone}
                    onChange={(e) => handleZoneSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all mb-3 bg-white"
                  >
                    <option value="">-- Pilih Zona Tangkap atau Input Manual --</option>
                    {catchZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name} ({zone.zoneType || 'Zona'})
                      </option>
                    ))}
                  </select>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Koordinat Lokasi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">LAT</span>
                      <input
                        type="number"
                        value={formData.lokasi.lat || ''}
                        onChange={(e) => {
                          setFormData({...formData, lokasi: {...formData.lokasi, lat: parseFloat(e.target.value) || 0}});
                          setSelectedZone(''); // Clear zone selection on manual input
                        }}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="-6.1234"
                        step="any"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">LNG</span>
                      <input
                        type="number"
                        value={formData.lokasi.lng || ''}
                        onChange={(e) => {
                          setFormData({...formData, lokasi: {...formData.lokasi, lng: parseFloat(e.target.value) || 0}});
                          setSelectedZone(''); // Clear zone selection on manual input
                        }}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="106.1234"
                        step="any"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (mapsStatus.isBlocked) {
                        // Show notification if maps are blocked
                        setShowMapsNotification(true);
                      }
                      setShowLocationPicker(true);
                    }}
                    className="mt-3 flex items-center text-blue-600 hover:text-blue-700 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-all w-fit"
                  >
                    <Map size={16} className="mr-2" />
                    {mapsStatus.isBlocked ? 'Pilih Koordinat (Maps Diblokir)' : 'Pilih dari Zonasi Tangkap'}
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Catatan <span className="text-slate-400">(opsional)</span></label>
                  <textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    rows={3}
                    placeholder="Catatan tambahan mengenai hasil tangkapan..."
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-end space-x-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={resetForm}
                className="bg-white text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 hover:text-slate-800 transition-all border border-slate-200 shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center"
              >
                {editingReport ? <Edit size={18} className="mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                {editingReport ? 'Update Data' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 group hover:border-blue-200 transition-all relative">


           <div className="flex flex-col h-full gap-8">
             {/* Top Row: Metrik Utama & Nilai Ekonomi */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Total Tangkapan */}
                <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"><Fish size={24} /></div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Metrik Utama</span>
                             <span className="text-sm font-bold text-slate-700">Total Tangkapan</span>
                          </div>
                      </div>
                      <div className="mb-2">
                        <h3 className="text-4xl font-black text-slate-800 tracking-tight">{totalWeight.toLocaleString()}</h3>
                        <span className="text-sm font-medium text-slate-400">Kilogram</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center text-xs font-bold text-green-600 bg-white px-2 py-0.5 rounded border border-green-100 shadow-sm">
                          <TrendingUp size={14} className="mr-1" /> +12.5%
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{filteredReports.length} laporan</span>
                    </div>
                 </div>

                 {/* 2. Estimasi Nilai */}
                 <div className="flex flex-col justify-between">
                    <div>
                       <div className="flex items-center space-x-3 mb-4">
                          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm"><Wallet size={24} /></div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Estimasi Total</span>
                             <span className="text-sm font-bold text-slate-700">Nilai Ekonomi</span>
                          </div>
                       </div>
                       <div className="mb-2">
                         <h3 className="text-4xl font-black text-slate-800 tracking-tight">Rp {(totalEstimatedValue / 1000000).toFixed(1)} <span className="text-lg text-slate-400 font-bold">Jt</span></h3>
                         <p className="text-xs text-slate-400 mt-1">Estimasi pendapatan kotor</p>
                       </div>
                    </div>
                 </div>
             </div>

             {/* Bottom Row: Komoditas Utama */}
             <div className="pt-6 border-t border-slate-50">
                <p className="text-sm font-bold text-slate-700 mb-6 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Top Komoditas
                </p>
                {fishDistribution.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {fishDistribution.sort((a,b) => b.value - a.value).slice(0, 3).map((f, i) => (
                      <div key={f.name} className="flex flex-col">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-bold text-slate-700 text-sm">{f.name}</span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{((f.value / totalWeight) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(f.value / totalWeight) * 100}%` }}></div>
                          </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 italic text-sm">Belum ada data</p>}
             </div>
           </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-800 text-sm">Komposisi Jenis Ikan</h4>
            <span className="text-[10px] text-slate-400 font-medium">{filteredReports.length} data</span>
          </div>
          <div className="h-48 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fishDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={85}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {fishDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#22d3ee'][index % 8]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString('id-ID')} Kg`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 overflow-y-auto max-h-[120px] pr-1 custom-scrollbar">
             {fishDistribution.map((entry, index) => (
               <div key={entry.name} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center">
                     <div className="w-3 h-3 rounded mr-2" style={{backgroundColor: ['#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#34d399', '#fb923c', '#f87171', '#22d3ee'][index % 8]}}></div>
                     <span className="text-[11px] font-bold text-slate-700 truncate max-w-[80px]" title={entry.name}>{entry.name}</span>
                  </div>
                  <span className="text-[11px] font-black text-blue-600">{entry.value.toLocaleString('id-ID')} kg</span>
               </div>
             ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-center">
            <span className="text-lg font-black text-slate-800">{totalWeight.toLocaleString('id-ID')}</span>
            <span className="text-xs font-bold text-slate-400 ml-1">Kg Total</span>
          </div>
        </div>
      </div>

      {/* ── STATISTIK PERIODE ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">Statistik Tangkapan</h4>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">
              {dateFilter === 'today' ? 'Hari Ini'
                : dateFilter === 'yesterday' ? 'Kemarin'
                : dateFilter === '3days' ? '3 Hari Terakhir'
                : dateFilter === 'week' ? '7 Hari Terakhir'
                : dateFilter === 'month' ? '30 Hari Terakhir'
                : '30 Hari Terakhir (default)'}
            </span>
          </div>
          <span className="text-xs text-slate-400">{periodStats.length} periode • {filteredReports.length} laporan</span>
        </div>

        {periodStats.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Tidak ada data untuk periode ini.</p>
        ) : (
          <>
            {/* Bar chart sederhana */}
            <div className="flex items-end gap-2 h-32 mb-3">
              {periodStats.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex flex-col items-center justify-end h-24">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-10">
                      <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">
                        {s.berat.toLocaleString('id-ID')} kg • {s.count} laporan
                        <br />
                        Rp {(s.nilai / 1000000).toFixed(1)} Jt
                      </div>
                      <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                    </div>
                    {/* Bar */}
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all duration-500 hover:bg-blue-600"
                      style={{ height: `${Math.max((s.berat / maxBerat) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 text-center leading-tight truncate w-full text-center">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tabel ringkasan */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Periode</th>
                    <th className="px-3 py-2 text-center">Laporan</th>
                    <th className="px-3 py-2 text-right">Total Berat</th>
                    <th className="px-3 py-2 text-right">Estimasi Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodStats.map((s, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2 font-bold text-slate-700">{s.label}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{s.count}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">
                        {s.berat.toLocaleString('id-ID')} kg
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700">
                        Rp {(s.nilai / 1000000).toFixed(2)} Jt
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2 text-slate-600">TOTAL</td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {periodStats.reduce((s, r) => s + r.count, 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {periodStats.reduce((s, r) => s + r.berat, 0).toLocaleString('id-ID')} kg
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700">
                      Rp {(periodStats.reduce((s, r) => s + r.nilai, 0) / 1000000).toFixed(2)} Jt
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm">Log Tangkapan Masuk</h4>
              {vesselFilter !== 'all' && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {vessels.find(v => String(v.id) === vesselFilter)?.namaKapal || vesselFilter}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{filteredReports.length} data</span>
            </div>
          </div>
          <div className="w-full overflow-hidden rounded-lg border-t border-slate-200">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-[10%]">Trip ID</th>
                  <th className="px-4 py-3 text-center w-[18%]">Kapal Nelayan</th>
                  <th className="px-4 py-3 text-left w-[12%]">Spesies</th>
                  <th className="px-4 py-3 text-center w-[10%]">Mobile (Kg)</th>
                  <th className="px-4 py-3 text-center w-[10%]">IOT (Kg)</th>
                  <th className="px-4 py-3 text-center w-[10%]">Total (Kg)</th>
                  <th className="px-4 py-3 text-center w-[18%]">Koordinat</th>
                  <th className="px-4 py-3 text-center w-[12%]">Waktu</th>
                  <th className="px-4 py-3 text-center w-[10%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs bg-white">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Fish size={32} className="mb-2 opacity-50" />
                        <p className="font-medium text-sm">Belum ada data tangkapan</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const indexOfLast = currentPage * itemsPerPage;
                    const indexOfFirst = indexOfLast - itemsPerPage;
                    return filteredReports.slice(indexOfFirst, indexOfLast);
                  })().map((report) => (
                    <tr key={report._id} className="group hover:bg-blue-50/50 transition-all duration-150">
                      {/* Trip ID - CENTER ALIGNED */}
                      <td className="px-4 py-3.5 text-center align-middle">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          #{report.tripId || 'N/A'}
                        </span>
                      </td>

                      {/* Kapal Nelayan - LEFT ALIGNED (TEXT) */}
                      <td className="px-4 py-3.5 text-left align-middle">
                         <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 flex-shrink-0 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm border border-blue-100">
                               {report.vesselName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="font-bold text-slate-800 truncate text-xs leading-tight" title={report.vesselName}>{report.vesselName}</p>
                               <p className="text-[10px] text-slate-400 font-mono leading-tight">ID: {report.vesselId.substring(0,8)}</p>
                            </div>
                         </div>
                      </td>
                      
                      {/* Spesies - LEFT ALIGNED (TEXT) */}
                      <td className="px-4 py-3.5 text-left align-middle">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border
                          ${report.fishType.toLowerCase().includes('tuna') ? 'bg-red-50 text-red-700 border-red-200' : 
                            report.fishType.toLowerCase().includes('kakap') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'}`} title={report.fishType}>
                          {report.fishType}
                        </span>
                      </td>
                      
                      {/* Berat Mobile - CENTER ALIGNED (NUMBER) */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex items-baseline justify-center">
                           <span className="font-bold text-blue-600 text-xs tabular-nums">
                             {report.weightMobile ? report.weightMobile.toLocaleString('id-ID') : '-'}
                           </span>
                        </div>
                      </td>
                      
                      {/* Berat IOT - CENTER ALIGNED (NUMBER) */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex items-baseline justify-center">
                           <span className="font-bold text-emerald-600 text-xs tabular-nums">
                             {report.weightIot ? report.weightIot.toLocaleString('id-ID') : '-'}
                           </span>
                        </div>
                      </td>
                      
                      {/* Berat Total - CENTER ALIGNED (NUMBER) with Validation Badge */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center">
                           {report.weightKg > 0 ? (
                             <span className="font-black text-emerald-700 text-sm tabular-nums flex items-center gap-1">
                               {report.weightKg.toLocaleString('id-ID')}
                               <Check size={12} className="text-emerald-500" />
                             </span>
                           ) : (
                             <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200 inline-flex items-center gap-1 whitespace-nowrap">
                               <Clock size={10} /> Belum
                             </span>
                           )}
                        </div>
                      </td>
                      
                      {/* Koordinat - CENTER ALIGNED (METADATA) */}
                      <td className="px-4 py-3.5 text-center align-middle">
                         <div className="flex flex-col items-center space-y-0.5">
                            <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap tabular-nums">
                              <span className="text-slate-400 mr-1.5 font-sans">Lat</span>{report.location?.lat != null ? report.location.lat.toFixed(4) : '-'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap tabular-nums">
                              <span className="text-slate-400 mr-1.5 font-sans">Lng</span>{report.location?.lng != null ? report.location.lng.toFixed(4) : '-'}
                            </span>
                         </div>
                      </td>
                      
                      {/* Waktu - CENTER ALIGNED (METADATA) */}
                      <td className="px-4 py-3.5 text-center align-middle">
                         <div className="flex flex-col items-center">
                           <span className="text-[11px] font-semibold text-slate-700">
                             {new Date(report.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                           </span>
                           <span className="text-[10px] text-slate-500 font-medium tabular-nums">
                             {new Date(report.createdAt || report.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                           </span>
                         </div>
                      </td>
                      
                      {/* Aksi - CENTER ALIGNED (METADATA) */}
                      <td className="px-4 py-3.5 text-center align-middle">
                        <div className="flex items-center justify-center space-x-1.5 transition-opacity duration-150">
                          <button onClick={() => handleViewDetail(report)} className="p-2 hover:bg-green-100 text-green-600 rounded-lg transition-colors shadow-sm hover:shadow" title="Detail">
                            <Fish size={16} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => handleEdit(report)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors shadow-sm hover:shadow" title="Edit">
                            <Edit size={16} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => handleDelete(report._id)} className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors shadow-sm hover:shadow" title="Hapus">
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {!isLoading && filteredReports.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  Menampilkan <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredReports.length)}</span> - <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredReports.length)}</span> dari <span className="font-semibold">{filteredReports.length}</span> laporan
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                    Halaman <span className="font-bold">{currentPage}</span> dari <span className="font-bold">{Math.ceil(filteredReports.length / itemsPerPage)}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredReports.length / itemsPerPage)))}
                    disabled={currentPage >= Math.ceil(filteredReports.length / itemsPerPage)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>


      </div>

      {/* ── SECTION TITIK JARING ─────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-600" />
            <h4 className="font-bold text-slate-800 text-sm">Titik Jaring</h4>
            {fishingPoints.length > 0 && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {fishingPoints.length} titik
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter Trip ID..."
              value={fpTripFilter}
              onChange={e => setFpTripFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-32 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => {
                setShowFishingPoints(true);
                loadFishingPoints(fpTripFilter || undefined);
              }}
              disabled={fpLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {fpLoading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation size={13} />}
              Muat Data
            </button>
          </div>
        </div>

        {showFishingPoints && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-16">ID</th>
                  <th className="px-4 py-3 text-left">Kapal</th>
                  <th className="px-4 py-3 text-center">Trip</th>
                  <th className="px-4 py-3 text-center">Aksi Jaring</th>
                  <th className="px-4 py-3 text-center">Koordinat</th>
                  <th className="px-4 py-3 text-center">Kedalaman</th>
                  <th className="px-4 py-3 text-center">Hasil Tangkap</th>
                  <th className="px-4 py-3 text-center">Waktu</th>
                  <th className="px-4 py-3 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fpLoading ? (
                  <tr><td colSpan={9} className="py-8 text-center text-slate-400">Memuat...</td></tr>
                ) : fishingPoints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center">
                      <div className="flex flex-col items-center text-slate-400">
                        <MapPin size={28} className="mb-2 opacity-40" />
                        <p className="text-sm font-medium">Belum ada titik jaring</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fishingPoints.map(point => (
                    <tr key={point.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">#{point.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{point.kapal?.namaKapal || '-'}</p>
                        <p className="text-[10px] text-slate-400">{point.kapal?.alatTangkap || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">#{point.tripId}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          point.actionType === 'net_retrieved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {point.actionType === 'net_retrieved' ? '⬆ Angkat' : '⬇ Turun'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-[10px] text-slate-600">
                        {point.location?.lat?.toFixed(4)}, {point.location?.lng?.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {point.depthMeters ? `${point.depthMeters} m` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {point.hasilTangkap?.length > 0 ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {point.hasilTangkap.length} item
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-500">
                        {new Date(point.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDeleteFishingPoint(String(point.id), false)}
                            className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                            title="Hapus titik saja"
                          >
                            <Trash2 size={13} />
                          </button>
                          {point.hasilTangkap?.length > 0 && (
                            <button
                              onClick={() => handleDeleteFishingPoint(String(point.id), true)}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                              title="Hapus titik + hasil tangkap"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!showFishingPoints && (
          <div className="py-8 text-center text-slate-400 text-sm">
            Klik "Muat Data" untuk menampilkan titik jaring
          </div>
        )}
      </div>

      {/* Detail Modal with Tax Calculation */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Fish size={24} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">Detail Hasil Tangkapan</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-sm text-slate-500 font-medium">Laporan #{selectedReport._id.substring(0, 8)}</p>
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                         selectedReport.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                         selectedReport.status === 'sold' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                         'bg-amber-50 text-amber-700 border-amber-200'
                       }`}>
                         {selectedReport.status === 'confirmed' ? <><Check size={10} /> Confirmed</> : selectedReport.status === 'sold' ? <><Check size={10} /> Sold</> : <><Clock size={10} /> Pending</>}
                       </span>
                       {selectedReport.captainName && (
                         <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                           <Smartphone size={10} /> Mobile
                         </span>
                       )}
                       {/* Validation Status Badge */}
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                         selectedReport.weightKg > 0 
                           ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                           : 'bg-amber-50 text-amber-700 border-amber-200'
                       }`}>
                         {selectedReport.weightKg > 0 
                           ? <><Check size={10} /> Tervalidasi</> 
                           : <><Clock size={10} /> Belum Divalidasi</>}
                       </span>
                    </div>
                 </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
               {/* Key Stats Row */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {(() => {
                    // Smart berat: prioritaskan mobile > iot > total
                    const displayWeight = selectedReport.weightMobile || selectedReport.weightIot || selectedReport.weightKg || 0;
                    const displayRevenue = selectedReport.totalRevenue || selectedReport.totalPrice || 0;
                    return (
                      <>
                        <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                           <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Spesies Ikan</p>
                           <p className="text-lg font-black text-slate-800">{selectedReport.fishType}</p>
                           {selectedReport.condition && (
                             <p className="text-[11px] font-medium text-blue-500 mt-0.5">Kondisi: {selectedReport.condition}</p>
                           )}
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                           <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Berat Tangkapan</p>
                           <p className="text-lg font-black text-slate-800">{displayWeight.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-500">kg</span></p>
                           {selectedReport.quantity ? (
                             <p className="text-[11px] font-medium text-emerald-500 mt-0.5">{selectedReport.quantity} Ekor</p>
                           ) : null}
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-100">
                           <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Total Revenue</p>
                           <p className="text-lg font-black text-indigo-700">Rp {displayRevenue.toLocaleString('id-ID')}</p>
                           {selectedReport.netProfit ? (
                             <p className="text-[11px] font-medium text-emerald-600 mt-0.5">Profit: Rp {selectedReport.netProfit.toLocaleString('id-ID')}</p>
                           ) : null}
                        </div>
                      </>
                    );
                 })()}
               </div>

               {/* Fishing Photo Section */}
               {selectedReport.photoUrl && (
                 <div className="bg-slate-900 rounded-2xl overflow-hidden border-4 border-white shadow-xl group relative">
                    <div className="absolute top-4 left-4 z-10">
                       <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                          Foto Bukti Tangkapan
                       </span>
                    </div>
                    <img 
                      src={selectedReport.photoUrl} 
                      alt="Foto Bukti" 
                      className="w-full h-80 md:h-[450px] object-contain bg-slate-800 transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                       <p className="text-white/70 text-xs font-medium">Digital Evidence • Trip #{selectedReport.tripId || 'N/A'}</p>
                    </div>
                 </div>
               )}

               {/* SECTION 1: Info Perjalanan */}
               {(selectedReport.tripId || selectedReport.captainName || selectedReport.departureDate) && (
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <Ship size={14} className="mr-2" /> Info Perjalanan
                       </h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Trip ID</span>
                          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
                             #{selectedReport.tripId || 'N/A'}
                          </span>
                       </div>
                       {selectedReport.captainName && (
                         <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Nama Nahkoda</span>
                            <span className="font-bold text-slate-700 text-sm">{selectedReport.captainName}</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Nama Kapal</span>
                          <div className="text-right">
                             <span className="font-bold text-slate-700 block text-sm">{selectedReport.vesselName}</span>
                             {selectedReport.vesselNumber && (
                               <span className="text-xs text-slate-400 font-mono">{selectedReport.vesselNumber}</span>
                             )}
                          </div>
                       </div>
                       {selectedReport.crewCount ? (
                         <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Jumlah ABK</span>
                            <span className="font-bold text-slate-700 text-sm">{selectedReport.crewCount} Orang</span>
                         </div>
                       ) : null}
                       {selectedReport.departureDate && (
                         <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Waktu Berangkat</span>
                            <div className="text-right">
                               <span className="font-bold text-slate-700 block text-sm">
                                 {new Date(selectedReport.departureDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                               </span>
                               {selectedReport.departureTime && (
                                 <span className="text-xs text-slate-400">{selectedReport.departureTime} WIB</span>
                               )}
                            </div>
                         </div>
                       )}
                       {selectedReport.arrivalDate && (
                         <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Waktu Tiba</span>
                            <div className="text-right">
                               <span className="font-bold text-slate-700 block text-sm">
                                 {new Date(selectedReport.arrivalDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                               </span>
                               {selectedReport.arrivalTime && (
                                 <span className="text-xs text-slate-400">{selectedReport.arrivalTime} WIB</span>
                               )}
                            </div>
                         </div>
                       )}
                       {(selectedReport.tripDurationHours != null || selectedReport.tripDurationMinutes != null) && (
                         <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Durasi Trip</span>
                            <span className="font-bold text-slate-700 text-sm">
                              {selectedReport.tripDurationHours ? `${selectedReport.tripDurationHours} Jam` : ''}
                              {selectedReport.tripDurationMinutes ? ` ${selectedReport.tripDurationMinutes} Menit` : ''}
                            </span>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {/* SECTION 2: Data Tangkapan */}
               <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Fish size={14} className="mr-2" /> Data Tangkapan
                     </h4>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                     <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Jenis Ikan</span>
                        <span className="font-bold text-slate-700 text-sm">{selectedReport.fishType}</span>
                     </div>

                     {selectedReport.method && (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Metode Tangkap</span>
                          <span className="font-bold text-slate-700 text-sm capitalize">{selectedReport.method}</span>
                       </div>
                     )}

                     {selectedReport.quantity ? (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Jumlah Ekor</span>
                          <span className="font-bold text-slate-700 text-sm">{selectedReport.quantity} Ekor</span>
                       </div>
                     ) : null}

                     {selectedReport.condition && (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Kondisi Ikan</span>
                          <span className="font-bold text-slate-700 text-sm capitalize">{selectedReport.condition}</span>
                       </div>
                     )}

                     {/* Triple Weight Display */}
                     <div className="md:col-span-2 py-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Perbandingan Berat</p>
                        <div className="grid grid-cols-3 gap-3">
                           <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                              <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 flex items-center justify-center gap-1"><Smartphone size={10} /> Mobile</p>
                              <p className="text-base font-black text-slate-800">
                                {selectedReport.weightMobile ? selectedReport.weightMobile.toLocaleString('id-ID') : '-'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">Kg</p>
                           </div>
                           <div className="bg-emerald-50 p-3 rounded-lg text-center border border-emerald-100">
                              <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1 flex items-center justify-center gap-1"><Wifi size={10} /> IoT</p>
                              <p className="text-base font-black text-slate-800">
                                {selectedReport.weightIot ? selectedReport.weightIot.toLocaleString('id-ID') : '-'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">Kg</p>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-center gap-1"><Scale size={10} /> Manual</p>
                              <p className="text-base font-black text-slate-800">
                                {selectedReport.weightKg ? selectedReport.weightKg.toLocaleString('id-ID') : '-'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">Kg</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* SECTION 3: Lokasi & Cuaca */}
               <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <MapPin size={14} className="mr-2" /> Lokasi & Cuaca
                     </h4>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                     {selectedReport.fishingZone && (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Zona Tangkap</span>
                          <span className="font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-1 rounded border border-blue-200">{selectedReport.fishingZone}</span>
                       </div>
                     )}
                     {selectedReport.locationName && (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Nama Lokasi</span>
                          <span className="font-bold text-slate-700 text-sm">{selectedReport.locationName}</span>
                       </div>
                     )}
                     <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Koordinat</span>
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">
                           {selectedReport.location && selectedReport.location.lat != null && selectedReport.location.lng != null
                             ? `${selectedReport.location.lat.toFixed(4)}, ${selectedReport.location.lng.toFixed(4)}`
                             : '-'}
                        </span>
                     </div>
                     {selectedReport.waterDepth ? (
                       <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Kedalaman Air</span>
                          <span className="font-bold text-slate-700 text-sm">{selectedReport.waterDepth} meter</span>
                       </div>
                     ) : null}
                     <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Kondisi Cuaca</span>
                        {selectedReport.weather ? (() => {
                           const weatherInfo = getWeatherIcon(selectedReport.weather);
                           const WeatherIcon = weatherInfo.icon;
                           return (
                              <span className={`font-bold text-sm capitalize flex items-center gap-1.5 ${weatherInfo.color}`}>
                                 <WeatherIcon size={16} /> {selectedReport.weather}
                              </span>
                           );
                        })() : <span className="text-sm text-slate-400">-</span>}
                     </div>
                     <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Waktu Tangkap</span>
                        <div className="text-right">
                           <span className="font-bold text-slate-700 block text-sm">
                              {new Date(selectedReport.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </span>
                           <span className="text-xs text-slate-400">
                              {new Date(selectedReport.createdAt || selectedReport.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* SECTION 4: Rincian Keuangan */}
               <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                     <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <Wallet size={14} className="mr-2" /> Rincian Keuangan
                     </h4>
                  </div>
                  <div className="p-4">
                     {/* Data Nelayan (dari Mobile) */}
                     {(selectedReport.fuelCost || selectedReport.operationalCost || selectedReport.mobileTax || selectedReport.netProfit) && (
                       <div className="mb-4">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                            Data Nelayan (Input Mobile)
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                             {selectedReport.pricePerKg ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Harga per Kg</span>
                                  <span className="font-bold text-slate-700 text-sm">Rp {selectedReport.pricePerKg.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                             {selectedReport.totalRevenue ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Total Revenue</span>
                                  <span className="font-bold text-slate-700 text-sm">Rp {selectedReport.totalRevenue.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                             {selectedReport.fuelCost ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Biaya BBM</span>
                                  <span className="font-bold text-red-500 text-sm">- Rp {selectedReport.fuelCost.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                             {selectedReport.operationalCost ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Biaya Operasional</span>
                                  <span className="font-bold text-red-500 text-sm">- Rp {selectedReport.operationalCost.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                             {selectedReport.mobileTax ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Pajak</span>
                                  <span className="font-bold text-red-500 text-sm">- Rp {selectedReport.mobileTax.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                             {selectedReport.totalCost ? (
                               <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                  <span className="text-sm text-slate-500">Total Biaya</span>
                                  <span className="font-bold text-red-600 text-sm">- Rp {selectedReport.totalCost.toLocaleString('id-ID')}</span>
                               </div>
                             ) : null}
                          </div>
                          {selectedReport.netProfit ? (
                            <div className="mt-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                               <span className="text-sm font-bold text-emerald-700">Net Profit (Nelayan)</span>
                               <span className="text-lg font-black text-emerald-700">Rp {selectedReport.netProfit.toLocaleString('id-ID')}</span>
                            </div>
                          ) : null}
                       </div>
                     )}

                     {/* Estimasi Sistem */}
                     {(() => {
                        const taxCalc = calculateTax(selectedReport.weightKg || selectedReport.weightMobile || 0, selectedReport.fishType, selectedReport.pricePerKg);
                        return (
                          <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                               <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>
                               Estimasi Sistem (Fish Price Settings)
                             </p>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                   <span className="text-sm text-slate-500">Harga per Kg (Setting)</span>
                                   <span className="font-bold text-slate-600 text-sm">Rp {taxCalc.priceUsed.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                   <span className="text-sm text-slate-500">Nilai Kotor</span>
                                   <span className="font-bold text-slate-600 text-sm">Rp {taxCalc.totalValue.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                   <span className="text-sm text-slate-500">Pajak Daerah ({taxCalc.taxRate}%)</span>
                                   <span className="font-bold text-red-500 text-sm">- Rp {taxCalc.taxAmount.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                   <span className="text-sm text-slate-500">Nilai Bersih (Estimasi)</span>
                                   <span className="font-bold text-slate-700 text-sm">Rp {taxCalc.netIncome.toLocaleString('id-ID')}</span>
                                </div>
                             </div>
                          </div>
                        );
                     })()}
                  </div>
               </div>

               {/* SECTION 4.5: Titik Jaring */}
               <FishingPointSection
                 catchId={selectedReport._id}
                 currentCatchId={parseInt(selectedReport._id)}
               />

               {/* SECTION 5: Catatan & Metadata */}
               {(selectedReport.notes || selectedReport.createdAt) && (
                 <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                          <FileText size={14} className="mr-2" /> Catatan & Metadata
                       </h4>
                    </div>
                    <div className="p-4 space-y-3">
                       {selectedReport.notes && (
                         <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Nelayan</p>
                            <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{selectedReport.notes}"</p>
                         </div>
                       )}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                             <span className="text-sm text-slate-500">Waktu Submit</span>
                             <span className="text-sm font-bold text-slate-700">
                               {new Date(selectedReport.createdAt || selectedReport.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                             </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-slate-100">
                             <span className="text-sm text-slate-500">Sumber Data</span>
                             <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                               selectedReport.captainName ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                             }`}>
                               {selectedReport.captainName ? <><Smartphone size={12} /> Mobile App</> : <><Monitor size={12} /> Web Dashboard</>}
                             </span>
                          </div>
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Modal Footer (Actions) */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-3xl flex justify-between items-center">
               <div className="text-xs text-slate-500 italic">
                  * Data ini dihasilkan otomatis oleh sistem
               </div>
               <div className="flex space-x-3">
                  <button
                     onClick={() => {
                        const displayWeight = selectedReport.weightMobile || selectedReport.weightIot || selectedReport.weightKg || 0;
                        const taxCalc = calculateTax(displayWeight, selectedReport.fishType, selectedReport.pricePerKg);
                        
                        (() => {
                              const doc = new jsPDF();
                              
                              // 1. Header
                              doc.setFontSize(18);
                              doc.setFont("helvetica", "bold");
                              doc.text("LAPORAN HASIL TANGKAPAN IKAN", 105, 20, { align: "center" });
                              
                              doc.setFontSize(10);
                              doc.setFont("helvetica", "normal");
                              doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}`, 105, 28, { align: "center" });
                              
                              doc.setLineWidth(0.5);
                              doc.line(14, 35, 196, 35);

                              // 2. Info Penangkapan
                              doc.setFontSize(11);
                              doc.setFont("helvetica", "bold");
                              doc.text("A. Informasi Penangkapan", 14, 45);

                              const vesselInfo: string[][] = [
                                 ["Nama Kapal",  selectedReport.vesselName],
                                 ["No. Registrasi", selectedReport.vesselNumber || selectedReport.vesselId],
                                 ["Nahkoda", selectedReport.captainName || '-'],
                                 ["Jumlah ABK", selectedReport.crewCount ? `${selectedReport.crewCount} Orang` : '-'],
                                 ["Metode Tangkap", selectedReport.method || '-'],
                                 ["Waktu Submit", new Date(selectedReport.createdAt || selectedReport.date).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })],
                                 ["Lokasi", selectedReport.locationName || (selectedReport.location ? `${selectedReport.location.lat?.toFixed(4)}, ${selectedReport.location.lng?.toFixed(4)}` : '-')],
                                 ["Zona Tangkap", selectedReport.fishingZone || '-'],
                                 ["Kondisi Cuaca", selectedReport.weather || '-']
                              ];
                              
                              autoTable(doc, {
                                 startY: 50,
                                 body: vesselInfo,
                                 theme: 'plain',
                                 styles: { fontSize: 10, cellPadding: 1.5 },
                                 columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } }
                              });

                              // 3. Detail Tangkapan & Keuangan
                              let yPos = (doc as any).lastAutoTable.finalY + 10;
                              doc.setFontSize(11);
                              doc.setFont("helvetica", "bold");
                              doc.text("B. Detail Tangkapan & Keuangan", 14, yPos);

                              const financialData: string[][] = [
                                 ["Jenis Ikan", selectedReport.fishType],
                                 ["Jumlah", selectedReport.quantity ? `${selectedReport.quantity} Ekor` : '-'],
                                 ["Kondisi Ikan", selectedReport.condition || '-'],
                                 ["Berat (Mobile)", selectedReport.weightMobile ? `${selectedReport.weightMobile} kg` : '-'],
                                 ["Berat (IoT)", selectedReport.weightIot ? `${selectedReport.weightIot} kg` : '-'],
                                 ["Berat (Manual)", selectedReport.weightKg ? `${selectedReport.weightKg} kg` : '-'],
                                 ["Harga / Kg", `Rp ${(selectedReport.pricePerKg || taxCalc.priceUsed).toLocaleString('id-ID')}`],
                                 ["Total Revenue", selectedReport.totalRevenue ? `Rp ${selectedReport.totalRevenue.toLocaleString('id-ID')}` : `Rp ${taxCalc.totalValue.toLocaleString('id-ID')}`],
                                 ["Biaya BBM", selectedReport.fuelCost ? `(Rp ${selectedReport.fuelCost.toLocaleString('id-ID')})` : '-'],
                                 ["Biaya Operasional", selectedReport.operationalCost ? `(Rp ${selectedReport.operationalCost.toLocaleString('id-ID')})` : '-'],
                                 ["Pajak", selectedReport.mobileTax ? `(Rp ${selectedReport.mobileTax.toLocaleString('id-ID')})` : `(Rp ${taxCalc.taxAmount.toLocaleString('id-ID')})`],
                                 ["NET PROFIT", selectedReport.netProfit ? `Rp ${selectedReport.netProfit.toLocaleString('id-ID')}` : `Rp ${taxCalc.netIncome.toLocaleString('id-ID')}`]
                              ];

                              autoTable(doc, {
                                 startY: yPos + 5,
                                 body: financialData,
                                 theme: 'grid',
                                 headStyles: { fillColor: [22, 160, 133] },
                                 styles: { fontSize: 10, cellPadding: 3 },
                                 columnStyles: { 
                                     0: { fontStyle: 'bold', cellWidth: 60 },
                                     1: { halign: 'right' }
                                 },
                                 didParseCell: function(data: any) {
                                     if (data.row.index === financialData.length - 1) {
                                         data.cell.styles.fillColor = [220, 252, 231];
                                         data.cell.styles.textColor = [21, 128, 61];
                                         data.cell.styles.fontStyle = 'bold';
                                     } 
                                     if (data.row.index >= 8 && data.row.index <= 10) {
                                          data.cell.styles.textColor = [220, 38, 38];
                                     }
                                 }
                              });

                              // 4. Catatan
                              if (selectedReport.notes) {
                                yPos = (doc as any).lastAutoTable.finalY + 10;
                                doc.setFontSize(11);
                                doc.setFont("helvetica", "bold");
                                doc.text("C. Catatan", 14, yPos);
                                doc.setFont("helvetica", "normal");
                                doc.setFontSize(10);
                                const splitNotes = doc.splitTextToSize(selectedReport.notes, 180);
                                doc.text(splitNotes, 14, yPos + 7);
                              }
                              
                              // Footer
                              const pageCount = (doc as any).internal.getNumberOfPages();
                              for(let i = 1; i <= pageCount; i++) {
                                  doc.setPage(i);
                                  doc.setFontSize(8);
                                  doc.setTextColor(150);
                                  doc.text('E-Logbook System - Resmi & Terverifikasi', 14, 285);
                                  doc.text(`Hal ${i} dari ${pageCount}`, 190, 285, { align: 'right' });
                              }

                              doc.save(`Laporan_Tangkapan_${selectedReport.vesselName.replace(/\s/g, '_')}_${selectedReport._id.substring(0,8)}.pdf`);
                        })();
                     }}
                     className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center transition-all shadow-lg shadow-slate-200"
                  >
                     <FileText size={18} className="mr-2" />
                     Export PDF
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Maps Blocked Notification */}
      {showMapsNotification && (
        <MapsBlockedNotification
          onClose={() => setShowMapsNotification(false)}
        />
      )}

      {/* Recommendation Modal */}
      {showRecommendationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Navigation size={20} className="text-blue-600" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-800">Cek Potensi & Cuaca</h3>
                   <p className="text-xs text-slate-500 font-medium">Rekomendasi area tangkap hari ini</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRecommendationModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {!recData ? (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Zona Operasi</label>
                  <div className="relative">
                    <select
                      value={recSelectedZone}
                      onChange={(e) => setRecSelectedZone(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-white font-medium text-slate-700"
                    >
                      <option value="">-- Pilih Area --</option>
                      {catchZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} ({zone.zoneType || 'Zona'})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={20} />
                  </div>
                  <button
                    onClick={handleCheckRecommendation}
                    disabled={!recSelectedZone || recLoading}
                    className="w-full py-3 mt-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {recLoading ? (
                      <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Memproses Data...</>
                    ) : (
                      <><Activity size={18} /> Analisis Sekarang</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Result Section */}
                  <div className={`p-6 rounded-2xl border transition-all relative overflow-hidden ${
                    recData.recommendation.level === 'SANGAT DISARANKAN' ? 'bg-emerald-50 border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]' :
                    recData.recommendation.level === 'BAHAYA' ? 'bg-rose-50 border-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
                    recData.recommendation.level === 'WASPADA' ? 'bg-amber-50 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
                    'bg-blue-50 border-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                  }`}>
                    <div className="relative z-10 flex flex-col items-center text-center">
                       <div className="mb-4">
                         {recData.recommendation.level === 'SANGAT DISARANKAN' ? (
                           <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center shadow-inner border-2 border-emerald-200/50">
                             <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                           </div>
                         ) :
                          recData.recommendation.level === 'BAHAYA' ? (
                           <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center shadow-inner border-2 border-rose-200/50">
                             <Ban className="w-8 h-8 text-rose-600" />
                           </div>
                         ) : (
                           <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center shadow-inner border-2 border-amber-200/50">
                             <AlertTriangle className="w-8 h-8 text-amber-600" />
                           </div>
                         )}
                       </div>
                       
                       <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 border ${
                          recData.recommendation.level === 'SANGAT DISARANKAN' ? 'bg-white text-emerald-700 border-emerald-200' :
                          recData.recommendation.level === 'BAHAYA' ? 'bg-white text-rose-700 border-rose-200' :
                          recData.recommendation.level === 'WASPADA' ? 'bg-white text-amber-700 border-amber-200' :
                          'bg-white text-blue-700 border-blue-200'
                       }`}>
                         Status Rekomendasi
                       </span>
                       
                       <h4 className={`text-2xl font-black mb-2 ${
                          recData.recommendation.level === 'SANGAT DISARANKAN' ? 'text-emerald-800' :
                          recData.recommendation.level === 'BAHAYA' ? 'text-rose-800' :
                          recData.recommendation.level === 'WASPADA' ? 'text-amber-800' :
                          'text-blue-800'
                       }`}>{recData.recommendation.level}</h4>
                       
                       <p className={`text-sm font-medium px-2 ${
                          recData.recommendation.level === 'SANGAT DISARANKAN' ? 'text-emerald-700/80' :
                          recData.recommendation.level === 'BAHAYA' ? 'text-rose-700/80' :
                          recData.recommendation.level === 'WASPADA' ? 'text-amber-700/80' :
                          'text-blue-700/80'
                       }`}>
                         {recData.recommendation.summary}
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-colors rounded-lg text-blue-600">
                          <Wind className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Kecepatan Angin</p>
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-black text-slate-800">{recData.weather?.wind_speed_ms || 0}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">m/s</span>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white transition-colors rounded-lg text-emerald-600">
                          <Fish className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total H-1</p>
                      </div>
                      <div className="mt-2">
                         <span className="text-2xl font-black text-slate-800">{recData.yesterdayTotal.toLocaleString('id-ID')}</span>
                         <span className="text-xs font-bold text-slate-400 ml-1">Kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center">
                       <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Analisis Sistem
                    </p>
                    <ul className="space-y-3">
                       {recData.recommendation.reasons.map((r: string, i: number) => (
                         <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                           <div className="min-w-[1.25rem] min-h-[1.25rem] flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm mt-0.5">
                              <CheckCircle2 size={12} className="text-blue-500" />
                           </div>
                           <span className="font-medium leading-relaxed">{r}</span>
                         </li>
                       ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setRecData(null);
                        setRecSelectedZone('');
                      }}
                      className="w-full py-3 text-slate-600 font-bold bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                    >
                      Analisis Area Lain
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logbook KKP Preview & Print Modal */}
      {showLogbookPreview && (
        <LogbookKKP
          reports={reports}
          vesselIdFilter={logbookPreviewVesselId}
          onClose={() => setShowLogbookPreview(false)}
        />
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerSimple
          initialLat={formData.lokasi.lat || -6.2}
          initialLng={formData.lokasi.lng || 106.8}
          onLocationSelect={(lat, lng) => {
            setFormData({...formData, lokasi: { lat, lng }});
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
};

// ── Komponen terpisah agar hooks tidak melanggar Rules of Hooks ──────────────
const FishingPointSection: React.FC<{ catchId: string; currentCatchId: number }> = ({ catchId, currentCatchId }) => {
  const [fpData, setFpData] = useState<any[]>([]);
  const [fpLoading, setFpLoading] = useState(true);

  useEffect(() => {
    if (!catchId) return;
    setFpLoading(true);
    backendAPI.getFishingPointByCatch(catchId)
      .then(res => setFpData(res.data || []))
      .catch(() => setFpData([]))
      .finally(() => setFpLoading(false));
  }, [catchId]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
          <MapPin size={14} className="mr-2 text-blue-500" /> Titik Jaring
        </h4>
        {fpData.length > 0 && (
          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {fpData.length} titik
          </span>
        )}
      </div>

      <div className="p-4">
        {fpLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
            Memuat titik jaring...
          </div>
        ) : fpData.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-2">Tidak ada titik jaring terkait hasil tangkapan ini.</p>
        ) : (
          <div className="space-y-3">
            {fpData.map((point: any, idx: number) => {
              const totalBeratPoint = (point.hasilTangkap || []).reduce(
                (s: number, c: any) => s + parseFloat(c.beratKg || c.beratMobile || 0), 0
              );
              return (
                <div key={point.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className={`px-4 py-2.5 flex items-center justify-between ${
                    point.actionType === 'net_retrieved' ? 'bg-emerald-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        point.actionType === 'net_retrieved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {point.actionType === 'net_retrieved' ? '⬆ Angkat Jaring' : '⬇ Turun Jaring'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Titik #{idx + 1}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(point.timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Koordinat</span>
                      <span className="font-mono font-bold text-slate-700">
                        {point.location?.lat?.toFixed(5)}, {point.location?.lng?.toFixed(5)}
                      </span>
                    </div>
                    {point.depthMeters && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kedalaman</span>
                        <span className="font-bold text-slate-700">{point.depthMeters} m</span>
                      </div>
                    )}
                    {point.kapal?.alatTangkap && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Alat Tangkap</span>
                        <span className="font-bold text-slate-700">{point.kapal.alatTangkap}</span>
                      </div>
                    )}
                    {point.notes && (
                      <div className="col-span-2 md:col-span-3 flex justify-between">
                        <span className="text-slate-500">Catatan</span>
                        <span className="font-medium text-slate-700 italic">{point.notes}</span>
                      </div>
                    )}
                  </div>

                  {point.hasilTangkap?.length > 0 && (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Hasil Tangkap di Titik Ini
                      </p>
                      <div className="space-y-1.5">
                        {point.hasilTangkap.map((c: any) => (
                          <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                            c.id === currentCatchId
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-slate-50 border border-slate-100'
                          }`}>
                            <div className="flex items-center gap-2">
                              {c.id === currentCatchId && (
                                <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">INI</span>
                              )}
                              <span className="font-bold text-slate-800">{c.jenisIkan}</span>
                              {c.quantity && (
                                <span className="text-[10px] text-slate-500">{c.quantity} ekor</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-emerald-700">
                                {parseFloat(c.beratKg || c.beratMobile || 0).toLocaleString('id-ID')} kg
                              </span>
                              {c.totalHarga && (
                                <span className="text-slate-500 text-[10px]">
                                  Rp {parseFloat(c.totalHarga).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between items-center px-3 py-1.5 bg-slate-100 rounded-lg">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total di titik ini</span>
                        <span className="text-sm font-black text-slate-800">
                          {totalBeratPoint.toLocaleString('id-ID')} kg
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatchHistory;