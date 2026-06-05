import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Ship, Anchor, AlertTriangle, ShieldCheck, Fish, Activity, MapPin, 
  TrendingUp, Calendar, Navigation, RefreshCw, Maximize2, Layers, 
  Radio, BarChart3, Clock, Zap, Target, CheckCircle2, Timer, 
  XCircle, Crosshair, FileText,
  Thermometer, Wind, Droplets, CloudSun, Sun, Cloud, ExternalLink, Shield, ShieldAlert, Database
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, LabelList,
  Line
} from 'recharts';
import { WeatherData } from '../types';
import { getMaritimeBulletin } from '@/services/geminiService';
import { backendAPI } from '@/services/backendService';
import { socketService } from '@/services/socketService';
import { realDataService } from '@/services/realDataService';
import RealTimeMonitoringMap from './RealTimeMonitoringMap';
import { API_BASE_URL } from '@/config/api';
import useRole from '@/utils/useRole';

// --- Chart.js Imports ---
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line as ChartLine, Bar as ChartBar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

// --- Dynamic Color Palette untuk Grouped Bar Chart ---
const LOCATION_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

// --- Interfaces ---
interface DashboardProps {
  weather: WeatherData;
  vessels?: any[];
  activities?: any[];
}

interface DashboardData {
  monthlyStats: any;
  totalTrips: number;
  activeTrips: number;
  totalVessels: number;
  activeAlerts: number;
  catchData: {
    totalCatch: number;
    fishTypes: Array<{name: string, amount: number, color: string}>;
  };
  tripStatus: {
    pending: number;
    approved: number;
    active: number;
    completed: number;
  };
  recentActivity: Array<{
    type: string;
    message: string;
    time: string;
    icon: string;
  }>;
  weeklyStats?: {
    speciesCount: number;
    totalCatch: number;
    totalRealization: number;
    fishTypes: Array<{name: string, dateRaw: string, locationName: string, vesselName: string, amount: number, realization: number, color?: string}>;
  };
  lastUpdated?: string;
}

// --- Interface untuk Monthly Chart Data (Chart.js) ---
interface MonthlyChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  borderDash?: number[];
  tension: number;
  fill: boolean;
  pointRadius?: number;
  pointHoverRadius?: number;
  pointBackgroundColor?: string;
  borderWidth?: number;
}

interface MonthlyChartConfig {
  labels: string[];
  datasets: MonthlyChartDataset[];
}

// --- OpenWeather Types ---
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

interface OpenWeatherLocation {
  name: string;
  lat: number;
  lon: number;
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

interface SafetyStatus {
  status: string;
  level: string;
  score: number;
  reasons: string[];
  recommendation: string;
}

interface OpenWeatherResponse {
  current: {
    location: OpenWeatherLocation;
    weather: OpenWeatherData;
    meta: { source: string; timestamp: string; sunrise?: string; sunset?: string; };
    alerts: { hasAlerts: boolean; count: number; items: any[]; };
  };
  forecast?: {
    location: OpenWeatherLocation;
    forecasts: ForecastItem[];
    meta: { source: string; timestamp: string; };
  } | null;
  safety: SafetyStatus;
  meta: { source: string; timestamp: string; };
}


// --- STYLE CONSTANTS (VIBE SETTINGS) ---
const FISH_COLOR_MAP: Record<string, string> = {
  'Tuna': '#3b82f6',      // Blue
  'Cakalang': '#10b981',  // Emerald
  'Tongkol': '#f59e0b',   // Amber
  'Kakap': '#ef4444',     // Red
  'Kerapu': '#8b5cf6',    // Violet
  'Tenggiri': '#06b6d4',  // Cyan
  'Udang': '#ec4899',     // Pink
  'Cumi': '#6366f1',      // Indigo
  'Layang': '#14b8a6',    // Teal
  'Lainnya': '#94a3b8'    // Slate
};
const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const COLORS_BARS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe']; // Violet Palette
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)', // Dark Slate Theme
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
  color: '#f8fafc',
  fontSize: '12px',
  padding: '12px'
};

