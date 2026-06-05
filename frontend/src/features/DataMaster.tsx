import React, { useState, useEffect } from 'react';
import { Ship, Users, Fish, MapPin, Shield, Anchor, BarChart3, Database, ArrowRight, Loader2 } from 'lucide-react';
import { backendAPI } from '@/services/backendService';

interface DataMasterProps {
  onNavigate: (tab: string) => void;
}

const DataMaster: React.FC<DataMasterProps> = ({ onNavigate }) => {
  const [summaryData, setSummaryData] = useState({
    vessels: { total: 0, active: 0, maintenance: 0, offline: 0 },
    fishermen: { total: 0, active: 0, inactive: 0 },
    catch: { totalTons: 0, thisMonth: 0, avgPerTrip: 0 },
    zones: { harbors: 8, catchAreas: 25, restricted: 5 },
    polygons: { safe: 18, warning: 12, danger: 3 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardData, vessels, fishermen, catchReports, harborZonesResult] = await Promise.allSettled([
          backendAPI.getDashboardData(),
          backendAPI.getVessels(),
          backendAPI.getFishermen(),
          backendAPI.getCatchReports(),
          backendAPI.getHarborZones()
        ]);

        const vesselData = vessels.status === 'fulfilled' ? vessels.value : [];
        const fishermenData = fishermen.status === 'fulfilled' ? fishermen.value : [];
        const catchData = catchReports.status === 'fulfilled' ? catchReports.value : [];
        const dashboard = dashboardData.status === 'fulfilled' ? dashboardData.value : {};
        const polygonData = harborZonesResult.status === 'fulfilled' ? (harborZonesResult.value?.data || harborZonesResult.value || []) : [];

        console.log('Raw polygon response:', harborZonesResult);
        console.log('Polygon data loaded:', polygonData.length, 'polygons');
        console.log('Polygon data content:', polygonData);
        console.log('Polygon types:', polygonData.map(p => p.type));
        
        // If no polygon data, use fallback for display
        const hasPolygonData = polygonData.length > 0;
        console.log('hasPolygonData:', hasPolygonData);

        // Calculate vessel status counts
        const vesselCounts = {
          total: vesselData.length,
          active: vesselData.filter(v => v.status === 'Aktif').length,
          maintenance: vesselData.filter(v => v.status === 'Perbaikan').length,
          offline: vesselData.filter(v => v.status === 'Non-aktif').length
        };

        // Calculate fishermen status counts
        const fishermenCounts = {
          total: fishermenData.length,
          active: fishermenData.filter(f => f.statusAktif === true || f.status === 'Aktif').length,
          inactive: fishermenData.filter(f => f.statusAktif === false || f.status === 'Nonaktif').length
        };

        // Calculate catch statistics
        const totalCatch = catchData.reduce((sum, c) => sum + (c.beratKg || c.weightKg || 0), 0) / 1000; // Convert to tons
        const thisMonth = new Date().getMonth();
        const thisMonthCatch = catchData
          .filter(c => new Date(c.tanggalTangkap || c.date).getMonth() === thisMonth)
          .reduce((sum, c) => sum + (c.beratKg || c.weightKg || 0), 0) / 1000;
        const avgPerTrip = dashboard.totalTrips > 0 ? totalCatch / dashboard.totalTrips : 0;

        // Calculate polygon statistics
        const polygonCounts = hasPolygonData ? {
          safe: polygonData.filter(p => p.type === 'harbor' || p.type === 'port').length,
          warning: polygonData.filter(p => p.type === 'anchorage').length,
          danger: polygonData.filter(p => p.type === 'restricted' || p.type === 'conservation').length
        } : {
          safe: 0,
          warning: 0, 
          danger: 0
        };

        console.log('Polygon counts calculated:', polygonCounts);
        console.log('Polygon data sample:', polygonData.slice(0, 2));

        setSummaryData({
          vessels: vesselCounts,
          fishermen: fishermenCounts,
          catch: {
            totalTons: totalCatch,
            thisMonth: thisMonthCatch,
            avgPerTrip: avgPerTrip
          },
          zones: { 
            harbors: 8, 
            catchAreas: hasPolygonData ? polygonData.length : 0, 
            restricted: 5 
          },
          polygons: polygonCounts
        });
      } catch (error) {
        console.error('Failed to load data master summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const quickActions = [
    { id: 'vessels', label: 'Data Kapal', icon: Ship, color: 'blue', count: summaryData.vessels.total },  
    { id: 'catch', label: 'Hasil Tangkap', icon: Fish, color: 'purple', count: `${summaryData.catch.totalTons.toFixed(1)} ton` },
    { id: 'harbor-zones', label: 'Zonasi Pelabuhan', icon: Anchor, color: 'teal', count: summaryData.zones.harbors },
    { id: 'catch-polygons', label: 'Zonasi Tangkap', icon: MapPin, color: 'orange', count: summaryData.zones.catchAreas },
   
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Database size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Data Master</h2>
            <p className="text-slate-500">Overview dan akses cepat ke semua data master</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => {
            const themes = {
              blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-400' },
              green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'hover:border-emerald-400' }, 
              purple: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'hover:border-violet-400' },
              teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'hover:border-teal-400' },
              orange: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'hover:border-amber-400' },
              indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'hover:border-indigo-400' }
            };
            
            const theme = themes[action.color as keyof typeof themes];
            
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={`relative p-5 rounded-xl bg-white border border-slate-200 transition-all duration-200 hover:shadow-md ${theme.border} group flex flex-col items-center justify-center text-center`}
              >
                <div className="absolute top-4 right-4">
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                <div className={`mb-3 p-3 rounded-lg ${theme.bg} ${theme.text}`}>
                  <action.icon size={24} />
                </div>
                <h3 className="font-semibold text-slate-600 text-base mb-1">{action.label}</h3>
                <p className="text-3xl font-bold text-slate-800 tracking-tight">
                  {typeof action.count === 'number' ? action.count.toLocaleString() : action.count}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
            <Shield size={22} className="mr-2 text-blue-600" />
            Zonasi Keamanan
          </h3>
          {summaryData.polygons.safe + summaryData.polygons.warning + summaryData.polygons.danger > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100/50 hover:bg-green-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <span className="font-medium text-slate-700">Zona Aman</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{summaryData.polygons.safe}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 hover:bg-amber-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                  <span className="font-medium text-slate-700">Zona Waspada</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{summaryData.polygons.warning}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-xl border border-red-100/50 hover:bg-red-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                  <span className="font-medium text-slate-700">Zona Bahaya</span>
                </div>
                <span className="text-xl font-bold text-slate-800">{summaryData.polygons.danger}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <MapPin size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 mb-4 font-medium">Belum ada data zonasi tangkap</p>
              <button 
                onClick={() => onNavigate('catch-polygons')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm hover:shadow"
              >
                Tambah Zonasi
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-5 flex items-center text-lg">
            <BarChart3 size={22} className="mr-2 text-purple-600" />
            Statistik Bulanan
          </h3>
          <div className="space-y-6 pt-2">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-600">Trip Aktif</span>
                <span className="font-bold text-slate-800">75%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-3/4"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-600">Tangkapan Target</span>
                <span className="font-bold text-slate-800">82%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[82%]"></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-slate-600">Kepatuhan Zona</span>
                <span className="font-bold text-slate-800">95%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full w-[95%]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataMaster;
