import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Ship, Users, Map as MapIcon, CloudSun, AlertCircle, FileBarChart, LogOut, Menu, X, Fish, Settings, UserCog, Database, ChevronDown, ChevronUp, Anchor, MapPin, FileText, AlertTriangle, BellRing, Cpu, Map, XCircle, FileSignature, Radar } from 'lucide-react';















import ConfirmationModal from '@/components/ui/ConfirmationModal';
import useRole from '@/utils/useRole';
import { usePermissions } from '@/contexts/PermissionContext';

interface AppSettings {
  systemName: string;
  systemLogo: string;
  headerTitle: string;
  websiteTitle: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  sosAlertSound: boolean;
  autoBackup: boolean;
  backupInterval: string;
  weatherApiKey: string;
  maxLoginAttempts: number;
  sessionTimeout: number;
}


interface LayoutProps {
  children: React.ReactNode;
  sosCount: number;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, sosCount, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useRole();
  const { hasPermission, loaded: permissionsLoaded } = usePermissions();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  
  useEffect(() => {
    const path = location.pathname.substring(1) || 'dashboard';
    setActiveTab(path);
  }, [location]);

  const handleNavigation = (tab: string) => {
    navigate(`/${tab}`);
  };
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isDataMasterOpen, setIsDataMasterOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [appSettings, setAppSettings] = React.useState<AppSettings>({
    systemName: 'E-Logbook Maritime System',
    systemLogo: '',
    headerTitle: 'E-Logbook Maritime',
    websiteTitle: 'E-Logbook Maritime - Sistem Manajemen Digital Perikanan',
    timezone: 'Asia/Jakarta',
    language: 'id',
    emailNotifications: true,
    smsNotifications: false,
    sosAlertSound: true,
    autoBackup: true,
    backupInterval: 'daily',
    weatherApiKey: '',
    maxLoginAttempts: 3,
    sessionTimeout: 60
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setAppSettings(prevSettings => ({
        ...prevSettings,
        ...settings
      }));
    }
  }, [activeTab]);

  const menuItems = !permissionsLoaded ? [] : [
    { id: 'dashboard', label: 'Dasbor',                icon: LayoutDashboard, feature: 'Lihat Dashboard' },
    { id: 'catch',     label: 'Hasil Tangkap',          icon: Fish,            feature: 'Lihat Data Tangkapan' },
    { id: 'trips',     label: 'Perizinan & Perjalanan', icon: FileSignature,   feature: 'Lihat Data Trip' },
    { id: 'weather',   label: 'Cuaca Laut',             icon: CloudSun,        feature: 'Cuaca Laut' },
    { id: 'map',       label: 'Pemantauan Langsung',    icon: Radar,           feature: 'Pemantauan Langsung (Map)' },
    { id: 'sos',       label: 'Sinyal Darurat',         icon: AlertTriangle,   feature: 'Sinyal Darurat (SOS)', badge: sosCount > 0 ? sosCount : null },
    { id: 'accounts',  label: 'Manajemen Pengguna',     icon: Users,           feature: 'Lihat Daftar User' },
    { id: 'settings',  label: 'Pengaturan',             icon: Settings,        feature: 'Pengaturan Aplikasi' },
  ].filter(item => hasPermission(item.feature));

  const dataMasterItems = !permissionsLoaded ? [] : [
    { id: 'vessels',        label: 'Data Kapal',       icon: Ship,   feature: 'Lihat Data Kapal' },
    { id: 'perangkat',      label: 'Data Perangkat',   icon: Cpu,    feature: 'Lihat Data Perangkat' },
    { id: 'harbor-zones',   label: 'Zonasi Pelabuhan', icon: Anchor, feature: 'Edit Zonasi Pelabuhan' },
    { id: 'catch-polygons', label: 'Zonasi Tangkap',   icon: Map,    feature: 'Edit Zonasi Tangkap' },
    { id: 'raw-data',       label: 'Raw Data',         icon: Database, feature: 'Lihat Data Kapal' },
  ].filter(item => hasPermission(item.feature));

  return (
    <div className="h-screen flex text-slate-700 overflow-hidden bg-slate-900">
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <aside className={`bg-slate-900 text-white flex flex-col fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 transform ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-20'}`}>
        <div className="flex items-center justify-between p-4 bg-slate-800 flex-shrink-0">
          <div className={`flex items-center space-x-2 font-bold ${!isSidebarOpen && 'lg:hidden'}`}>
            <div className="w-12 h-12 rounded flex items-center justify-center">
              {appSettings.systemLogo ? (
                <img src={appSettings.systemLogo} alt="Logo" className="w-full h-full object-contain rounded" />
              ) : (
                <Ship size={28} className="text-white" />
              )}
            </div>
            <span className="text-xl tracking-tight leading-tight">{appSettings.headerTitle}</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:block p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0">
            {isSidebarOpen ? <XCircle size={24} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto pb-4 custom-scrollbar">
          {dataMasterItems.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                // handleNavigation('master'); // Optional: if /master exists or just toggle
                setIsDataMasterOpen(!isDataMasterOpen);
              }}
              className={`w-full flex items-center p-3 rounded-lg transition-all group relative ${
                activeTab === 'master' || dataMasterItems.some(item => item.id === activeTab) || 
                ['harbor-zones', 'catch-polygons', 'vessel-management'].includes(activeTab)
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard size={22} className={activeTab === 'master' || dataMasterItems.some(item => item.id === activeTab) || 
                ['harbor-zones', 'catch-polygons', 'vessel-management'].includes(activeTab) ? 'text-white' : 'group-hover:text-blue-400'} />
              {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 1024)) && (
                <div className="ml-3 flex-1 flex justify-between items-center">
                  <span className="font-medium text-sm">Data Master</span>
                  <ChevronDown size={16} className={`text-slate-400 transform transition-transform duration-300 ${isDataMasterOpen ? 'rotate-180' : ''}`} />
                </div>
              )}
            </button>

            {isDataMasterOpen && (isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 1024)) && (
              <div className="ml-8 mt-1 space-y-1"> 
                {dataMasterItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center p-2 rounded-lg transition-all text-sm ${
                      activeTab === item.id 
                      ? 'bg-slate-800/80 text-blue-400 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-500'} />
                    <span className="ml-2">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center p-3 rounded-lg transition-all group relative ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'text-white' : 'group-hover:text-blue-400'} />
              {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth < 1024)) && (
                <div className="ml-3 flex-1 flex justify-between items-center">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full emergency-pulse min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {!isSidebarOpen && typeof window !== 'undefined' && window.innerWidth >= 1024 && item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full emergency-pulse min-w-[16px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900 flex-shrink-0">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="text-sm font-medium">Keluar</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {activeTab === 'dashboard' ? 'Dashboard' :
               activeTab === 'trips' ? 'Perizinan & Perjalanan' :
               activeTab === 'weather' ? 'Cuaca Laut' :
               activeTab === 'map' ? 'Pemantauan Langsung' :
              //  activeTab === 'activity-log' ? 'Log Aktivitas' :
               activeTab === 'sos' ? 'Sinyal Darurat' :
               activeTab === 'accounts' ? 'Manajemen Pengguna' :
               activeTab === 'settings' ? 'Pengaturan' :
               activeTab === 'vessels' ? 'Data Kapal' :
               activeTab === 'perangkat' ? 'Data Perangkat' :
               activeTab === 'catch' ? 'Hasil Tangkap' :
               activeTab === 'harbor-zones' ? 'Zonasi Pelabuhan' :
               activeTab === 'catch-polygons' ? 'Zonasi Tangkap' :
               activeTab === 'raw-data' ? 'Raw Data IoT' :
               'E-Logbook Maritime'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              {currentTime.toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
              <span className="font-bold ml-1">
                {(() => {
                  const offset = currentTime.getTimezoneOffset();
                  if (offset === -420) return 'WIB';
                  if (offset === -480) return 'WITA';
                  if (offset === -540) return 'WIT';
                  return 'WIB';
                })()}
              </span>
            </div>
            
            {sosCount > 0 && (
              <div className="relative">
                <BellRing className="text-red-500 emergency-pulse" size={24} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {sosCount}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="p-8 min-h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          if (onLogout) onLogout();
        }}
        title="Konfirmasi Logout"
        message="Apakah Anda yakin ingin keluar dari aplikasi?"
        confirmText="Ya, Logout"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};

export default Layout;