// --- HELPER: SMART AXIS FORMATTER ---
const formatXAxis = (tickItem: string, period: string) => {
    const date = new Date(tickItem);
    if (isNaN(date.getTime())) return tickItem; // Fallback jika bukan tanggal valid
  
    switch (period) {
      case 'week': return date.toLocaleDateString('id-ID', { weekday: 'short' }); // Sen, Sel
      case 'month': return date.toLocaleDateString('id-ID', { day: '2-digit' }); // 01, 02
      case 'year': return date.toLocaleDateString('id-ID', { month: 'short' }); // Jan, Feb
      default: return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    }
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  admin:      { label: 'Admin',      color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  operator:   { label: 'Operator',   color: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
  supervisor: { label: 'Supervisor', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
};

const Dashboard: React.FC<DashboardProps> = ({ weather, vessels = [], activities = [] }) => {
  const { role, isAdmin, canWrite } = useRole();
  const roleConfig = ROLE_CONFIG[role] ?? { label: role, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };

  // --- STATE ---
  const [bulletin, setBulletin] = useState<{status: string, summary: string, advice: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const defaultDashboardData: DashboardData = {
    totalTrips: 0, activeTrips: 0, totalVessels: 0, activeAlerts: 0,
    catchData: { totalCatch: 0, fishTypes: [] },
    tripStatus: { pending: 0, approved: 0, active: 0, completed: 0 },
    recentActivity: [], monthlyStats: undefined
  };
  
  const [dashboardData, setDashboardData] = useState<DashboardData>(defaultDashboardData);
  const [lastUpdated, setLastUpdated] = useState<string>(''); 
  
  // STATE JAM: Real-time clock with timezone
  const [time, setTime] = useState(new Date()); 
  const [timeZone, setTimeZone] = useState('WIB');

  // Helper: Get Indonesian Timezone Label
  const getTimeZoneLabel = (date: Date) => {
    const offset = date.getTimezoneOffset();
    if (offset === -420) return 'WIB';  // UTC+7
    if (offset === -480) return 'WITA'; // UTC+8
    if (offset === -540) return 'WIT';  // UTC+9
    return 'WIB'; // Default fallback
  };

  useEffect(() => {
     // Initial set
     setTimeZone(getTimeZoneLabel(new Date()));

     const timer = setInterval(() => {
       const now = new Date();
       setTime(now);
       // Optional: Update timezone periodically in case of travel, though rare during session
       setTimeZone(getTimeZoneLabel(now));
     }, 1000);

     return () => clearInterval(timer);
  }, []);
  
  // State Filter Waktu (Visual Only - Logic Data tetap dari Backend default)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // State untuk pilih period chart (Jan-Jun atau Jul-Des)
  const [chartHalfYear, setChartHalfYear] = useState<'first' | 'second'>('second');

  // OpenWeather Real-time State
  const [openWeatherData, setOpenWeatherData] = useState<OpenWeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);


  // --- PRINT ISOLATION LOGIC ---


  // State Export Config


  // --- FUNCTION: Load Data ---
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashData, bulletinData, catchReports] = await Promise.all([
        backendAPI.getDashboardData(),
        realDataService.getWeatherSafetyCheck(),
        backendAPI.getCatchReports().catch(() => [])
      ]);
      
      // Logic Normalisasi Data Ikan untuk Pie Chart
      const fishMap = new Map();
      let totalWeight = 0;

      (catchReports || []).forEach((report: any) => {
          const rawName = report.fishType || 'Lainnya';
          const normalizedName = rawName.trim().charAt(0).toUpperCase() + rawName.trim().slice(1).toLowerCase();
          const weight = report.weightKg || 0;
          totalWeight += weight;
          if (fishMap.has(normalizedName)) {
              fishMap.set(normalizedName, fishMap.get(normalizedName) + weight);
          } else {
              fishMap.set(normalizedName, weight);
          }
      });

      const fishTypes = Array.from(fishMap.entries()).map(([name, amount], index) => {
          const colorKey = Object.keys(FISH_COLOR_MAP).find(k => (name as string).includes(k)) || 'Lainnya';
          return {
              name,
              amount: (amount as number),
              color: FISH_COLOR_MAP[name as string] || FISH_COLOR_MAP[colorKey] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
          };
      }).sort((a, b) => b.amount - a.amount);
      
      const totalCatchKg = totalWeight;

      // Process data untuk Tren Tangkapan Chart (Real-time dari database)
      const trendData = (catchReports || []).map((report: any) => {
        const reportDate = new Date(report.date || report.createdAt);
        return {
          name: report.fishType || 'Lainnya',
          dateRaw: reportDate.toISOString(),
          locationName: report.location?.name || 'Unknown',
          vesselName: report.vesselName || 'Unknown',
          amount: report.weightKg || 0,
          realization: report.weightKg || 0,
          color: FISH_COLOR_MAP[report.fishType] || DEFAULT_COLORS[0]
        };
      }).sort((a, b) => new Date(a.dateRaw).getTime() - new Date(b.dateRaw).getTime());

      // Group by date untuk aggregasi harian
      const dailyData = trendData.reduce((acc: any[], curr) => {
        const dateKey = new Date(curr.dateRaw).toISOString().split('T')[0];
        const existing = acc.find(item => new Date(item.dateRaw).toISOString().split('T')[0] === dateKey);
        
        if (existing) {
          existing.amount += curr.amount;
          existing.realization += curr.realization;
        } else {
          acc.push({
            name: curr.name,
            dateRaw: curr.dateRaw,
            locationName: curr.locationName,
            vesselName: curr.vesselName,
            amount: curr.amount,
            realization: curr.realization,
            color: curr.color
          });
        }
        return acc;
      }, []);

      if (dashData && typeof dashData === 'object') {
        setDashboardData({
          ...defaultDashboardData,
          ...dashData,
          catchData: {
            totalCatch: totalCatchKg,
            fishTypes: fishTypes
          },
          weeklyStats: {
            speciesCount: fishTypes.length,
            totalCatch: totalCatchKg,
            totalRealization: totalCatchKg,
            fishTypes: dailyData
          },
          tripStatus: { ...defaultDashboardData.tripStatus, ...(dashData.tripStatus || {}) }
        });
        setLastUpdated(dashData.lastUpdated || new Date().toISOString());
      }
      setBulletin(bulletinData);
    } catch (error: any) {
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [weather]);

  // --- FUNCTION: Fetch OpenWeatherMap Data ---
  const fetchOpenWeatherData = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/api/weather/openweather/maritime`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        setWeatherError('OpenWeatherMap API tidak tersedia');
        return;
      }
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setOpenWeatherData(result.data);
          setWeatherError(null);
        } else if (result.error || result.data?.error) {
          setWeatherError(result.message || 'Gagal mengambil data cuaca');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setWeatherError(errorData.message || `Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setWeatherError('Tidak dapat terhubung ke server cuaca');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // --- HELPER: Get Weather Icon ---
  const getWeatherIcon = (icon: string, sizeClass: string = "w-8 h-8") => {
    const iconBase: Record<string, { Component: any; color: string }> = {
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

    const config = iconBase[icon];
    if (!config) return <CloudSun className={`${sizeClass} text-slate-400`} />;
    
    const { Component, color } = config;
    return <Component className={`${sizeClass} ${color}`} />;
  };

  // --- HELPER: Get Safety Icon ---
  const getSafetyIcon = (status: string) => {
    switch (status) {
      case 'SAFE': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case 'CAUTION': return <Shield className="w-5 h-5 text-amber-500" />;
      case 'DANGER': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      default: return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  // --- EFFECT: Lifecycle & Refresh Logic ---
  useEffect(() => {
    // 1. Initial Load (Saat pertama kali buka/setelah reload)
    loadDashboardData();
    fetchOpenWeatherData(); // Load OpenWeatherMap data
    
    // 2. Socket Connection (Untuk update data realtime di antara interval reload)
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('dashboard-update', (data) => {
        setDashboardData(prevData => ({
          ...prevData, ...data,
          catchData: { ...prevData.catchData, ...(data.catchData || {}) },
          tripStatus: { ...prevData.tripStatus, ...(data.tripStatus || {}) }
        }));
        setLastUpdated(data.lastUpdated || new Date().toISOString());
      });

      // Listen for emergency alerts to refresh data immediately
      socket.on('emergency_alert', () => {
        console.log("ðŸš¨ Emergency Alert Received! Refreshing dashboard data...");
        loadDashboardData();
      });
    }

    // 3. Auto-refresh OpenWeatherMap data every 10 minutes
    const weatherInterval = setInterval(() => {
      fetchOpenWeatherData();
    }, 10 * 60 * 1000); // 10 minutes

    // 4. Auto-refresh Dashboard Data every 30 seconds (Polling Fallback)
    const dashboardInterval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    // Cleanup
    return () => {
      if (socket) {
        socket.off('dashboard-update');
        socket.off('emergency_alert');
      }
      clearInterval(weatherInterval);
      clearInterval(dashboardInterval);
    };
  }, [loadDashboardData, fetchOpenWeatherData]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const chartDataWeekly = dashboardData.weeklyStats?.fishTypes || [];

  // --- DERIVED STATE: S-Curve Logic (KPI Calculation) - LEGACY for Recharts fallback ---
  const sCurveData = useMemo(() => {
    if (!chartDataWeekly || chartDataWeekly.length === 0) return [];
    
    // Simple logic untuk akumulasi data chart agar membentuk Kurva S
    let cumulativeActual = 0;
    let cumulativeTarget = 0;
    const totalActual = chartDataWeekly.reduce((acc: number, val: any) => acc + (val.amount || 0), 0);
    const targetIncrement = (totalActual * 1.1) / chartDataWeekly.length; // Target dummy 110%

    return chartDataWeekly.map((item: any) => {
      cumulativeActual += (item.amount || 0);
      cumulativeTarget += targetIncrement;
      return {
        name: item.dateRaw || item.name, // Fallback ke name jika dateRaw kosong
        actual: Number(cumulativeActual.toFixed(2)),
        target: Number(cumulativeTarget.toFixed(2))
      };
    });
  }, [chartDataWeekly]);

  // --- CHART.JS: Monthly Chart Data with API Priority + Fallback ---
  const monthlyChartData = useMemo((): MonthlyChartConfig => {
    // Month labels based on selected half year
    const firstHalfLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
    const secondHalfLabels = ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthLabels = chartHalfYear === 'first' ? firstHalfLabels : secondHalfLabels;
    
    // Initialize arrays for 12 months
    let realizationByMonth = new Array(12).fill(0);
    let targetByMonth = new Array(12).fill(0);
    
    // FORCE DEMO MODE: Always use dummy data for now
    // TODO: Set to true when ready to use real API data
    // const hasRealData = chartDataWeekly && chartDataWeekly.length > 0;
    const hasRealData = false; // <-- Temporarily force demo mode
    
    if (hasRealData) {
      // Aggregate realization by month from chartDataWeekly (real API data)
      chartDataWeekly.forEach((item: any) => {
        const date = new Date(item.dateRaw);
        if (!isNaN(date.getTime())) {
          const monthIndex = date.getMonth();
          realizationByMonth[monthIndex] += item.amount || 0;
        }
      });
      
      // PRIORITY 1: Use API target data if available (from dashboardData.monthlyStats)
      const apiTargets = dashboardData.monthlyStats;
      const hasApiTarget = apiTargets && Array.isArray(apiTargets) && apiTargets.length > 0;
      
      if (hasApiTarget) {
        // Use actual API target data
        apiTargets.forEach((stat: any, index: number) => {
          if (index < 12) {
            targetByMonth[index] = stat.target || stat.targetWeight || 0;
          }
        });
      } else {
        // Fallback: Calculate dummy target (110% of total realization / 12 months)
        const totalRealization = realizationByMonth.reduce((a, b) => a + b, 0);
        const monthlyTarget = totalRealization > 0 ? (totalRealization * 1.1) / 12 : 0;
        targetByMonth.fill(monthlyTarget);
      }
    } else {
      // ============================================
      // DEMO MODE: Use simple dummy data for display
      // ============================================
      // Full 12-month data with up/down pattern
      const fullRealization = [
        1200, 1800, 1400, 2600, 2200, 2800,  // Jan-Jun
        2400, 3200, 1800, 2600, 1400, 900     // Jul-Des
      ];
      const fullTarget = [
        1500, 2000, 1800, 2800, 2600, 3000,  // Jan-Jun
        2600, 2900, 2200, 2400, 1600, 1100   // Jul-Des
      ];
      
      // Slice based on selected half year
      if (chartHalfYear === 'first') {
        realizationByMonth = fullRealization.slice(0, 6);
        targetByMonth = fullTarget.slice(0, 6);
      } else {
        realizationByMonth = fullRealization.slice(6, 12);
        targetByMonth = fullTarget.slice(6, 12);
      }
    }
    
    return {
      labels: monthLabels,
      datasets: [
        {
          label: 'Target',
          data: targetByMonth,
          borderColor: 'rgba(100, 116, 139, 0.85)', // Sedikit opacity untuk hierarki
          backgroundColor: 'transparent',
          borderDash: [6, 4],
          tension: 0,
          fill: false,
          pointRadius: 1.5, // Lebih kecil dari realisasi
          pointHoverRadius: 4,
          pointBackgroundColor: 'rgba(100, 116, 139, 0.7)', // 70% opacity
          borderWidth: 1.5,
        },
        {
          label: 'Realisasi',
          data: realizationByMonth,
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          tension: 0,
          fill: false,
          pointRadius: 2, // Lebih kecil, besar saat hover
          pointHoverRadius: 5,
          pointBackgroundColor: '#2563eb',
          borderWidth: 2,
        },
      ],
    };
  }, [chartDataWeekly, dashboardData.monthlyStats, chartHalfYear]);

  // --- CHART.JS: Chart Options Configuration (Simple & Professional) ---
  const chartJsOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // Legend di header
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          title: (context) => {
            // Tampilkan nama bulan + tahun
            const monthLabel = context[0]?.label || '';
            const currentYear = new Date().getFullYear();
            return `${monthLabel} ${currentYear}`;
          },
          label: (context) => {
            const value = Math.round(context.parsed.y);
            return `${context.dataset.label}: ${value.toLocaleString('id-ID')} Kg`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          font: { size: 11, weight: 500 }, 
          color: '#64748b',
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { 
          color: 'rgba(148, 163, 184, 0.15)', // Opacity sangat ringan
        },
        border: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          padding: 8,
          maxTicksLimit: 6, // Batasi jumlah tick untuk lebih lega
          callback: (value) => {
            const numValue = Number(value);
            // Format: 1.200 Kg (tanpa format K)
            return `${numValue.toLocaleString('id-ID')} Kg`;
          },
        },
      },
    },
  }), []);

  // --- CHART.JS: Grouped Bar Chart Data (Jenis Ikan Ã— Lokasi Ã— Berat) ---
  const fishLocationChartData = useMemo(() => {
    // Use weeklyStats data if available, else use demo data
    const fishData = dashboardData.weeklyStats?.fishTypes || [];
    
    if (fishData.length === 0) {
      // Demo data with sorting by total weight
      const demoData = [
        { fishType: 'Tuna', locations: { 'Pelabuhan A': 2800, 'Pelabuhan B': 1800, 'Pelabuhan C': 900 } },
        { fishType: 'Cakalang', locations: { 'Pelabuhan A': 2200, 'Pelabuhan B': 2600, 'Pelabuhan C': 1400 } },
        { fishType: 'Tongkol', locations: { 'Pelabuhan A': 1500, 'Pelabuhan B': 1200, 'Pelabuhan C': 2100 } },
        { fishType: 'Kakap', locations: { 'Pelabuhan A': 800, 'Pelabuhan B': 950, 'Pelabuhan C': 700 } },
      ];
      
      // Get unique locations
      const locations = ['Pelabuhan A', 'Pelabuhan B', 'Pelabuhan C'];
      
      // Sort fish types by total weight (descending)
      const sortedData = demoData.sort((a, b) => {
        const totalA = Object.values(a.locations).reduce((sum, v) => sum + v, 0);
        const totalB = Object.values(b.locations).reduce((sum, v) => sum + v, 0);
        return totalB - totalA;
      });
      
      const labels = sortedData.map(d => d.fishType);
      
      return {
        labels,
        datasets: locations.map((loc, idx) => ({
          label: loc,
          data: sortedData.map(d => d.locations[loc] || 0), // Handle empty â†’ 0
          backgroundColor: LOCATION_COLORS[idx % LOCATION_COLORS.length],
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.85,
        })),
      };
    }
    
    // Process real data
    const aggregated: Record<string, Record<string, number>> = {};
    const allLocations = new Set<string>();
    
    fishData.forEach((item: any) => {
      const fishType = item.name || 'Unknown';
      const location = item.locationName || 'Unknown';
      const weight = item.amount || 0;
      
      allLocations.add(location);
      
      if (!aggregated[fishType]) {
        aggregated[fishType] = {};
      }
      aggregated[fishType][location] = (aggregated[fishType][location] || 0) + weight;
    });
    
    // Sort by total weight
    const sortedFish = Object.entries(aggregated)
      .map(([fishType, locations]) => ({
        fishType,
        total: Object.values(locations).reduce((a, b) => a + b, 0),
        locations,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6); // Top 6 fish types
    
    const locationArray = Array.from(allLocations).slice(0, 5); // Max 5 locations
    
    return {
      labels: sortedFish.map(f => f.fishType),
      datasets: locationArray.map((loc, idx) => ({
        label: loc,
        data: sortedFish.map(f => f.locations[loc] || 0),
        backgroundColor: LOCATION_COLORS[idx % LOCATION_COLORS.length],
        borderRadius: 4,
        barPercentage: 0.8,
        categoryPercentage: 0.85,
      })),
    };
  }, [dashboardData.weeklyStats]);

  // --- CHART.JS: Grouped Bar Chart Options ---
  const fishLocationChartOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'rectRounded',
          font: { size: 11 },
          color: '#475569',
          padding: 12,
          boxWidth: 12,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          title: (context) => context[0]?.label || '',
          label: (context) => {
            const value = Math.round(context.parsed.y);
            return `${context.dataset.label}: ${value.toLocaleString('id-ID')} Kg`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11 },
          color: '#475569',
          maxRotation: 0,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
        border: { display: false },
        ticks: {
          font: { size: 10 },
          color: '#64748b',
          padding: 8,
          maxTicksLimit: 6,
          callback: (value) => {
            const numValue = Number(value);
            return `${numValue.toLocaleString('id-ID')} Kg`;
          },
        },
      },
    },
  }), []);

  // --- CHART.JS: Catch Trend Horizontal Bar Chart (Tren Tangkapan) ---
  const catchTrendData = useMemo(() => {
    // Gunakan data chartDataWeekly yang sudah diagregasi by Date
    // Sort Oldest -> Newest (Chart.js Bar renders Top to Bottom, so index 0 is Top)
    // If we want Oldest date at Top, we keep normal sort.
    const sortedData = [...chartDataWeekly].sort((a: any, b: any) => 
        new Date(a.dateRaw).getTime() - new Date(b.dateRaw).getTime()
    );

    return {
        labels: sortedData.map((d: any) => new Date(d.dateRaw)), 
        datasets: [
            {
                label: 'Total Tangkapan',
                data: sortedData.map((d: any) => d.amount),
                backgroundColor: '#3b82f6', // Blue-500 Solid
                hoverBackgroundColor: '#2563eb', // Darker Blue on Hover
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.8,
                borderWidth: 0, // Clean look
            }
        ]
    };
  }, [chartDataWeekly]);

  const catchTrendOptions: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'y' as const, // Horizontal Bar
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
        mode: 'index',
        intersect: false, // Hover anywhere on the bar's row
    },
    plugins: {
        legend: {
            display: false, 
        },
        tooltip: {
            enabled: true,
            backgroundColor: '#1e293b', 
            titleFont: { size: 12, weight: 600 },
            bodyFont: { size: 11 },
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            callbacks: {
                title: (context) => {
                    const date = context[0].label;
                    return new Date(date).toLocaleDateString('id-ID', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    });
                },
                label: (context) => {
                     const value = Number(context.parsed.x); // x is value in horizontal chart
                     return `Total: ${value.toLocaleString('id-ID')} Kg`;
                }
            }
        },
    },
    scales: {
        y: {
            type: 'category', // Date Axis
            grid: {
                display: false, 
            },
            ticks: {
                font: { size: 11, weight: 500 },
                color: '#64748b',
                autoSkip: false, // Show all dates if possible (or let autolimit handle it if too many)
                callback: function(val, index) {
                    // Access label from data via index
                    const label = this.getLabelForValue(val as number);
                    const date = new Date(label);
                    // Format: 12 Feb (Sort & Clean)
                    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                }
            },
            border: { display: false }
        },
        x: {
            beginAtZero: true,
            grid: {
                 // Thin vertical grid
                color: 'rgba(148, 163, 184, 0.1)',
                drawBorder: false, // Remove axis line
            },
            border: { display: false },
            ticks: {
                font: { size: 10 },
                color: '#94a3b8',
                padding: 10,
                maxTicksLimit: 6,
                callback: (value) => {
                    return `${Number(value).toLocaleString('id-ID')} Kg`;
                }
            }
        }
    }
  } as any), []);

  // --- SUB-COMPONENT: KpiCard ---
  const KpiCard = ({ label, value, unit, icon: Icon, colorClass, borderClass, bgClass }: any) => (
    <div className={`p-5 rounded-2xl border ${borderClass || 'border-slate-100'} ${bgClass || 'bg-white'} shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-full`}>
      <div className="flex justify-between items-start mb-3 relative z-10">
           <div className={`p-2.5 rounded-2xl ${colorClass} bg-opacity-10 text-current`}>
             <Icon size={20} strokeWidth={2.5} />
           </div>
           {unit && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-full">{unit}</span>}
      </div>
      <div className="relative z-10">
          <h2 className="text-[28px] font-extrabold text-slate-800 tracking-tight leading-none mb-1">{value}</h2>
          <span className="text-[14px] font-semibold text-slate-500">{label}</span>
      </div>
      <Icon className={`absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.04] group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 text-current`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-6 lg:p-8 font-sans text-slate-800">
      <div className="max-w-[1920px] mx-auto space-y-6">

        {/* SECTION 1: HEADER & COMMAND CENTER */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Clock Widget / Command Center */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group self-stretch">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                   <Activity size={100} className="text-blue-600" />
                </div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status Operasional</h2>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-extrabold text-emerald-600 tracking-wide">SYSTEM ONLINE</span>
                            </div>
                            {/* Role Badge */}
                            <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${roleConfig.bg} ${roleConfig.color} ${roleConfig.border}`}>
                              <Shield size={11} />
                              {roleConfig.label}
                              {!canWrite && <span className="text-[9px] font-bold opacity-60 ml-0.5">Â· Read Only</span>}
                            </div>
                        </div>
                        <button onClick={handleRefresh} disabled={isLoading} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Refresh Data">
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                    
                    <div>
                        <div className="flex items-baseline text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            <span className="text-5xl font-bold tracking-tight leading-none">
                                {time.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')}
                            </span>
                            <span className="text-2xl font-medium text-slate-300 ml-2">{time.getSeconds().toString().padStart(2, '0')}</span>
                            <span className="text-lg font-bold text-slate-400 ml-2">{timeZone}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-slate-500">
                             <Calendar size={16} className="text-blue-500" />
                             <p className="text-base font-medium">
                                 {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                             </p>
                        </div>
                    </div>

                    {/* SOS / SAFETY STATUS */}
                    <div className="mt-8">
                         <div className={`p-4 rounded-xl border ${dashboardData.activeAlerts > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} shadow-sm transition-colors`}>
                             <div className="flex items-center gap-4 relative z-10">
                                <div className={`p-2.5 rounded-2xl ${dashboardData.activeAlerts > 0 ? 'bg-rose-500 shadow-lg shadow-rose-200 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {dashboardData.activeAlerts > 0 ? <AlertTriangle size={24} className="text-white" /> : <ShieldCheck size={24} />}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-[16px] font-bold ${dashboardData.activeAlerts > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                        {dashboardData.activeAlerts > 0 ? `${dashboardData.activeAlerts} Sinyal Darurat (SOS)` : 'Sistem Aman'}
                                    </h3>
                                    <p className={`text-[12px] font-medium leading-tight ${dashboardData.activeAlerts > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {dashboardData.activeAlerts > 0 ? 'Deteksi bahaya pada armada.' : 'Sistem pemantauan bahaya & keselamatan aktif.'}
                                    </p>
                                    
                                     {dashboardData.activeAlerts > 0 && (
                                         <button className="mt-2 relative z-10 px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-rose-700 transition flex items-center gap-1.5">
                                             <MapPin size={12} /> Lacak Target
                                         </button>
                                     )}
                                </div>
                             </div>
                        </div>
                    </div>

                    {lastUpdated && (
                      <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock size={12} />
                            <span>Update: {new Date(lastUpdated).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                         </div>
                         <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                         </div>
                      </div>
                    )}
                </div>
            </div>

            {/* Weather Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group self-stretch flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cuaca Maritim</h2>
                <button onClick={fetchOpenWeatherData} disabled={weatherLoading} className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Refresh Cuaca">
                  <RefreshCw size={14} className={weatherLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {weatherLoading && !openWeatherData ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                    <p className="text-sm text-slate-500 font-medium">Memuat data cuaca...</p>
                  </div>
                </div>
              ) : weatherError && !openWeatherData ? (
                <div className="flex-1 flex items-center">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 w-full">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">{weatherError}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Pastikan API key OpenWeatherMap sudah dikonfigurasi.</p>
                    </div>
                    <button onClick={fetchOpenWeatherData} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors">
                      Coba Lagi
                    </button>
                  </div>
                </div>
              ) : openWeatherData?.current ? (
                <div className="flex flex-col gap-4 flex-1">
                  {/* Top: Current Weather */}
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl">
                      {getWeatherIcon(openWeatherData.current.weather.icon, 'w-12 h-12')}
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-slate-800">
                        {Math.round(openWeatherData.current.weather.temperature_c)}Â°C
                      </p>
                      <p className="text-sm text-slate-500 capitalize">{openWeatherData.current.weather.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{openWeatherData.current.location.name}</p>
                    </div>
                    {/* Safety Badge */}
                    {openWeatherData.safety && (
                      <div className={`ml-auto px-3 py-2 rounded-xl border-2 text-center ${
                        openWeatherData.safety.status === 'SAFE' ? 'bg-emerald-50 border-emerald-200' :
                        openWeatherData.safety.status === 'CAUTION' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
                      }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {getSafetyIcon(openWeatherData.safety.status)}
                          <span className={`text-xs font-bold ${
                            openWeatherData.safety.status === 'SAFE' ? 'text-emerald-700' :
                            openWeatherData.safety.status === 'CAUTION' ? 'text-amber-700' : 'text-rose-700'
                          }`}>{openWeatherData.safety.level}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${
                            openWeatherData.safety.score >= 80 ? 'bg-emerald-500' :
                            openWeatherData.safety.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`} style={{ width: `${openWeatherData.safety.score}%` }} />
                        </div>
                        <p className={`text-[10px] font-bold mt-1 ${
                          openWeatherData.safety.score >= 80 ? 'text-emerald-600' :
                          openWeatherData.safety.score >= 60 ? 'text-amber-600' : 'text-rose-600'
                        }`}>{openWeatherData.safety.score}/100</p>
                      </div>
                    )}
                  </div>

                  {/* Middle: Weather Details Row */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl">
                      <Thermometer className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Terasa</p>
                        <p className="text-sm font-bold text-slate-800">{Math.round(openWeatherData.current.weather.feels_like_c)}Â°C</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl">
                      <Wind className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Angin</p>
                        <p className="text-sm font-bold text-slate-800">{openWeatherData.current.weather.wind_speed_ms} m/s</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl">
                      <Droplets className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium">Kelembaban</p>
                        <p className="text-sm font-bold text-slate-800">{openWeatherData.current.weather.humidity_percent}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Forecast Strip */}
                  {openWeatherData.forecast?.forecasts && (
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500" /> Prakiraan 24 Jam
                        </h4>
                        <Link to="/weather" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                          Lihat Detail <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {openWeatherData.forecast.forecasts.slice(0, 8).map((item, index) => (
                          <div key={index} className="flex-shrink-0 w-16 bg-slate-50 rounded-xl p-2 text-center hover:bg-slate-100 transition-colors">
                            <p className="text-[10px] text-slate-500 font-medium mb-1">
                              {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="flex justify-center mb-1">{getWeatherIcon(item.icon, 'w-5 h-5')}</div>
                            <p className="text-sm font-bold text-slate-800">{Math.round(item.temperature_c)}Â°</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Last Update */}
                  {openWeatherData.meta?.timestamp && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span>Diperbarui: {new Date(openWeatherData.meta.timestamp).toLocaleString('id-ID')}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">OpenWeatherMap</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback bulletin */
                <div className="flex-1 flex items-center">
                  <div className="flex items-center gap-4 w-full">
                    <div className={`shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg ${
                      bulletin?.status === 'Safe' ? 'from-emerald-400 to-emerald-600' : 'from-orange-400 to-orange-600'
                    }`}>
                      {bulletin?.status === 'Safe' ? <ShieldCheck size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800">
                        KONDISI LAUT <span className={bulletin?.status === 'Safe' ? 'text-emerald-600' : 'text-orange-600'}>
                          {bulletin?.status === 'Safe' ? 'AMAN' : 'WASPADA'}
                        </span>
                      </h4>
                      <p className="text-sm text-slate-500">{bulletin?.summary || 'Memuat data keamanan laut...'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
        
        {/* SECTION 2: KOMPOSISI & KPI */}
        <div className="flex flex-col lg:flex-row gap-5 h-auto lg:h-[340px]">
             {/* Pie Chart: Komposisi Ikan (Compact) */}
            <div id="card-composition" className="lg:w-[320px] shrink-0 flex flex-col h-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="mb-1 flex items-center justify-between relative z-10 gap-2">
                     <div className="flex-1 text-center">
                        <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Komposisi Ikan</h3>
                        <p className="text-[12px] text-slate-500 font-medium">Breakdown Tangkapan</p>
                     </div>
                     <div className="p-1.5 bg-slate-50 rounded-full text-slate-400">
                        <Fish size={16} />
                     </div>
                  </div>
                  <div className="relative flex-1 min-h-0 flex items-center justify-center z-10">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={dashboardData?.catchData?.fishTypes || []}
                              cx="50%" cy="50%"
                              innerRadius={50} outerRadius={70} 
                              paddingAngle={4} cornerRadius={4}
                              dataKey="amount"
                           >
                              {(dashboardData?.catchData?.fishTypes || []).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                              ))}
                           </Pie>
                           <Tooltip formatter={(val: number) => [`${val.toLocaleString('id-ID')} Kg`, 'Total']} contentStyle={TOOLTIP_STYLE} itemStyle={{color: '#fff'}} />
                        </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[20px] font-extrabold text-slate-800 tracking-tighter leading-none">
                           {dashboardData?.catchData?.totalCatch?.toLocaleString('id-ID') || 0}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">KG TOTAL</span>
                     </div>
                  </div>

                  {/* Detailed Legend List (Compact) */}
                  <div className="mt-2 flex flex-col gap-1.5 px-1 overflow-y-auto max-h-[100px] custom-scrollbar border-t border-slate-50 pt-2">
                      {(dashboardData?.catchData?.fishTypes || []).map((fish, index) => (
                          <div key={index} className="flex items-center justify-between group">
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shadow-sm ring-1 ring-slate-100" style={{backgroundColor: fish.color}}></div>
                                  <span className="font-semibold text-[12px] text-slate-600 truncate max-w-[100px]" title={fish.name}>{fish.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-[12px] text-slate-800">{fish.amount.toLocaleString('id-ID')}</span>
                                  <div className="w-[34px] text-right">
                                    <span className="text-[9px] font-bold text-white px-1 py-0.5 rounded-md bg-slate-400 leading-none">
                                        {((fish.amount / (dashboardData.catchData.totalCatch || 1)) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
            </div>

            {/* KPI Cards (Grid Matches Height) */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                <KpiCard label="Total Trip" value={dashboardData.totalTrips} unit="Tahun Ini" icon={Ship} colorClass="text-blue-600 bg-blue-50" />
                <KpiCard label="Trip Aktif" value={dashboardData.activeTrips} unit="Live" icon={Navigation} colorClass="text-emerald-600 bg-emerald-50" />
                <KpiCard label="Total Armada" value={dashboardData.totalVessels} unit="Unit" icon={Anchor} colorClass="text-violet-600 bg-violet-50" />
                <KpiCard label="Total Tangkapan" value={typeof dashboardData?.catchData?.totalCatch === 'number' ? (dashboardData.catchData.totalCatch / 1000).toFixed(1) : '0'} unit="Ton" icon={Target} colorClass="text-cyan-600 bg-cyan-50" />
                
                <div className={`col-span-2 lg:col-span-4 p-4 rounded-2xl border ${dashboardData.activeAlerts > 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'} shadow-sm flex items-center justify-between relative overflow-hidden h-full max-h-[100px] lg:max-h-full`}>
                     <div className="flex items-center gap-4 relative z-10">
                        <div className={`p-2.5 rounded-2xl ${dashboardData.activeAlerts > 0 ? 'bg-rose-500 shadow-lg shadow-rose-200 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                            {dashboardData.activeAlerts > 0 ? <AlertTriangle size={20} className="text-white" /> : <ShieldCheck size={20} />}
                        </div>
                        <div>
                            <h3 className={`text-[18px] font-bold ${dashboardData.activeAlerts > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                                {dashboardData.activeAlerts} Sinyal Darurat (SOS)
                            </h3>
                            <p className="text-[12px] text-slate-500 font-medium">Sistem pemantauan bahaya & keselamatan</p>
                        </div>
                     </div>
                     {dashboardData.activeAlerts > 0 && (
                         <button className="relative z-10 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-rose-700 transition flex items-center gap-1.5">
                             <MapPin size={14} /> Lacak
                         </button>
                     )}
                </div>
            </div>
        </div>

        {/* SECTION 3: MAP */}
        <div className="w-full h-[650px] min-h-[500px] bg-slate-900 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-300 group z-0">
            <div className="absolute inset-0 z-0">
                <RealTimeMonitoringMap className="w-full h-full opacity-100 transition-opacity duration-500" />
            </div>
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
                <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border border-white/40 pointer-events-auto flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                         <Radio size={20} className="animate-pulse" /> 
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Live Fleet Monitoring</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Real-time GPS System</p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <button className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/40 hover:bg-white text-slate-600 hover:text-blue-600 transition-colors"><Layers size={20} /></button>
                    <button className="p-3 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/40 hover:bg-white text-slate-600 hover:text-blue-600 transition-colors"><Maximize2 size={20} /></button>
                </div>
            </div>
        </div>



        {/* ========================================================================= */}
        {/* SECTION 4: CHART ANALYTICS (SMART GRANULARITY VISUALS)                    */}
        {/* ========================================================================= */}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           
           {/* 1. HERO CHART: Tren Tangkapan (REMOVED) */}


           {/* 2. SIDE CHART: Jenis Ikan Ã— Lokasi Ã— Berat (Chart.js Grouped Bar) */}


           {/* 4. BOTTOM ROW: Target vs Realisasi (REMOVED) */}

        </div>

        {/* SECTION 5: LOGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
           {/* Status Operasional */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[360px]">
                 <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-50">
                    <Calendar size={20} className="text-slate-400" />
                    <h3 className="text-[15px] font-bold text-slate-800 uppercase tracking-wider">Status Operasional</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {/* List Items */}
                        {[
                          { label: 'Menunggu', count: dashboardData?.tripStatus?.pending, color: 'amber', icon: Timer },
                          { label: 'Disetujui', count: dashboardData?.tripStatus?.approved, color: 'emerald', icon: CheckCircle2 },
                          { label: 'Berlayar', count: dashboardData?.tripStatus?.active, color: 'blue', icon: Ship },
                          { label: 'Selesai', count: dashboardData?.tripStatus?.completed, color: 'slate', icon: XCircle },
                        ].map((item, i) => (
                           <div key={i} className={`flex items-center justify-between p-3.5 rounded-2xl bg-${item.color}-50 border border-${item.color}-100`}>
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={`text-${item.color}-600`} />
                                    <span className={`text-sm font-bold text-${item.color}-800`}>{item.label}</span>
                                </div>
                                <span className={`text-lg font-extrabold text-${item.color}-800`}>{item.count || 0}</span>
                           </div>
                        ))}
                 </div>
           </div>

           {/* Log Aktivitas */}
           <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[360px]">
                 <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-50">
                    <Activity size={20} className="text-slate-400" />
                    <h3 className="text-[15px] font-bold text-slate-800 uppercase tracking-wider">Log Aktivitas</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {(dashboardData?.recentActivity || []).length > 0 ? (
                      <div className="space-y-5">
                        {dashboardData.recentActivity.map((activity, i) => {
                          const Icon = 
                            activity.icon === 'fish' ? Fish :
                            activity.icon === 'ship' ? Ship :
                            activity.icon === 'file' ? FileText :
                            Activity;
                            
                          const iconColor = 
                            activity.icon === 'fish' ? 'emerald' :
                            activity.icon === 'ship' ? 'blue' :
                            activity.icon === 'file' ? 'amber' :
                            'slate';

                          return (
                          <div key={i} className="group flex gap-4 relative">
                             {i !== dashboardData.recentActivity.length - 1 && (
                                <div className="absolute left-[9px] top-8 bottom-[-20px] w-px bg-slate-100 group-last:hidden"></div>
                             )}
                             <div className="mt-1">
                                <div className={`w-5 h-5 rounded-full bg-${iconColor}-50 border-2 border-${iconColor}-100 flex items-center justify-center`}>
                                    <Icon size={10} className={`text-${iconColor}-600`} />
                                </div>
                             </div>
                             <div className="flex-1 pb-1">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                                        <Clock size={10} /> {activity.time}
                                    </p>
                                </div>
                                <p className="text-sm font-medium text-slate-700 leading-snug">{activity.message}</p>
                             </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <Activity size={32} className="opacity-20" />
                        <p className="text-xs font-medium">Tidak ada aktivitas baru</p>
                      </div>
                    )}
                 </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
