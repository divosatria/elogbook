import React, { useState, useEffect } from 'react';
import { Ship, MapPin, Activity, Wifi, WifiOff, Navigation, Clock, RefreshCw, Filter, Search, X, Target, CheckCircle, Circle, Radar, Anchor, Shield, Package, LayoutDashboard, LocateFixed, AlertTriangle } from 'lucide-react';




import RealTimeMonitoringMap from './RealTimeMonitoringMap';
import MonitoringErrorBoundary from '@/components/common/MonitoringErrorBoundary';
import { monitoringService } from '@/services/monitoringService';
import { socketService } from '@/services/socketService';

interface MonitoringPageProps {
  className?: string;
}

const MonitoringPage: React.FC<MonitoringPageProps> = ({ className = '' }) => {
  const [vessels, setVessels] = useState<any[]>([]);
  const [harborZones, setHarborZones] = useState<any[]>([]);
  const [pois, setPois] = useState<any[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneViolations, setZoneViolations] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalVessels: 0,
    activeGPS: 0,
    sailing: 0,
    docked: 0
  });

  useEffect(() => {
    initializeMonitoring();
    return () => cleanup();
  }, []);

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
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonitoringData = async () => {
    try {
      setIsLoading(true);
      const response = await monitoringService.getMonitoringData();
      if (response.success) {
        const { activeTrips, harborZones, pois, summary } = response.data;
        
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

          return {
            id: trip.id,
            tripId: trip.id,
            name: kapal.namaKapal,
            vesselId: kapal.nomorRegistrasi,
            status: trip.status,
            location: trip.currentLocation,
            harborZone: trip.harborZone,
            nahkoda: trip.nahkodaNahkoda,
            isGPSActive: !!trip.currentLocation,
            lastUpdate: trip.updatedAt,
            speed: trip.currentLocation?.speed || 0,
            heading: trip.currentLocation?.heading || 0,
            vesselType: kapal.tipeKapal || 'Unknown',
            operationalStatus: kapal.statusOperasional || 'Unknown',
            // Tambahkan informasi tugas
            activeTasks: trip.tasks || [],
            distanceFromHarbor: trip.distanceFromHarbor || null,
            taskSummary: {
              total: trip.tasks?.length || 0,
              pending: trip.tasks?.filter(t => t.status === 'pending').length || 0,
              inProgress: trip.tasks?.filter(t => t.status === 'in_progress').length || 0,
              currentDestination: trip.tasks?.find((t: any) => t.taskType === 'fishing' && t.catchPolygon)?.catchPolygon?.name || 
                (typeof trip.areaTangkap === 'object' ? trip.areaTangkap?.nama : trip.areaTangkap) || 'Tidak ditentukan'
            }
          };
        }).filter(vessel => vessel !== null);

        setVessels(vesselData);
        setHarborZones(harborZones || []);
        setPois(pois || []);
        
        // Update statistics
        setStats({
          totalVessels: vesselData.length,
          activeGPS: vesselData.filter(v => v.isGPSActive).length,
          sailing: vesselData.filter(v => v.status === 'sedang_melaut').length,
          docked: vesselData.filter(v => v.status === 'disetujui').length
        });

        // Track vessels for real-time updates
        vesselData.forEach(vessel => {
          if (vessel.isGPSActive) {
            monitoringService.trackVessel(vessel.tripId);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeListeners = () => {
    monitoringService.on('vessel_location_update', (data) => {
      updateVesselLocation(data);
    });

    monitoringService.on('vessel_zone_update', (data) => {
      updateVesselZone(data);
    });

    monitoringService.on('connection_status', (status) => {
      setConnectionStatus(status);
    });

    monitoringService.on('emergency_alert', (alert) => {
      handleEmergencyAlert(alert);
    });

    monitoringService.on('zone_violation', (data) => {
      setZoneViolations(prev => {
        // Hindari duplikat per kapal+zona
        const filtered = prev.filter(v => !(v.vesselId === data.vesselId && v.violations?.some((vv: any) => data.violations?.some((dv: any) => dv.zoneId === vv.zoneId))));
        return [{ ...data, timestamp: new Date().toISOString() }, ...filtered].slice(0, 20);
      });
    });
  };

  const updateVesselLocation = (data: any) => {
    setVessels(prevVessels => {
      return prevVessels.map(vessel => {
        if (vessel.tripId === data.tripId) {
          return {
            ...vessel,
            location: data.location,
            isGPSActive: true,
            lastUpdate: data.timestamp,
            speed: data.location?.speed || 0,
            heading: data.location?.heading || 0,
            distanceFromHarbor: data.distanceFromHarbor ?? vessel.distanceFromHarbor
          };
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
    // Show emergency notification
    console.log('Emergency alert received:', alert);
    // You can add toast notification here
  };

  const cleanup = () => {
    monitoringService.destroy();
  };

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = !searchTerm || 
      vessel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vessel.vesselId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && vessel.isGPSActive) ||
      (statusFilter === 'sailing' && vessel.status === 'sedang_melaut') ||
      (statusFilter === 'docked' && vessel.status === 'disetujui');
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sedang_melaut': return 'text-cyan-600 bg-cyan-100';
      case 'disetujui': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sedang_melaut': return 'Berlayar';
      case 'disetujui': return 'Disetujui';
      default: return 'Unknown';
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    if (!timestamp) return 'Tidak ada data';
    
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - updateTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
        {/* Header - Maritime Theme */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-3 bg-blue-50 rounded-lg shrink-0">
              <Radar className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Pemantauan Kapal
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                 Monitoring armada, zona tangkap, dan aktivitas maritim real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-slate-50 border-slate-200 ${
              connectionStatus === 'connected' 
                ? 'text-emerald-600' 
                : connectionStatus === 'disconnected' 
                  ? 'text-amber-600' 
                  : 'text-rose-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                connectionStatus === 'disconnected' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
              {connectionStatus === 'connected' ? 'Live System' : 
               connectionStatus === 'disconnected' ? 'Connecting...' : 'Offline'}
            </div>

            <button
              onClick={() => {
                loadMonitoringData();
                window.location.reload();
              }}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium text-xs shadow-sm transition-all ${
                isLoading 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isLoading ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            label="Total Armada"
            value={stats.totalVessels}
            icon={Ship}
            color="blue"
          />
          <StatCard
            label="GPS Aktif"
            value={stats.activeGPS}
            icon={LocateFixed}
            color="emerald"
          />
          <StatCard
            label="Sedang Melaut"
            value={stats.sailing}
            icon={Ship}
            color="cyan"
          />
          <StatCard
            label="Disetujui/Sandar"
            value={stats.docked}
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard
            label="Titik POI"
            value={pois.length}
            icon={Anchor}
            color="purple"
          />
        </div>

        {/* Zone Violation Alerts */}
        {zoneViolations.length > 0 && (
          <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="font-bold text-amber-800 text-sm">Pelanggaran Zonasi GT Kapal</h3>
                <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{zoneViolations.length}</span>
              </div>
              <button onClick={() => setZoneViolations([])} className="text-amber-500 hover:text-amber-700 p-1">
                <X size={14} />
              </button>
            </div>
            <div className="divide-y divide-amber-100 max-h-48 overflow-y-auto">
              {zoneViolations.map((v, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{v.vesselName}</p>
                      {v.violations?.map((vv: any, j: number) => (
                        <div key={j} className={`flex items-center gap-2 mt-1 text-xs px-2 py-1 rounded ${
                          vv.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          <AlertTriangle size={11} />
                          <span>{vv.message}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {v.timestamp ? new Date(v.timestamp).toLocaleTimeString('id-ID') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Map - Full Width */}
        <MonitoringErrorBoundary>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-[75vh] min-h-[500px]">
              <RealTimeMonitoringMap className="w-full h-full" />
            </div>
          </div>
        </MonitoringErrorBoundary>

        {/* Vessel List - Grid Card + Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="bg-white border-b border-slate-200 px-5 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Ship size={16} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Daftar Armada</h3>
                  <p className="text-xs text-slate-500">{filteredVessels.length} dari {vessels.length} kapal</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari nama/ID kapal..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-56 pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                
                {/* Filter Buttons */}
                <div className="flex gap-1 bg-slate-100/50 p-1 rounded-lg">
                  {[
                    { value: 'all', label: 'Semua' },
                    { value: 'active', label: 'Aktif' },
                    { value: 'sailing', label: 'Berlayar' },
                    { value: 'docked', label: 'Sandar' }
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        statusFilter === filter.value
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid Cards */}
          <div className="p-5">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">Memuat data armada...</p>
              </div>
            ) : filteredVessels.length === 0 ? (
              <div className="text-center py-12">
                <Ship size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Tidak ada kapal ditemukan</p>
                <p className="text-slate-400 text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Kapal</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">GPS</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kecepatan</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arah</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jarak dari Pelabuhan</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tujuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVessels.map((vessel) => (
                      <tr
                        key={vessel.id}
                        onClick={() => setSelectedVessel(vessel)}
                        className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                          selectedVessel?.id === vessel.id 
                            ? 'bg-blue-50' 
                            : ''
                        }`}
                      >
                        {/* Nama Kapal */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                              vessel.status === 'sedang_melaut' 
                                ? 'bg-cyan-50 text-cyan-600' 
                                : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              <Ship size={14} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{vessel.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{vessel.vesselId}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Status */}
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(vessel.status)}`}>
                            {getStatusText(vessel.status)}
                          </span>
                        </td>
                        
                        {/* GPS */}
                        <td className="py-2.5 px-4">
                          {vessel.isGPSActive ? (
                            <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              Live
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                              <WifiOff size={10} />
                              Offline
                            </span>
                          )}
                        </td>
                        
                        {/* Kecepatan */}
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-700 text-xs">{vessel.speed?.toFixed(1) || '0.0'} kn</span>
                        </td>
                        
                        {/* Arah */}
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-slate-700 text-xs">{vessel.heading?.toFixed(0) || '0'}Â°</span>
                        </td>
                        
                        {/* Jarak dari Pelabuhan */}
                        <td className="py-2.5 px-4">
                          {vessel.distanceFromHarbor ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold text-xs ${
                                  vessel.distanceFromHarbor.isViolating ? 'text-red-600' : 'text-slate-700'
                                }`}>
                                  {vessel.distanceFromHarbor.nauticalMiles.toFixed(1)} mil
                                </span>
                                {vessel.distanceFromHarbor.maxMil && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    vessel.distanceFromHarbor.isViolating
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {vessel.distanceFromHarbor.isViolating ? 'âš  Melebihi' : 'âœ“ Aman'} {vessel.distanceFromHarbor.maxMil} mil
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                {vessel.distanceFromHarbor.kategori}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">â€”</span>
                          )}
                        </td>
                        
                        {/* Tujuan */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 max-w-[200px]">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{vessel.taskSummary?.currentDestination || 'Tidak ditentukan'}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Selected Vessel Details - Matching Other Pages Style */}
        {selectedVessel && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mt-6">
            {/* Detail Header - Simple Style */}
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Ship size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedVessel.name}</h3>
                    <p className="text-slate-500 text-xs font-mono">{selectedVessel.vesselId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVessel(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <Navigation size={12} className="text-blue-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status</span>
                  </div>
                  <p className={`text-sm font-bold ${selectedVessel.status === 'sedang_melaut' ? 'text-cyan-600' : 'text-green-600'}`}>
                    {getStatusText(selectedVessel.status)}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1 rounded ${selectedVessel.isGPSActive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {selectedVessel.isGPSActive ? <LocateFixed size={12} className="text-emerald-600" /> : <WifiOff size={12} className="text-red-500" />}
                    </div>
                    <p className="text-xs font-medium text-slate-500">GPS</p>
                  </div>
                  <p className={`text-sm font-bold ${selectedVessel.isGPSActive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selectedVessel.isGPSActive ? 'Aktif' : 'Tidak Aktif'}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-cyan-100 rounded">
                      <Activity size={12} className="text-cyan-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Kecepatan</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{selectedVessel.speed?.toFixed(1) || '0.0'} knot</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-purple-100 rounded">
                      <Navigation size={12} className="text-purple-600" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Arah</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{selectedVessel.heading?.toFixed(0) || '0'}Â°</p>
                </div>
              </div>

              {/* Information Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Captain Info */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Circle size={8} className="text-blue-500 fill-blue-500" />
                      Informasi Nahkoda
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <span className="text-blue-600 font-bold text-xs">
                          {selectedVessel.nahkoda?.nama?.charAt(0) || 'N'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{selectedVessel.nahkoda?.nama || 'Tidak tersedia'}</p>
                        <p className="text-xs text-slate-500">Nahkoda</p>
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Circle size={8} className="text-green-500 fill-green-500" />
                      Tujuan Perjalanan
                    </h4>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-green-600" />
                      <p className="text-slate-800 font-bold text-sm bg-green-50 px-2 py-0.5 rounded text-green-700 border border-green-100 inline-block">{selectedVessel.taskSummary?.currentDestination || 'Tidak ditentukan'}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Location */}
                {selectedVessel.location && (
                  <div className="bg-white rounded-lg p-4 border border-emerald-100 shadow-sm">
                    <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Circle size={8} className="text-emerald-500 fill-emerald-500" />
                      Lokasi Real-time
                      <span className="flex items-center gap-1 ml-auto">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Live</span>
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/70 rounded-md p-2.5 shadow-sm">
                        <span className="text-[10px] text-emerald-600/70 uppercase font-bold block mb-0.5">Latitude</span>
                        <p className="font-mono text-xs font-bold text-emerald-800">{selectedVessel.location.lat?.toFixed(6)}</p>
                      </div>
                      <div className="bg-white/70 rounded-md p-2.5 shadow-sm">
                        <span className="text-[10px] text-emerald-600/70 uppercase font-bold block mb-0.5">Longitude</span>
                        <p className="font-mono text-xs font-bold text-emerald-800">{selectedVessel.location.lng?.toFixed(6)}</p>
                      </div>
                    </div>
                    {/* Jarak dari Pelabuhan */}
                    {selectedVessel.distanceFromHarbor && (
                      <div className={`mt-3 p-3 rounded-lg border ${
                        selectedVessel.distanceFromHarbor.isViolating
                          ? 'bg-red-50 border-red-200'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Jarak dari Pelabuhan</span>
                          {selectedVessel.distanceFromHarbor.maxMil && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              selectedVessel.distanceFromHarbor.isViolating
                                ? 'bg-red-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {selectedVessel.distanceFromHarbor.isViolating ? 'âš  MELEBIHI BATAS' : 'âœ“ DALAM BATAS'}
                            </span>
                          )}
                        </div>
                        <p className={`text-lg font-bold ${
                          selectedVessel.distanceFromHarbor.isViolating ? 'text-red-700' : 'text-emerald-700'
                        }`}>
                          {selectedVessel.distanceFromHarbor.nauticalMiles.toFixed(1)} mil laut
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          dari {selectedVessel.distanceFromHarbor.harborName}
                          {selectedVessel.distanceFromHarbor.maxMil && (
                            <> &bull; Batas: <strong>{selectedVessel.distanceFromHarbor.maxMil} mil</strong> ({selectedVessel.distanceFromHarbor.kategori})</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Active Tasks Section */}
              {selectedVessel.activeTasks && selectedVessel.activeTasks.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <h4 className="text-xs font-bold text-blue-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Target size={14} className="text-blue-600" />
                    Tugas Aktif
                    <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {selectedVessel.activeTasks.length}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {selectedVessel.activeTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-blue-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            task.status === 'pending' ? 'bg-yellow-500' :
                            task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                          }`}></div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{task.taskTitle}</p>
                            {task.catchPolygon && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={10} /> {task.catchPolygon.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                            task.priority === 'urgent' ? 'bg-red-50 text-red-700 border border-red-100' :
                            task.priority === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                            task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                            'bg-gray-50 text-gray-700 border border-gray-200'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

    </div>
  );
};

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


  const iconStyles: Record<string, string> = {
    blue: 'text-blue-600',
    cyan: 'text-cyan-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`p-2 bg-slate-50 rounded-md ${iconStyles[color] || 'text-blue-600'}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;

