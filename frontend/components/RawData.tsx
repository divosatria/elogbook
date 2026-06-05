import React, { useState, useEffect } from 'react';
import { Database, Search, RefreshCw, AlertCircle, FileText, Download } from 'lucide-react';
import { backendAPI } from '../services/backendService';
import { socketService } from '../services/socketService';

interface RawDataRecord {
  uuid: string;
  source: string;
  raw_data: string;
  parsed_data: string;
  rssi: number;
  snr: number;
  packet_type: string;
  lat: number;
  lng: number;
  suhu_air: number;
  suhu_kelembaban: number;
  berat: number;
  interval: number;
  trail: string;
  received_at: string;
  createdAt: string;
}

const RawData: React.FC = () => {
  const [data, setData] = useState<RawDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limitPerPage, setLimitPerPage] = useState(15);

  const loadData = async (page: number = 1, limit: number = limitPerPage) => {
    setLoading(true);
    setError(null);
    try {
      const response = await backendAPI.getRawEdgeData(page, limit);
      if (response && response.data) {
        setData(response.data);
        if (response.pagination) {
          setCurrentPage(response.pagination.page);
          setTotalPages(response.pagination.totalPages);
          setTotalRecords(response.pagination.total);
        }
      } else {
        setData([]);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data dari server');
      console.error('Error fetching raw data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Muat data pertama kali
    loadData(currentPage, limitPerPage);

    // Pastikan koneksi socket aktif
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Dengarkan trigger "edge_data_updated" dari Backend
    // Ketika Desktop sukses mengirim data (via API), socket akan menyala,
    // dan halaman ini akan langsung memuat data terbaru SECARA INSTAN!
    const unsubscribe = socketService.onEdgeDataUpdated((payload) => {
      console.log('Real-time update received from Edge device:', payload);
      loadData(currentPage, limitPerPage);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentPage, limitPerPage]);

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setLimitPerPage(newLimit);
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages.map((page, idx) => {
      if (page === 'ellipsis') {
        return <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400">...</span>;
      }
      return (
        <button
          key={page}
          onClick={() => setCurrentPage(page as number)}
          disabled={loading}
          className={`px-3 py-1 border rounded-md text-sm font-medium transition-colors ${currentPage === page
            ? 'bg-blue-50 text-blue-600 border-blue-200'
            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50'
            }`}
        >
          {page}
        </button>
      );
    });
  };

  const filteredData = data.filter(record =>
    record.uuid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.packet_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Raw Data (IoT Edge)</h2>
          <p className="text-slate-500 mt-1">Data sinkronisasi dari aplikasi Desktop/IoT secara langsung</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full 2xl:w-auto">
            <div className="flex items-center w-full sm:w-48 lg:w-64 border border-slate-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all flex-shrink-0">
              <Search className="text-slate-400 mr-2 flex-shrink-0" size={18} />
              <input
                type="text"
                placeholder="Cari UUID / Source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <div className="text-sm text-slate-500 flex items-center whitespace-nowrap bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex-shrink-0">
              <Database size={16} className="mr-2 text-slate-400" />
              Total: <span className="font-semibold text-slate-700 ml-1 mr-1">{totalRecords}</span> data
            </div>
          </div>

          {totalRecords > 0 && (
            <div className="flex flex-nowrap items-center bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm gap-2 w-full 2xl:w-auto 2xl:justify-end overflow-x-auto">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0"
              >
                Previous
              </button>

              <div className="flex items-center space-x-1 flex-shrink-0">
                {renderPageNumbers()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading || totalPages === 0}
                className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex-shrink-0"
              >
                Next
              </button>

              <div className="pl-2 border-l border-slate-200 ml-1 flex-shrink-0">
                <select
                  value={limitPerPage}
                  onChange={handleLimitChange}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer py-1 pr-1"
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold w-48">ID Data</th>
                <th className="p-4 font-semibold">Source</th>
                <th className="p-4 font-semibold">Tipe</th>
                <th className="p-4 font-semibold">Sensor</th>
                <th className="p-4 font-semibold">Lokasi (GPS)</th>
                <th className="p-4 font-semibold">Waktu Diterima Edge</th>
                <th className="p-4 font-semibold">Waktu Sinkronisasi</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw size={24} className="animate-spin text-blue-500 mb-2" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText size={48} className="mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">Tidak ada data mentah</p>
                      <p className="text-sm">Belum ada data IoT yang disinkronkan atau pencarian tidak cocok.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((record, index) => {
                  let parsedData: any = {};
                  try {
                    parsedData = record.raw_data ? JSON.parse(record.raw_data) : {};
                  } catch (e) {
                    console.error('Error parsing raw data:', e);
                  }

                  const dataObj = parsedData?.data || {};
                  const trail = dataObj.trail || '-';
                  const idIkan = dataObj.id_ikan || '-';
                  const jenisIkan = dataObj.jenis_ikan || '-';

                  return (
                    <tr
                      key={record.uuid || index}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          {idIkan !== '-' || trail !== '-' ? (
                            <>
                              {idIkan !== '-' && (
                                <span className="text-sm font-semibold text-slate-800">
                                  ID Ikan: {idIkan}
                                </span>
                              )}
                              {trail !== '-' && (
                                <span className="text-xs text-slate-600 font-medium mt-0.5">
                                  Trail: {trail}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 mt-1" title={record.uuid}>
                                UUID: {record.uuid ? record.uuid.substring(0, 8) + '...' : '-'}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-medium text-slate-600" title={record.uuid}>
                              {record.uuid ? record.uuid.substring(0, 10) + '...' : '-'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {record.source || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.packet_type === 'rx' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                          {record.packet_type?.toUpperCase() || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex flex-col gap-1">
                          {jenisIkan !== '-' && (
                            <span className="font-semibold text-blue-700 mb-0.5">{jenisIkan}</span>
                          )}
                          {record.suhu_air != null && <span>Suhu: {record.suhu_air}°C</span>}
                          {record.berat != null && <span>Berat: {record.berat} kg</span>}
                          {record.rssi != null && <span className="text-slate-400 text-xs">RSSI: {record.rssi} dBm</span>}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {record.lat != null && record.lng != null ? (
                          <span>{record.lat}, {record.lng}</span>
                        ) : (
                          <span className="text-slate-400 italic">No GPS</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {formatDate(record.received_at)}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(record.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RawData;
