import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, CheckCircle, XCircle, Clock, User, Ship, Calendar, Filter, AlertTriangle } from 'lucide-react';
import { backendAPI } from '../services/backendService';

interface TripDocument {
  id: string;
  tripId: string;
  nahkodaId: string;
  nahkodaNama: string;
  kapalNama: string;
  kapalId: string;
  status: 'menunggu_izin' | 'disetujui' | 'ditolak' | 'sedang_melaut' | 'selesai';
  tanggalBerangkat: string;
  perizinan?: {
    dokumen?: {
      izinMelaut: boolean;
      dokumenKapal: boolean;
      asuransi: boolean;
    };
    catatan?: string;
    alasanDitolak?: string;
    tanggalDisetujui?: string;
    tanggalDitolak?: string;
  };
  dokumenKapal?: any[];
  sertifikatJalan?: any[];
  createdAt: string;
}

const DocumentManagement: React.FC = () => {
  const [trips, setTrips] = useState<TripDocument[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedTrip, setSelectedTrip] = useState<TripDocument | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadTripDocuments();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [trips, filter]);

  const loadTripDocuments = async () => {
    try {
      setLoading(true);
      const response = await backendAPI.getTrips();
      const tripsData = response.data || response || [];
      
      // Transform trips data untuk document management
      const tripDocuments: TripDocument[] = tripsData.map((trip: any) => ({
        id: trip.id,
        tripId: trip.id,
        nahkodaId: trip.nahkodaId,
        nahkodaNama: trip.nahkoda?.nama || 'Unknown',
        kapalNama: trip.kapal?.namaKapal || 'Unknown',
        kapalId: trip.kapalId,
        status: trip.status,
        tanggalBerangkat: trip.tanggalBerangkat,
        perizinan: trip.perizinan,
        dokumenKapal: trip.kapal?.dokumen || [],
        sertifikatJalan: trip.kapal?.sertifikatJalan || [],
        createdAt: trip.createdAt
      }));
      
      setTrips(tripDocuments);
    } catch (error) {
      console.error('Error loading trip documents:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = trips;
    switch (filter) {
      case 'pending':
        filtered = trips.filter(trip => trip.status === 'menunggu_izin');
        break;
      case 'approved':
        filtered = trips.filter(trip => trip.status === 'disetujui' || trip.status === 'sedang_melaut' || trip.status === 'selesai');
        break;
      case 'rejected':
        filtered = trips.filter(trip => trip.status === 'ditolak');
        break;
      case 'incomplete':
        filtered = trips.filter(trip => {
          const hasDocuments = (trip.sertifikatJalan && trip.sertifikatJalan.length > 0) || 
                              (trip.dokumenKapal && trip.dokumenKapal.length > 0);
          return !hasDocuments;
        });
        break;
      default:
        filtered = trips;
    }
    setFilteredTrips(filtered);
  };

  const handleReviewTrip = async (tripId: string, action: 'approve' | 'reject', catatan: string) => {
    try {
      setActionLoading(tripId);
      const status = action === 'approve' ? 'disetujui' : 'ditolak';
      
      await backendAPI.updateTripStatus(tripId, status, catatan);
      
      // Refresh data
      await loadTripDocuments();
      
      setSelectedTrip(null);
      setReviewNote('');
    } catch (error) {
      console.error('Error reviewing trip:', error);
      alert('Gagal mereview trip: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'menunggu_izin': return 'bg-amber-100 text-amber-700';
      case 'disetujui': return 'bg-blue-100 text-blue-700';
      case 'sedang_melaut': return 'bg-teal-100 text-teal-700';
      case 'selesai': return 'bg-green-100 text-green-700';
      case 'ditolak': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'menunggu_izin': return <Clock size={14} />;
      case 'disetujui': case 'sedang_melaut': case 'selesai': return <CheckCircle size={14} />;
      case 'ditolak': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getFilterCount = (filterType: string) => {
    switch (filterType) {
      case 'pending': return trips.filter(t => t.status === 'menunggu_izin').length;
      case 'approved': return trips.filter(t => ['disetujui', 'sedang_melaut', 'selesai'].includes(t.status)).length;
      case 'rejected': return trips.filter(t => t.status === 'ditolak').length;
      case 'incomplete': return trips.filter(t => {
        const hasDocuments = (t.sertifikatJalan && t.sertifikatJalan.length > 0) || 
                            (t.dokumenKapal && t.dokumenKapal.length > 0);
        return !hasDocuments;
      }).length;
      default: return trips.length;
    }
  };

  const getDocumentCompleteness = (trip: TripDocument) => {
    const hasVesselDocs = (trip.sertifikatJalan && trip.sertifikatJalan.length > 0) || 
                         (trip.dokumenKapal && trip.dokumenKapal.length > 0);
    const hasTripDocs = trip.perizinan?.dokumen && 
                       (trip.perizinan.dokumen.izinMelaut || 
                        trip.perizinan.dokumen.dokumenKapal || 
                        trip.perizinan.dokumen.asuransi);
    
    return {
      vessel: hasVesselDocs,
      trip: hasTripDocs,
      complete: hasVesselDocs && hasTripDocs
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Review Dokumen Trip</h2>
          {getFilterCount('pending') > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                {getFilterCount('pending')} trip perlu review
              </span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all relative ${
              filter === 'pending' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Pending ({getFilterCount('pending')})
            {getFilterCount('pending') > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'approved' 
                ? 'bg-green-500 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Approved ({getFilterCount('approved')})
          </button>
          <button 
            onClick={() => setFilter('rejected')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'rejected' 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Rejected ({getFilterCount('rejected')})
          </button>
          <button 
            onClick={() => setFilter('incomplete')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'incomplete' 
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Incomplete ({getFilterCount('incomplete')})
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
              filter === 'all' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Semua ({getFilterCount('all')})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Memuat dokumen trip...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p>Tidak ada trip untuk filter "{filter}"</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Trip Info</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nahkoda & Kapal</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Dokumen</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map((trip) => {
                const docStatus = getDocumentCompleteness(trip);
                return (
                  <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800">Trip #{trip.id.slice(-6)}</p>
                        <div className="flex items-center space-x-2">
                          <Calendar size={12} className="text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          Dibuat: {new Date(trip.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <User size={12} className="text-slate-400" />
                          <p className="text-sm font-medium">{trip.nahkodaNama}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Ship size={12} className="text-slate-400" />
                          <p className="text-xs text-slate-500">{trip.kapalNama}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Kapal:</span>
                          <div className={`w-3 h-3 rounded-full ${
                            docStatus.vessel ? 'bg-green-500' : 'bg-red-500'
                          }`} title={docStatus.vessel ? 'Dokumen kapal lengkap' : 'Dokumen kapal belum lengkap'}></div>
                          <span className="text-xs text-slate-500">
                            {(trip.sertifikatJalan?.length || 0) + (trip.dokumenKapal?.length || 0)} file
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Trip:</span>
                          <div className={`w-3 h-3 rounded-full ${
                            docStatus.trip ? 'bg-green-500' : 'bg-red-500'
                          }`} title={docStatus.trip ? 'Dokumen trip lengkap' : 'Dokumen trip belum lengkap'}></div>
                          <span className="text-xs text-slate-500">
                            {trip.perizinan?.dokumen ? Object.values(trip.perizinan.dokumen).filter(Boolean).length : 0}/3
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(trip.status)}`}>
                          {getStatusIcon(trip.status)}
                          <span>{trip.status}</span>
                        </div>
                        {trip.perizinan?.tanggalDisetujui && (
                          <p className="text-xs text-green-600">
                            Disetujui: {new Date(trip.perizinan.tanggalDisetujui).toLocaleDateString('id-ID')}
                          </p>
                        )}
                        {trip.perizinan?.tanggalDitolak && (
                          <p className="text-xs text-red-600">
                            Ditolak: {new Date(trip.perizinan.tanggalDitolak).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedTrip(trip)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </button>
                        {trip.status === 'menunggu_izin' && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedTrip(trip);
                                setReviewNote('Dokumen lengkap dan valid');
                              }}
                              className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                              title="Setujui"
                              disabled={actionLoading === trip.id}
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedTrip(trip);
                                setReviewNote('Dokumen tidak lengkap atau tidak valid');
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                              title="Tolak"
                              disabled={actionLoading === trip.id}
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTrip(null)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Review Dokumen Trip</h3>
                  <p className="text-sm text-slate-500">
                    {selectedTrip.kapalNama} - {selectedTrip.nahkodaNama}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle size={20} className="text-slate-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Trip Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Trip ID</p>
                  <p className="font-medium">#{selectedTrip.id.slice(-8)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tanggal Berangkat</p>
                  <p className="font-medium">{new Date(selectedTrip.tanggalBerangkat).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status</p>
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(selectedTrip.status)}`}>
                    {getStatusIcon(selectedTrip.status)}
                    <span>{selectedTrip.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Dibuat</p>
                  <p className="font-medium">{new Date(selectedTrip.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Dokumen Kapal */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center">
                  <Ship size={18} className="mr-2 text-blue-600" /> 
                  Dokumen Kapal (dari Mobile App)
                </h4>
                
                {selectedTrip.sertifikatJalan && selectedTrip.sertifikatJalan.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Sertifikat Jalan ({selectedTrip.sertifikatJalan.length})</p>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTrip.sertifikatJalan.map((cert: any, idx: number) => (
                        <div key={idx} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-green-800">{cert.nama || 'Sertifikat Jalan'}</p>
                              <p className="text-sm text-green-600">{cert.nomorSertifikat}</p>
                              {cert.tanggalBerlaku && (
                                <p className="text-xs text-green-600 mt-1">
                                  Berlaku: {new Date(cert.tanggalBerlaku).toLocaleDateString('id-ID')}
                                </p>
                              )}
                            </div>
                            <CheckCircle size={20} className="text-green-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle size={20} className="text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">Belum ada sertifikat jalan</p>
                        <p className="text-sm text-red-600">Nahkoda perlu upload via mobile app</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedTrip.dokumenKapal && selectedTrip.dokumenKapal.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">Dokumen Lainnya ({selectedTrip.dokumenKapal.length})</p>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedTrip.dokumenKapal.map((doc: any, idx: number) => (
                        <div key={idx} className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-blue-800">{doc.jenis || doc.type || 'Dokumen'}</p>
                              <p className="text-sm text-blue-600">{doc.nomor || doc.number || 'No. tidak tersedia'}</p>
                            </div>
                            <CheckCircle size={20} className="text-blue-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dokumen Trip */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center">
                  <FileText size={18} className="mr-2 text-green-600" /> 
                  Dokumen Perizinan Trip
                </h4>
                
                {selectedTrip.perizinan?.dokumen ? (
                  <div className="grid grid-cols-1 gap-3">
                    <div className={`p-4 border rounded-lg ${
                      selectedTrip.perizinan.dokumen.izinMelaut 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Izin Melaut</span>
                        {selectedTrip.perizinan.dokumen.izinMelaut ? 
                          <CheckCircle size={20} className="text-green-600" /> : 
                          <XCircle size={20} className="text-red-600" />
                        }
                      </div>
                    </div>
                    <div className={`p-4 border rounded-lg ${
                      selectedTrip.perizinan.dokumen.dokumenKapal 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Dokumen Kapal</span>
                        {selectedTrip.perizinan.dokumen.dokumenKapal ? 
                          <CheckCircle size={20} className="text-green-600" /> : 
                          <XCircle size={20} className="text-red-600" />
                        }
                      </div>
                    </div>
                    <div className={`p-4 border rounded-lg ${
                      selectedTrip.perizinan.dokumen.asuransi 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Asuransi</span>
                        {selectedTrip.perizinan.dokumen.asuransi ? 
                          <CheckCircle size={20} className="text-green-600" /> : 
                          <XCircle size={20} className="text-red-600" />
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800">Belum ada data dokumen perizinan</p>
                        <p className="text-sm text-amber-600">Dokumen akan muncul setelah nahkoda mengisi via mobile app</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Riwayat Review */}
              {selectedTrip.perizinan && (selectedTrip.perizinan.tanggalDisetujui || selectedTrip.perizinan.tanggalDitolak) && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800">Riwayat Review</h4>
                  
                  {selectedTrip.perizinan.tanggalDisetujui && (
                    <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-green-800">Trip Disetujui</p>
                          <p className="text-sm text-green-600">
                            {new Date(selectedTrip.perizinan.tanggalDisetujui).toLocaleString('id-ID')}
                          </p>
                          {selectedTrip.perizinan.catatan && (
                            <p className="text-sm text-green-700 mt-2 italic">
                              "{selectedTrip.perizinan.catatan}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedTrip.perizinan.tanggalDitolak && (
                    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <XCircle size={20} className="text-red-600" />
                        <div className="flex-1">
                          <p className="font-medium text-red-800">Trip Ditolak</p>
                          <p className="text-sm text-red-600">
                            {new Date(selectedTrip.perizinan.tanggalDitolak).toLocaleString('id-ID')}
                          </p>
                          {selectedTrip.perizinan.alasanDitolak && (
                            <p className="text-sm text-red-700 mt-2 italic">
                              "{selectedTrip.perizinan.alasanDitolak}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Review Actions */}
              {selectedTrip.status === 'menunggu_izin' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Catatan Review</label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Tambahkan catatan untuk review ini..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100">
              {selectedTrip.status === 'menunggu_izin' ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleReviewTrip(selectedTrip.id, 'reject', reviewNote)}
                    disabled={!reviewNote.trim() || actionLoading === selectedTrip.id}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedTrip.id ? 'Memproses...' : 'Tolak Trip'}
                  </button>
                  <button
                    onClick={() => handleReviewTrip(selectedTrip.id, 'approve', reviewNote)}
                    disabled={!reviewNote.trim() || actionLoading === selectedTrip.id}
                    className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedTrip.id ? 'Memproses...' : 'Setujui Trip'}
                  </button>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => setSelectedTrip(null)}
                    className="px-6 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;