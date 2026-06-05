import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Layout from './Layout';
import Login from './Login';
import Dashboard from './Dashboard';
import TripManagement from './TripManagement';
import TripScheduleManagement from './TripScheduleManagement';
import SOSAlerts from './SOSAlerts';
import CatchHistory from './CatchHistory';
import AccountManagement from './AccountManagement';
import DataKapal from './DataKapal';
import FishermenManagement from './FishermenManagement';
import DocumentManagement from './DocumentManagement';
import DataMaster from './DataMaster';
import Settings from './Settings';
import HarborZones from './HarborZones';
import DataPerangkat from './DataPerangkat';
import LeafletMap from './LeafletMap';
import CatchPolygonManagement from './CatchPolygonManagement';
import MaritimeWeather from './MaritimeWeather';
import VesselOperationalManagement from './VesselOperationalManagement';
import MonitoringPage from './MonitoringPage';
import MapsBlockedNotification from './MapsBlockedNotification';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import RawData from './RawData';
import { FISH_TYPES, USER_ROLES } from '../constants';
import { realDataService } from '../services/realDataService';
import { backendAPI } from '../services/backendService';
import { socketService } from '../services/socketService';
import { sessionManager } from '../services/sessionManager';
import { safeLog } from '../utils/security';
import { validateEnvironment } from '../config/security';
import useRole from '../utils/useRole';
import { usePermissions } from '../contexts/PermissionContext';
import { useMapsDetection, useNotificationDismissed } from '../utils/useMapsDetection';
import { 
  ShieldCheck, ShieldAlert, Waves, Wind, Thermometer, Cloud, 
  MapPin, Navigation, Info, AlertTriangle, Crosshair, Anchor, Shield 
} from 'lucide-react';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useRole();
  const { hasPermission, reload: reloadPermissions } = usePermissions();
  const [sosAlerts, setSosAlerts] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [fishermen, setFishermen] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [weatherData, setWeatherData] = useState(null);
  const [safetyZones, setSafetyZones] = useState([]);
  const [showGlobalMapsNotification, setShowGlobalMapsNotification] = useState(false);

  // Maps detection for global notification
  const mapsStatus = useMapsDetection();
  const { isDismissed } = useNotificationDismissed();

  // Show global notification if maps are blocked and user is authenticated
  useEffect(() => {
    if (isAuthenticated && mapsStatus.isBlocked && !mapsStatus.isLoading && !isDismissed) {
      // Delay to avoid showing immediately on login
      const timer = setTimeout(() => {
        setShowGlobalMapsNotification(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, mapsStatus.isBlocked, mapsStatus.isLoading, isDismissed]);

  const handleResolveSOS = useCallback(async (id: string) => {
    try {
      await backendAPI.resolveSOSAlert(id);
      setSosAlerts(prev => prev.map(s => s._id === id ? { ...s, resolved: true } : s));
    } catch (error) {
      console.error('Failed to resolve SOS alert:', error);
      setSosAlerts(prev => prev.map(s => s._id === id ? { ...s, resolved: true } : s));
    }
  }, []);

  const activeSOSCount = useMemo(() => 
    sosAlerts.filter(s => !s.resolved).length, 
    [sosAlerts]
  );

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  const handleLogin = useCallback((token: string, role?: string) => {
    safeLog.info('Login successful, setting authenticated state');
    localStorage.setItem('token', token);
    if (role) {
      localStorage.setItem('userRole', role);
      setUserRole(role);
    }
    
    setTimeout(() => {
      reloadPermissions();
      setIsAuthenticated(true);
      sessionManager.startSession(() => {
        setIsAuthenticated(false);
        alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 2 jam.');
      });
    }, 100);
  }, [reloadPermissions]);

  const handleLogout = useCallback(() => {
    sessionManager.endSession();
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    window.location.reload();
  }, []);

  useEffect(() => {
    validateEnvironment();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    safeLog.info('Checking existing token', token ? 'Found' : 'Not found');
    
    if (token) {
      if (sessionManager.isSessionValid()) {
        backendAPI.getDashboardData()
          .then((response) => {
            safeLog.info('Token valid, setting authenticated');
            
            // Cek role dari response atau localStorage
            const userRole = response?.user?.role || localStorage.getItem('userRole');
            // Tidak perlu validasi role di sini — sudah divalidasi saat login

            setIsAuthenticated(true);
            sessionManager.startSession(() => {
              setIsAuthenticated(false);
              alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 2 jam.');
            });
          })
          .catch((error) => {
            safeLog.info('Token invalid, clearing localStorage');
            if (error.message === 'UNAUTHORIZED') {
              sessionManager.endSession();
              setIsAuthenticated(false);
            } else {
              localStorage.removeItem('token');
              setIsAuthenticated(false);
            }
          });
      } else {
        safeLog.info('Session expired, clearing token');
        sessionManager.endSession();
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    let isMounted = true;
    const socket = socketService.connect();
    
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !isMounted) {
          console.log('❌ No token found or component unmounted');
          return;
        }
        
        const results = await Promise.allSettled([
          backendAPI.getSOSAlerts(),
          backendAPI.getActiveVessels(),
          backendAPI.getUsers(),
          realDataService.getRealWeatherData().catch(() => null),
          realDataService.getRealSafetyZones().catch(() => [])
        ]);
        
        if (!isMounted) return;
        
        if (results[0].status === 'fulfilled') {
          const sosData = results[0].value;
          setSosAlerts(sosData.data || sosData || []);
        } else {
          console.warn('Failed to load SOS alerts:', results[0].reason);
          setSosAlerts([]);
        }
        
        if (results[1].status === 'fulfilled') {
          const vesselData = results[1].value;
          const vessels = vesselData.data?.vessels || vesselData.vessels || vesselData.data || vesselData || [];
          setVessels(vessels);
          console.log('Loaded vessels with GPS:', vessels.length);
        } else {
          console.warn('Failed to load vessels:', results[1].reason);
          setVessels([]);
        }
        
        if (results[2].status === 'fulfilled') {
          const fishermenData = results[2].value;
          setFishermen(fishermenData.data || fishermenData || []);
        } else {
          console.warn('Failed to load users:', results[2].reason);
          setFishermen([]);
        }
        
        if (results[3].status === 'fulfilled') {
          const weather = results[3].value;
          setWeatherData(weather);
          console.log('Loaded real weather data:', weather);
        } else {
          console.warn('Failed to load weather data:', results[3].reason);
          setWeatherData(null);
        }
        
        if (results[4].status === 'fulfilled') {
          const zones = results[4].value;
          setSafetyZones(zones || []);
          console.log('Loaded real safety zones:', zones?.length || 0);
        } else {
          console.error('Failed to load safety zones:', results[4].reason);
          setSafetyZones([]);
        }
        
      } catch (error) {
        console.warn('Backend connection error:', error);
        if (error.message === 'UNAUTHORIZED' && isMounted) {
          setIsAuthenticated(false);
        }
        if (isMounted) {
          setSosAlerts([]);
          setVessels([]);
          setFishermen([]);
          setWeatherData(null);
          setSafetyZones([]);
        }
      }
    };
    
    const timer = setTimeout(() => {
      if (isMounted) {
        loadData();
      }
    }, 500);
    
    socketService.onSOSAlert((alert) => {
      if (isMounted) {
        setSosAlerts(prev => [alert, ...prev]);
      }
    });
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
      socketService.disconnect();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      sessionManager.destroy();
    };
  }, []);

  // Track halaman yang dikunjungi untuk redirect setelah refresh
  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login' && location.pathname !== '/') {
      localStorage.setItem('lastVisitedPage', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);



  return (
    <>
      {/* Global Maps Blocked Notification */}
      {showGlobalMapsNotification && (
        <MapsBlockedNotification
          onClose={() => setShowGlobalMapsNotification(false)}
        />
      )}

      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          isAuthenticated ? (
            <Navigate to={localStorage.getItem('lastVisitedPage') || '/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        {/* Public Routes - Password Reset */}
        <Route path="/forgot-password" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
        } />
        <Route path="/reset-password/:token" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPassword />
        } />
        
        {/* Protected Routes */}
        <Route element={
          isAuthenticated ? (
            <Layout sosCount={activeSOSCount} onLogout={handleLogout}>
               <Outlet /> {/* Layout will render child routes here */}
            </Layout>
          ) : (
             <Navigate to="/login" replace />
          )
        }>
          <Route path="/dashboard" element={<Dashboard weather={weatherData} vessels={vessels} activities={[]} />} />
          <Route path="/trips" element={<TripManagement weather={weatherData} />} />
          <Route path="/master" element={<DataMaster onNavigate={() => {}} />} />
          <Route path="/vessels" element={<DataKapal onBack={() => {}} />} />
          <Route path="/catch" element={<CatchHistory onBack={() => {}} />} />
          <Route path="/perangkat" element={<DataPerangkat />} />
          <Route path="/harbor-zones" element={<HarborZones onBack={() => {}} />} />
          <Route path="/catch-polygons" element={<CatchPolygonManagement />} />
          <Route path="/raw-data" element={<RawData />} />
          <Route path="/vessel-management" element={<VesselOperationalManagement />} />
          <Route path="/sos" element={<SOSAlerts alerts={sosAlerts} onResolve={handleResolveSOS} />} />
          <Route path="/accounts" element={hasPermission('Lihat Daftar User') ? <AccountManagement /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings" element={hasPermission('Pengaturan Aplikasi') ? <Settings /> : <Navigate to="/dashboard" replace />} />
          <Route path="/weather" element={<MaritimeWeather />} />
          <Route path="/map" element={<MonitoringPage />} />
          <Route path="*" element={<div className="p-12 text-center text-slate-400">404 - Halaman tidak ditemukan</div>} />
        </Route>
      </Routes>
    </>
  );
};

export default AppContent;