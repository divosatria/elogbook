
import React, { useState, useEffect } from 'react';
import { AlertCircle, Phone, MapPin, CheckCircle, ExternalLink, MessageSquare, RefreshCw, Activity, Clock, Shield, Navigation, AlertTriangle, Anchor, Ship, MessageCircle, RadioTower, Siren } from 'lucide-react';





import { backendAPI } from '../services/backendService';
import { socketService } from '../services/socketService';

interface SOSAlert {
  _id: string;
  vesselId: string;
  vesselName: string;
  timestamp: string;
  location: { lat: number; lng: number };
  note: string;
  resolved: boolean;
  nahkoda?: {
    nama: string;
    noTelepon: string;
  };
  tripId?: number;
}

interface SOSAlertsProps {
  alerts: SOSAlert[];
  onResolve: (id: string) => void;
}

const SOSAlerts: React.FC<SOSAlertsProps> = ({ alerts: propAlerts, onResolve }) => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(propAlerts)) {
      const normalized = propAlerts.map((a: any) => ({
        ...a,
        _id: a._id || a.id,
        vesselName: a.vesselName || a.vessel?.namaKapal || a.kapal?.namaKapal || 'Unknown Vessel',
        // Ensure other fields are carried over safely
      }));
      setAlerts(normalized);
    }
  }, [propAlerts]);

  useEffect(() => {
    loadAlerts();
    try {
      socketService.onSOSAlert((newAlert) => {
        if (newAlert) {
            const normalized = {
                ...newAlert,
                _id: newAlert._id || newAlert.id,
                vesselName: newAlert.vesselName || newAlert.kapal?.namaKapal || 'Unknown Vessel'
            };
            setAlerts(prev => [normalized, ...prev]);
        }
      });
    } catch (err) {
      console.error('Socket setup error:', err);
    }
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await backendAPI.getSOSAlerts();
      const rawData = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      
      const normalizedData = rawData.map((alert: any) => ({
        ...alert,
        _id: alert._id || alert.id, // Ensure _id exists
        vesselName: alert.vesselName || alert.kapal?.namaKapal || 'Unknown Vessel'
      }));

      setAlerts(normalizedData);
    } catch (error) {
      console.error('Load SOS alerts error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeAlerts = alerts.filter(a => a && !a.resolved);
  const resolvedAlerts = alerts.filter(a => a && a.resolved);

  // --- SUB-COMPONENTS ---

  // Stat Card - Unified Border with Colored Icons
  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => {
    // Icon colors based on category
    const iconColors: Record<string, string> = {
      rose: 'text-rose-600',
      emerald: 'text-emerald-600',
      blue: 'text-blue-600',
      cyan: 'text-cyan-600',
    };
    
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
          <div className={`p-2 bg-slate-50 rounded-md ${iconColors[color]}`}>
            <Icon size={18} />
          </div>
        </div>
      </div>
    );
  };

  // 1. Incident Timeline Component - Simplified
  const IncidentTimeline = () => {
    const timelineEvents = alerts
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map((alertItem: any) => ({
            id: alertItem._id || alertItem.id,
            time: new Date(alertItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(alertItem.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            category: alertItem.resolved ? 'RESOLVED' : 'DARURAT',
            message: alertItem.resolved 
                ? `${alertItem.vesselName} - Insiden selesai` 
                : `${alertItem.vesselName} - Sinyal darurat`,
            type: alertItem.resolved ? 'success' : 'critical',
            vesselName: alertItem.vesselName,
        }));

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-md animate-pulse">
              <RadioTower size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800">Live Activity</h3>
              <p className="text-xs text-slate-500">Real-time log</p>
            </div>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        
        {/* Timeline */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {timelineEvents.length === 0 ? (
            <div className="text-center py-6">
              <div className="p-3 bg-slate-50 rounded-lg w-fit mx-auto mb-2">
                <Shield size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 text-xs font-medium">Belum ada aktivitas</p>
              <p className="text-slate-400 text-xs mt-0.5">Semua operasi normal</p>
            </div>
          ) : (
            <div className="space-y-3 relative ml-2">
              {/* Vertical Line */}
              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-slate-100"></div>

              {timelineEvents.map((event, index) => (
                <div key={event.id || `evt-${index}`} className="relative pl-5">
                  {/* Dot */}
                  <div className={`absolute left-[-4px] top-1 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                    event.type === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}>
                    {event.type === 'critical' && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-rose-500 opacity-40"></span>
                    )}
                  </div>
                  
                  <div className="pt-0 pb-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-slate-500">{event.time}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        event.type === 'critical' 
                          ? 'bg-rose-50 text-rose-600' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{event.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. Incident Card Component - Compact & Simple
  const IncidentCard = ({ alert }: { alert: SOSAlert }) => {
    const [elapsed, setElapsed] = useState('');
    
    useEffect(() => {
      const updateTimer = () => {
        const start = new Date(alert.timestamp).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        
        const h = Math.floor(diff / 3600).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
        const s = (diff % 60).toString().padStart(2, '0');
        setElapsed(`${h}:${m}:${s}`);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [alert.timestamp]);

    const handleContact = () => {
      if (!alert.nahkoda?.noTelepon) return window.alert('No contact number available');
      window.open(`https://wa.me/${alert.nahkoda.noTelepon.replace(/\D/g, '')}`, '_blank');
    };

    return (
      <div className="bg-slate-50 rounded-md p-3 border border-slate-200 hover:bg-slate-100 transition-colors">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-rose-100 flex items-center justify-center shrink-0 animate-pulse">
              <Ship className="text-rose-600" size={16} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-800">{alert.vesselName}</h3>
              {alert.nahkoda?.nama && (
                <p className="text-xs text-slate-500">{alert.nahkoda.nama}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono font-bold text-rose-600">{elapsed}</p>
            <p className="text-xs text-slate-400">
              {new Date(alert.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Info Row */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
          <div className="flex items-start gap-1">
            <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-mono text-slate-700 leading-tight">
                {alert.location?.lat?.toFixed(4)}, {alert.location?.lng?.toFixed(4)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-1">
            <MessageSquare size={10} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-slate-600 leading-tight line-clamp-2">
              {alert.note || 'Tidak ada pesan'}
            </p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex gap-2">
          <button 
            onClick={handleContact} 
            disabled={!alert.nahkoda?.noTelepon}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-white border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone size={12} />
            Hubungi
          </button>
          <button 
            onClick={() => onResolve(alert._id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-blue-600 text-white font-medium text-xs hover:bg-blue-700 transition-colors"
          >
            <CheckCircle size={12} />
            Selesaikan
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
        
        {/* HEADER SECTION - Clean & Simple */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-lg shrink-0">
              <AlertTriangle className="text-rose-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Pusat Tanggap Darurat
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Emergency Response Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-rose-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-xs font-semibold">{activeAlerts.length} Insiden Aktif</span>
              </div>
            )}
            <button 
              onClick={loadAlerts} 
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* STATISTICS CARDS - Compact Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Insiden Aktif"
            value={activeAlerts.length}
            icon={Siren}
            color="rose"
          />
          <StatCard
            label="Sudah Ditangani"
            value={resolvedAlerts.length}
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard
            label="Total Insiden"
            value={alerts.length}
            icon={AlertTriangle}
            color="blue"
          />
          <StatCard
            label="Tingkat Respons"
            value={alerts.length > 0 ? Math.round((resolvedAlerts.length / alerts.length) * 100) : 100}
            icon={MessageCircle}
            color="cyan"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left Column: Incidents List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 rounded-md">
                    <AlertTriangle size={14} className="text-rose-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-slate-800">Daftar Insiden Darurat</h2>
                    <p className="text-xs text-slate-500">Menampilkan {activeAlerts.length} dari {alerts.length} insiden</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              {activeAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-fit mb-3">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <Anchor size={32} className="text-slate-300" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-slate-700">Semua Aman!</h3>
                  <p className="mt-1 text-slate-500 text-sm max-w-sm mx-auto">
                    Tidak ada sinyal darurat yang aktif saat ini. Semua operasi berjalan normal.
                  </p>
                </div>
              ) : (
                <div className="p-4 max-h-[600px] overflow-y-auto space-y-4">
                  {activeAlerts.map(alert => <IncidentCard key={alert._id} alert={alert} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Timeline */}
          <div className="lg:col-span-1">
            <IncidentTimeline />
          </div>
        </div>

      </div>
  );
};

export default SOSAlerts;
