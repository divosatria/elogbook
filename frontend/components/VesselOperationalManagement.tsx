import React, { useState, useEffect } from 'react';
import { Users, MapPin, Settings, Calendar, Fuel, FileText, Activity, AlertTriangle, CheckCircle, Clock, Wrench, Navigation, Wifi, WifiOff, Battery, Shield, Eye, Edit, Plus, Search, Filter, Download, Upload, Bell, Ship } from 'lucide-react';

import { backendAPI } from '../services/backendService';

interface Vessel {
  id: number;
  namaKapal: string;
  nomorRegistrasi: string;
  pemilik: string;
  statusOperasional: 'active' | 'maintenance' | 'inactive';
  statusPelayaran: 'sailing' | 'docked' | 'maintenance' | 'idle';
  nahkodaId: number | null;
  gps: any;
  lastPosition: any;
  isGPSActive: boolean;
  lastGPSUpdate: string | null;
  crewCount: number;
  maintenanceSchedule: any[];
  fuelLevel: number;
  documents: any[];
}

interface CrewMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  status: 'active' | 'inactive';
}

const VesselOperationalManagement: React.FC = () => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'crew' | 'maintenance' | 'fuel' | 'documents' | 'tracking'>('overview');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadVessels();
    // Auto-refresh every 30 seconds for real-time data
    const interval = setInterval(loadVessels, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadVessels = async () => {
    try {
      const response = await backendAPI.getActiveVessels();
      setVessels(response.vessels || []);
    } catch (error) {
      console.error('Error loading vessels:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'sailing': return 'text-blue-600 bg-blue-100';
      case 'docked': return 'text-gray-600 bg-gray-100';
      case 'maintenance': return 'text-orange-600 bg-orange-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'sailing': return 'Berlayar';
      case 'docked': return 'Berlabuh';
      case 'maintenance': return 'Maintenance';
      case 'inactive': return 'Tidak Aktif';
      default: return status;
    }
  };

  const filteredVessels = vessels.filter(vessel => {
    const matchesSearch = vessel.namaKapal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vessel.nomorRegistrasi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vessel.statusOperasional === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateVesselStatus = async (vesselId: number, status: string) => {
    try {
      await backendAPI.updateVessel(vesselId.toString(), { statusOperasional: status });
      loadVessels();
    } catch (error) {
      console.error('Error updating vessel status:', error);
    }
  };

  const VesselCard = ({ vessel }: { vessel: Vessel }) => (
    <div 
      className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg ${
        selectedVessel?.id === vessel.id ? 'border-blue-500 shadow-lg' : 'border-slate-200'
      }`}
      onClick={() => setSelectedVessel(vessel)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Ship size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{vessel.namaKapal}</h3>
            <p className="text-xs text-slate-500">{vessel.nomorRegistrasi}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {vessel.isGPSActive ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-500" />
          )}
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(vessel.statusOperasional)}`}>
            {getStatusText(vessel.statusOperasional)}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <Users size={14} className="mx-auto mb-1 text-slate-600" />
          <p className="font-medium">{vessel.crewCount || 0}</p>
          <p className="text-slate-500">Crew</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <Fuel size={14} className="mx-auto mb-1 text-slate-600" />
          <p className="font-medium">{vessel.fuelLevel || 0}%</p>
          <p className="text-slate-500">Fuel</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <MapPin size={14} className="mx-auto mb-1 text-slate-600" />
          <p className="font-medium">{vessel.lastPosition ? 'GPS' : 'No GPS'}</p>
          <p className="text-slate-500">Location</p>
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Status Operasional</p>
              <p className="text-xs text-blue-600">{getStatusText(selectedVessel?.statusOperasional || '')}</p>
            </div>
            <Activity size={24} className="text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">GPS Status</p>
              <p className="text-xs text-green-600">{selectedVessel?.isGPSActive ? 'Aktif' : 'Offline'}</p>
            </div>
            {selectedVessel?.isGPSActive ? (
              <Wifi size={24} className="text-green-600" />
            ) : (
              <WifiOff size={24} className="text-red-600" />
            )}
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Fuel Level</p>
              <p className="text-xs text-orange-600">{selectedVessel?.fuelLevel || 0}%</p>
            </div>
            <Fuel size={24} className="text-orange-600" />
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-800">Crew Count</p>
              <p className="text-xs text-purple-600">{selectedVessel?.crewCount || 0} orang</p>
            </div>
            <Users size={24} className="text-purple-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <button 
              onClick={() => updateVesselStatus(selectedVessel?.id || 0, 'maintenance')}
              className="w-full flex items-center space-x-2 p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            >
              <Wrench size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Set Maintenance Mode</span>
            </button>
            
            <button className="w-full flex items-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <Navigation size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Track Location</span>
            </button>
            
            <button className="w-full flex items-center space-x-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <FileText size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">Generate Report</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3">Recent Activities</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">GPS Signal Restored</p>
                <p className="text-xs text-slate-500">2 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Departed from Harbor</p>
                <p className="text-xs text-slate-500">1 hour ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-2 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Fuel Refilled</p>
                <p className="text-xs text-slate-500">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CrewTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800">Crew Management</h4>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
          <Plus size={16} />
          <span>Add Crew</span>
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <p className="text-slate-500 text-center py-8">Crew management feature coming soon...</p>
      </div>
    </div>
  );

  const MaintenanceTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800">Maintenance Schedule</h4>
        <button className="flex items-center space-x-2 bg-orange-600 text-white px-3 py-2 rounded-lg text-sm">
          <Calendar size={16} />
          <span>Schedule Maintenance</span>
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <p className="text-slate-500 text-center py-8">Maintenance scheduling feature coming soon...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Manajemen Kapal</h2>
            <p className="text-slate-600 text-sm">Operasional dan monitoring kapal real-time</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Cari kapal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-40"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vessel List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Daftar Kapal ({filteredVessels.length})</h3>
            <div className="flex items-center space-x-1 text-xs text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : filteredVessels.length === 0 ? (
              <div className="text-center py-8">
                <Ship size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Tidak ada kapal ditemukan</p>
              </div>
            ) : (
              filteredVessels.map(vessel => (
                <VesselCard key={vessel.id} vessel={vessel} />
              ))
            )}
          </div>
        </div>

        {/* Vessel Details */}
        <div className="lg:col-span-2">
          {selectedVessel ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedVessel.namaKapal}</h3>
                    <p className="text-slate-600">{selectedVessel.nomorRegistrasi}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedVessel.statusOperasional)}`}>
                      {getStatusText(selectedVessel.statusOperasional)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'overview', label: 'Overview', icon: Activity },
                    { id: 'crew', label: 'Crew', icon: Users },
                    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
                    { id: 'fuel', label: 'Fuel', icon: Fuel },
                    { id: 'documents', label: 'Documents', icon: FileText },
                    { id: 'tracking', label: 'Tracking', icon: MapPin }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.icon size={16} />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'crew' && <CrewTab />}
                {activeTab === 'maintenance' && <MaintenanceTab />}
                {activeTab === 'fuel' && (
                  <div className="text-center py-8">
                    <Fuel size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Fuel monitoring feature coming soon...</p>
                  </div>
                )}
                {activeTab === 'documents' && (
                  <div className="text-center py-8">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Document management feature coming soon...</p>
                  </div>
                )}
                {activeTab === 'tracking' && (
                  <div className="text-center py-8">
                    <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Real-time tracking feature coming soon...</p>
                  </div>
                )}
              </div>
            </div>

          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
              <Ship size={64} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">Pilih Kapal</h3>
              <p className="text-slate-500">Pilih kapal dari daftar untuk melihat detail operasional</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VesselOperationalManagement;