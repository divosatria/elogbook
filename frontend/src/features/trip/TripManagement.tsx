import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CheckCircle, CheckCircle2, XCircle, Clock, Eye, FileText, RefreshCw, Ship, Calendar, Navigation, AlertTriangle, Shield, X, Trash2, MapPin, Smartphone, Droplets, Snowflake, FileCheck, Info, Download, FileSignature, FileSpreadsheet } from 'lucide-react';
import { backendAPI } from '@/services/backendService';
import { socketService } from '@/services/socketService';
import { API_CONFIG, API_ENDPOINTS } from '@/config/urls';
import { getVesselRequirements, validateTripRequirements } from '@/utils/vesselRequirements';
import TripScheduleManagement from '@/features/trip/TripScheduleManagement';
import useRole from '@/utils/useRole';

interface TripManagementProps {
  weather: WeatherData;
}

interface BackendTrip {
  id: string;
  kapal: {
    id: string;
    namaKapal: string;
    nomorRegistrasi: string;
    tipeKapal?: string;
    spesifikasi?: {
      kapasitasBensin: number;
      kapasitasEs: number;
      kapasitasMuatan: number;
      jumlahABK: number;
    };
    dataBahanBakar?: any[];
    iceData?: any[];
    storageData?: any;
    sertifikatJalan?: any;
    dokumen?: any[];
  };
  nahkoda: {
    id: string;
    nama: string;
  };
  tanggalBerangkat: string;
  estimasiPulang: string;
  durasi: number;
  areaTangkap: {
    nama: string;
    zona: string;
  };
  status: string;
  perizinan?: {
    dokumen?: {
      izinMelaut: boolean;
      dokumenKapal: boolean;
      asuransi: boolean;
    };
    dokumentasi?: {
      izinMelaut?: { fileUrl: string; fileName: string };
      dokumenKapal?: { fileUrl: string; fileName: string };
      asuransi?: { fileUrl: string; fileName: string };
    };
    operasional?: {
      kapasitasBensin: number;
      bensinTersedia: number;
      kapasitasEs: number;
      esTersedia: number;
    };
    catatan?: string;
    alasanDitolak?: string;
    tanggalDisetujui?: string;
    tanggalDitolak?: string;
    fuelData?: {
      id: string;
      jenisBahanBakar: string;
      jumlahLiter: number;
      hargaPerLiter: number;
      totalHarga: number;
      tanggalPengisian: string;
      lokasiPengisian: string;
      keterangan?: string;
      buktiFileUrl?: string;
      uploadedAt: string;
      uploadedBy: string;
    }[];
    iceData?: {
      id: string;
      jenisEs: string;
      jumlahKg: number;
      hargaPerKg: number;
      totalHarga: number;
      tanggalPembelian: string;
      lokasiPembelian: string;
      keterangan?: string;
      buktiFileUrl?: string;
      uploadedAt: string;
      uploadedBy: string;
    }[];
  };
  // Additional properties used in UI
  dokumen?: any[];
  zona?: { name: string };
  waktuBerangkat?: string;
  tracking?: any;
  currentLocation?: any;
  laporan?: any;
  estimasiBerat?: number;
  beratAktual?: number;
  biaya?: any;
  catatan?: string;
  createdAt: string;
}

const TripManagement: React.FC<TripManagementProps> = ({ weather }) => {
  const { canWrite, canDelete } = useRole();
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<BackendTrip[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('semua');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<BackendTrip | null>(null);
  const [tripFishingPoints, setTripFishingPoints] = useState<any[]>([]);
  const [loadingFishingPoints, setLoadingFishingPoints] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showScheduleManagement, setShowScheduleManagement] = useState(false);
  const [activeScheduleTab, setActiveScheduleTab] = useState('trips');
  const [vessels, setVessels] = useState([]);
  const [users, setUsers] = useState<any[]>([]);
  const [captains, setCaptains] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<{tripId: string, action: 'approve' | 'reject', tripName: string} | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [previewDoc, setPreviewDoc] = useState<{url: string, name: string, type: 'pdf' | 'image'} | null>(null);
  const [currentTripPage, setCurrentTripPage] = useState(1);
  const tripsPerPage = 5;

  useEffect(() => {
    loadTrips();
    loadVesselsAndCaptains();
    
    // Setup real-time updates
    const cleanup = socketService.onTripStatusUpdate((updatedTrip) => {
      setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
    });
    
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const loadVesselsAndCaptains = async () => {
    try {
      const [vesselsData, usersData] = await Promise.all([
        backendAPI.getVessels(),
        backendAPI.getUsers()
      ]);
      setVessels((vesselsData as any).data || vesselsData || []);
      const allUsers = (usersData as any).data || usersData || [];
      setUsers(allUsers);
      setCaptains(allUsers.filter((u: any) => u.role === 'nahkoda'));
    } catch (error) {
      console.error('Error loading vessels and captains:', error);
    }
  };

  const loadTrips = async () => {
    try {
      setIsLoading(true);
      console.log('ðŸ”„ Loading trips...');
      
      const response = await backendAPI.getTrips();
      console.log('ðŸ“Š Trips response:', response);
      
      const tripsData = response.data || response || [];
      console.log('ðŸ“‹ Trips data:', tripsData);
      
      // Debug: Log vessel fuel/ice data for first trip
      if (tripsData.length > 0 && tripsData[0].kapal) {
        const firstVessel = tripsData[0].kapal;
        console.log('ðŸ” First vessel fuel/ice data:');
        console.log('- dataBahanBakar:', firstVessel.dataBahanBakar);
        console.log('- storageData:', firstVessel.storageData);
        console.log('- spesifikasi:', firstVessel.spesifikasi);
      }
      
      // Log individual trip statuses
      tripsData.forEach((trip: any, index: number) => {
        console.log(`ðŸ“ Trip ${index + 1}:`, {
          id: trip.id,
          name: trip.kapal?.namaKapal,
          status: trip.status
        });
      });
      
      setTrips(tripsData);
      applyFilter(tripsData, activeFilter);
      
      console.log('âœ… Trips loaded successfully, count:', tripsData.length);
    } catch (error) {
      console.error('âŒ Load trips error:', error);
      setTrips([]);
      setFilteredTrips([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (tripsData: BackendTrip[], filter: string) => {
    let filtered = tripsData;
    
    console.log('ðŸ” Applying filter:', filter, 'to', tripsData.length, 'trips');
    
    switch (filter) {
      case 'menunggu':
        filtered = tripsData.filter(trip => trip.status === 'menunggu_izin');
        console.log('ðŸ” Menunggu filter result:', filtered.length);
        break;
      case 'berjalan':
        filtered = tripsData.filter(trip => 
          trip.status === 'disetujui' || trip.status === 'sedang_melaut'
        );
        console.log('ðŸ” Berjalan filter result:', filtered.length);
        break;
      case 'selesai':
        filtered = tripsData.filter(trip => 
          trip.status === 'selesai' || trip.status === 'ditolak' || trip.status === 'darurat'
        );
        console.log('ðŸ” Selesai filter result:', filtered.length);
        break;
      default:
        filtered = tripsData;
        console.log('ðŸ” Semua filter result:', filtered.length);
    }
    
    console.log('ðŸ” Final filtered trips:', filtered.map(t => ({ id: t.id, status: t.status })));
    setFilteredTrips(filtered);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentTripPage(1);
    applyFilter(trips, filter);
  };

  const handleOpenDetail = async (trip: BackendTrip) => {
    console.log('ðŸ” Opening trip detail:', trip.id, 'Kapal ID:', trip.kapal?.id);
    
    // Fetch fresh trip data with vessel details
    try {
      const freshTrip = (await backendAPI.request(`/api/trip/${trip.id}`)) as any;
      if (freshTrip.success && freshTrip.data) {
        setSelectedTrip(freshTrip.data);
      } else {
        setSelectedTrip(trip);
      }
    } catch (error) {
      setSelectedTrip(trip);
    }

    // Fetch fishing points untuk trip ini
    setLoadingFishingPoints(true);
    setTripFishingPoints([]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_ENDPOINTS.FISHING_POINTS.LIST}?tripId=${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTripFishingPoints(data.data || []);
      }
    } catch (e) {
      setTripFishingPoints([]);
    } finally {
      setLoadingFishingPoints(false);
    }
  };

  const handleUpdateStatus = async (tripId: string, status: string, catatan?: string) => {
    try {
      setActionLoading(tripId);
      console.log('ðŸ”„ Updating trip status:', { tripId, status, catatan });
      
      const response = await backendAPI.updateTripStatus(tripId, status, catatan);
      console.log('âœ… Update response:', response);
      
      // Refresh trips data
      await loadTrips();
      
      // Close modal
      setSelectedTrip(null);
      
      console.log('âœ… Trip status updated successfully');
    } catch (error) {
      console.error('âŒ Update status error:', error);
      alert('Gagal mengupdate status trip: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovalAction = (tripId: string, action: 'approve' | 'reject', tripName: string) => {
    setApprovalAction({ tripId, action, tripName });
    setApprovalNote(action === 'approve' ? 'Dokumen lengkap dan valid' : 'Dokumen tidak lengkap');
    setShowApprovalModal(true);
  };

  const confirmApprovalAction = async () => {
    if (!approvalAction) return;
    
    const status = approvalAction.action === 'approve' ? 'disetujui' : 'ditolak';
    await handleUpdateStatus(approvalAction.tripId, status, approvalNote);
    
    setShowApprovalModal(false);
    setApprovalAction(null);
    setApprovalNote('');
  };

  const handleSelectTrip = (tripId: string, checked: boolean) => {
    if (checked) {
      setSelectedTripIds(prev => [...prev, tripId]);
    } else {
      setSelectedTripIds(prev => prev.filter(id => id !== tripId));
    }
  };

  const handleSelectAllPendingTrips = (checked: boolean) => {
    if (checked) {
      const pendingTripIds = filteredTrips
        .filter(trip => trip.status === 'menunggu_izin' || trip.status === 'menunggu_dokumen')
        .map(trip => trip.id);
      setSelectedTripIds(pendingTripIds);
    } else {
      setSelectedTripIds([]);
    }
  };

  const handleBulkApproval = (action: 'approve' | 'reject') => {
    setBulkAction(action);
    setApprovalNote(action === 'approve' ? 'Bulk approval - dokumen lengkap' : 'Bulk rejection - dokumen tidak lengkap');
    setShowBulkApprovalModal(true);
  };

  const confirmBulkApproval = async () => {
    const status = bulkAction === 'approve' ? 'disetujui' : 'ditolak';
    
    for (const tripId of selectedTripIds) {
      await handleUpdateStatus(tripId, status, approvalNote);
    }
    
    setShowBulkApprovalModal(false);
    setSelectedTripIds([]);
    setApprovalNote('');
  };

  const handleDocumentApproval = async (tripId: string, documentType: string, approved: boolean) => {
    try {
      setActionLoading(tripId);
      console.log('ðŸ“‹ Approving document:', { tripId, documentType, approved });
      
      const response = await backendAPI.approveDocument(tripId, documentType, approved, 
        approved ? `Dokumen ${documentType} disetujui` : `Dokumen ${documentType} ditolak`
      );
      console.log('âœ… Document approval response:', response);
      
      // Refresh trips data to get updated document status
      await loadTrips();
      
      // Update selected trip if it's the same one
      if (selectedTrip && selectedTrip.id === tripId) {
        const updatedTrip = trips.find(t => t.id === tripId);
        if (updatedTrip) {
          setSelectedTrip(updatedTrip);
        }
      }
      
      console.log('âœ… Document approval completed');
    } catch (error) {
      console.error('âŒ Document approval error:', error);
      alert('Gagal memproses persetujuan dokumen: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTrip = async (tripId: string, tripName: string) => {
    if (!confirm(`Yakin ingin menghapus trip "${tripName}"?\n\nPeringatan: Data trip, dokumen, dan riwayat akan dihapus permanen!`)) {
      return;
    }

    try {
      setActionLoading(tripId);
      console.log('ðŸ—‘ï¸ Deleting trip:', { tripId, tripName });
      
      // Debug: Check token
      const token = localStorage.getItem('token');
      console.log('ðŸ”‘ Token available:', !!token);
      console.log('ðŸ”‘ Token length:', token?.length || 0);
      
      const response = await backendAPI.deleteTrip(tripId);
      console.log('âœ… Delete response:', response);
      
      // Refresh trips data
      await loadTrips();
      
      alert(`Trip "${tripName}" berhasil dihapus!`);
      
      console.log('âœ… Trip deleted successfully');
    } catch (error) {
      console.error('âŒ Delete trip error:', error);
      
      // Parse error message from backend
      let errorMessage = 'Gagal menghapus trip';
      
      if (error.message.includes('400')) {
        // Extract message from backend response
        const match = error.message.match(/"message":"([^"]+)"/);
        if (match) {
          errorMessage = match[1];
        } else {
          errorMessage = 'Trip tidak dapat dihapus. Periksa status trip.';
        }
      } else if (error.message.includes('404')) {
        errorMessage = 'Trip tidak ditemukan atau sudah dihapus.';
      } else if (error.message.includes('401') || error.message.includes('UNAUTHORIZED')) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang.';
        window.location.href = '/login';
        return;
      } else if (error.message.includes('NETWORK_ERROR')) {
        errorMessage = 'Koneksi ke server bermasalah. Periksa koneksi internet.';
      }
      
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'menunggu':
        return trips.filter(trip => trip.status === 'menunggu_izin').length;
      case 'berjalan':
        return trips.filter(trip => 
          trip.status === 'disetujui' || trip.status === 'sedang_melaut'
        ).length;
      case 'selesai':
        return trips.filter(trip => 
          trip.status === 'selesai' || trip.status === 'ditolak' || trip.status === 'darurat'
        ).length;
      default:
        return trips.length;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'menunggu_izin': return 'bg-amber-100 text-amber-700';
      case 'disetujui': return 'bg-blue-100 text-blue-700';
      case 'sedang_melaut': return 'bg-teal-100 text-teal-700';
      case 'selesai': return 'bg-green-100 text-green-700';
      case 'ditolak': return 'bg-red-100 text-red-700';
      case 'darurat': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'menunggu_izin': return 'Menunggu Izin';
      case 'disetujui': return 'Disetujui';
      case 'sedang_melaut': return 'Sedang Melaut';
      case 'selesai': return 'Selesai';
      case 'ditolak': return 'Ditolak';
      case 'darurat': return 'Darurat';
      default: return status;
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportTripPDF = async (trip: BackendTrip) => {
    try {
      const signatureSettings = await backendAPI.getSignatureSettings();
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      // === HEADER ===
      doc.setFontSize(13).setFont('helvetica', 'bold');
      doc.text('KEMENTERIAN KELAUTAN DAN PERIKANAN', pageW / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(11);
      doc.text('DIREKTORAT JENDERAL PERIKANAN TANGKAP', pageW / 2, y, { align: 'center' });
      y += 5;
      doc.setFontSize(8).setFont('helvetica', 'normal');
      doc.text('Sistem E-Logbook Maritime', pageW / 2, y, { align: 'center' });
      y += 4;
      doc.setLineWidth(0.8).setDrawColor(30, 41, 59);
      doc.line(14, y, pageW - 14, y);
      doc.setLineWidth(0.3);
      doc.line(14, y + 1.5, pageW - 14, y + 1.5);
      y += 8;

      // === JUDUL ===
      doc.setFontSize(14).setFont('helvetica', 'bold');
      doc.text('SURAT KETERANGAN PERIZINAN TRIP', pageW / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(9).setFont('helvetica', 'normal');
      const tripNo = `No: SKP-${trip.id}/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
      doc.text(tripNo, pageW / 2, y, { align: 'center' });
      y += 3;
      doc.setDrawColor(200, 200, 200).setLineWidth(0.3);
      doc.line(14, y, pageW - 14, y);
      y += 6;

      // === STATUS BADGE ===
      const statusLabel = getStatusText(trip.status);
      const statusColors: Record<string, [number, number, number]> = {
        selesai: [16, 185, 129],
        disetujui: [59, 130, 246],
        sedang_melaut: [20, 184, 166],
        ditolak: [239, 68, 68],
        menunggu_izin: [245, 158, 11],
      };
      const [r, g, b] = statusColors[trip.status] || [100, 116, 139];
      doc.setFillColor(r, g, b);
      doc.roundedRect(14, y, 40, 7, 2, 2, 'F');
      doc.setTextColor(255, 255, 255).setFontSize(8).setFont('helvetica', 'bold');
      doc.text(statusLabel.toUpperCase(), 34, y + 4.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 12;

      // === INFO TRIP ===
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('A. Informasi Trip', 14, y);
      y += 2;

      const pDocs = trip.perizinan?.dokumen;
      const docCount = (pDocs?.izinMelaut ? 1 : 0) + (pDocs?.dokumenKapal ? 1 : 0) + (pDocs?.asuransi ? 1 : 0);

      autoTable(doc, {
        startY: y,
        body: [
          ['Nama Kapal', trip.kapal.namaKapal],
          ['No. Registrasi', trip.kapal.nomorRegistrasi],
          ['Nahkoda', trip.nahkoda?.nama || '-'],
          ['Tanggal Berangkat', new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
          ['Estimasi Pulang', new Date(trip.estimasiPulang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })],
          ['Durasi', `${trip.durasi} hari`],
          ['Area Tangkap', trip.areaTangkap?.nama || '-'],
          ['Zona', trip.areaTangkap?.zona || '-'],
          ['Status Trip', statusLabel],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // === DOKUMEN PERIZINAN ===
      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('B. Status Dokumen Perizinan', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        head: [['Dokumen', 'Status', 'Keterangan']],
        body: [
          ['Izin Melaut', pDocs?.izinMelaut ? 'âœ“ VALID' : 'âœ— PENDING', pDocs?.izinMelaut ? 'Dokumen telah diverifikasi' : 'Menunggu verifikasi'],
          ['Dokumen Kapal', pDocs?.dokumenKapal ? 'âœ“ VALID' : 'âœ— PENDING', pDocs?.dokumenKapal ? 'Dokumen telah diverifikasi' : 'Menunggu verifikasi'],
          ['Asuransi', pDocs?.asuransi ? 'âœ“ VALID' : 'âœ— PENDING', pDocs?.asuransi ? 'Dokumen telah diverifikasi' : 'Menunggu verifikasi'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2.5 },
        columnStyles: {
          1: {
            fontStyle: 'bold',
            textColor: docCount >= 3 ? [16, 185, 129] : [245, 158, 11]
          }
        },
        foot: [[`Total Dokumen Valid: ${docCount}/3`, '', docCount >= 3 ? 'Semua dokumen lengkap' : 'Dokumen belum lengkap']],
        footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // === OPERASIONAL ===
      const fuelData = trip.perizinan?.fuelData || (trip.kapal.dataBahanBakar as any[]) || [];
      let iceArr: any[] = [];
      if (Array.isArray((trip.kapal as any).iceData)) iceArr = (trip.kapal as any).iceData;
      else if (Array.isArray(trip.kapal.storageData)) iceArr = trip.kapal.storageData as any[];
      else if ((trip.kapal.storageData as any)?.iceData) iceArr = (trip.kapal.storageData as any).iceData;
      const iceData = trip.perizinan?.iceData || iceArr;

      const totalFuel = fuelData.reduce((s: number, f: any) => s + (f.jumlahLiter || 0), 0);
      const totalIce = iceData.reduce((s: number, i: any) => s + (i.jumlahKg || i.jumlahEs || 0), 0);

      if (y > 220) { doc.addPage(); y = 20; }

      doc.setFontSize(10).setFont('helvetica', 'bold');
      doc.text('C. Kesiapan Operasional', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        body: [
          ['Total Bahan Bakar', `${totalFuel} Liter`, `Kapasitas: ${trip.kapal.spesifikasi?.kapasitasBensin || '-'} L`],
          ['Total Es/Storage', `${totalIce} Kg`, `Kapasitas: ${trip.kapal.spesifikasi?.kapasitasEs || '-'} Kg`],
          ['Jumlah Pengisian BBM', `${fuelData.length} transaksi`, ''],
          ['Jumlah Pembelian Es', `${iceData.length} transaksi`, ''],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 40 } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;

      // === RIWAYAT APPROVAL ===
      if (trip.perizinan?.tanggalDisetujui || trip.perizinan?.tanggalDitolak || trip.perizinan?.catatan) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.text('D. Riwayat Persetujuan', 14, y);
        y += 2;

        const approvalRows: string[][] = [];
        if (trip.perizinan.tanggalDisetujui) {
          approvalRows.push(['Disetujui', new Date(trip.perizinan.tanggalDisetujui).toLocaleString('id-ID'), trip.perizinan.catatan || '-']);
        }
        if (trip.perizinan.tanggalDitolak) {
          approvalRows.push(['Ditolak', new Date(trip.perizinan.tanggalDitolak).toLocaleString('id-ID'), trip.perizinan.alasanDitolak || '-']);
        }
        if (approvalRows.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [['Aksi', 'Waktu', 'Catatan']],
            body: approvalRows,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
            styles: { fontSize: 9, cellPadding: 2.5 },
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      // === CATATAN ===
      if (trip.catatan) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(10).setFont('helvetica', 'bold').text('E. Catatan', 14, y);
        y += 5;
        doc.setFontSize(9).setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(`"${trip.catatan}"`, pageW - 28);
        doc.text(splitNotes, 14, y);
        y += splitNotes.length * 5 + 4;
      }

      // === TANDA TANGAN ===
      if (y > 230) { doc.addPage(); y = 20; }
      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const sigX = pageW - 80;
      doc.setFontSize(10).setFont('helvetica', 'normal');
      doc.text(`Jakarta, ${dateStr}`, sigX, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.text(signatureSettings.position || 'Kepala Dinas', sigX, y);
      y += 30;
      doc.setFont('helvetica', 'bold');
      doc.text(signatureSettings.name || '_______________________', sigX, y);
      if (signatureSettings.name) {
        doc.setLineWidth(0.3);
        doc.line(sigX, y + 1, sigX + doc.getTextWidth(signatureSettings.name), y + 1);
      }

      // === FOOTER SEMUA HALAMAN ===
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(150);
        doc.text('E-Logbook Maritime System â€” Dokumen Resmi', 14, doc.internal.pageSize.getHeight() - 8);
        doc.text(`Hal ${i} dari ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
        doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageW / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
      }
      doc.setTextColor(0, 0, 0);

      // === HASIL TANGKAP PER TITIK JARING ===
      if (tripFishingPoints.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.text('F. Hasil Tangkap per Titik Jaring', 14, y);
        y += 4;

        const retrievalPoints = tripFishingPoints.filter((p: any) => p.actionType === 'net_retrieved');

        if (retrievalPoints.length === 0) {
          doc.setFontSize(9).setFont('helvetica', 'italic');
          doc.text('Belum ada data pengangkatan jaring', 14, y + 4);
          y += 12;
        } else {
          for (const [pi, point] of (retrievalPoints as any[]).entries()) {
            if (y > 240) { doc.addPage(); y = 20; }
            const catches: any[] = (point as any).hasilTangkap || [];
            const totalBerat = catches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
            const totalNilai = catches.reduce((s: number, c: any) => s + (parseFloat(c.totalHarga) || 0), 0);

            doc.setFontSize(8).setFont('helvetica', 'bold');
            const loc = (point as any).location;
            const depth = (point as any).depthMeters ? ` | Kedalaman: ${(point as any).depthMeters}m` : '';
            doc.text(
              `Titik ${pi + 1} â€” ${new Date((point as any).timestamp).toLocaleString('id-ID')} | ${loc?.lat?.toFixed(5)}, ${loc?.lng?.toFixed(5)}${depth}`,
              14, y + 4
            );
            y += 7;

            if (catches.length > 0) {
              autoTable(doc, {
                startY: y,
                head: [['No', 'Jenis Ikan', 'Berat (kg)', 'Harga/kg', 'Total Nilai']],
                body: catches.map((c: any, ci: number) => [
                  ci + 1,
                  c.jenisIkan,
                  parseFloat(c.beratKg).toFixed(2),
                  c.hargaPerKg ? `Rp ${parseFloat(c.hargaPerKg).toLocaleString('id-ID')}` : '-',
                  c.totalHarga ? `Rp ${parseFloat(c.totalHarga).toLocaleString('id-ID')}` : '-'
                ]),
                foot: [['', 'TOTAL', totalBerat.toFixed(2), '', totalNilai > 0 ? `Rp ${totalNilai.toLocaleString('id-ID')}` : '-']],
                theme: 'striped',
                headStyles: { fillColor: [234, 88, 12], fontSize: 8, fontStyle: 'bold' },
                footStyles: { fillColor: [254, 215, 170], fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 50 } },
                margin: { left: 14, right: 14 }
              });
              y = (doc as any).lastAutoTable.finalY + 4;
            } else {
              doc.setFontSize(8).setFont('helvetica', 'italic');
              doc.text('  Tidak ada data tangkapan di titik ini', 14, y + 3);
              y += 8;
            }
          }

          // Rekapitulasi total semua tangkapan
          if (y > 230) { doc.addPage(); y = 20; }
          const allCatches = (retrievalPoints as any[]).flatMap((p: any) => p.hasilTangkap || []);
          const grandTotalBerat = allCatches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
          const grandTotalNilai = allCatches.reduce((s: number, c: any) => s + (parseFloat(c.totalHarga) || 0), 0);

          // Group by jenis ikan
          const byJenis: Record<string, { berat: number; nilai: number }> = {};
          allCatches.forEach((c: any) => {
            if (!byJenis[c.jenisIkan]) byJenis[c.jenisIkan] = { berat: 0, nilai: 0 };
            byJenis[c.jenisIkan].berat += parseFloat(c.beratKg) || 0;
            byJenis[c.jenisIkan].nilai += parseFloat(c.totalHarga) || 0;
          });

          doc.setFontSize(9).setFont('helvetica', 'bold');
          doc.text('Rekapitulasi Total Hasil Tangkap', 14, y + 4);
          y += 7;

          autoTable(doc, {
            startY: y,
            head: [['Jenis Ikan', 'Total Berat (kg)', 'Total Nilai']],
            body: Object.entries(byJenis).map(([jenis, data]) => [
              jenis,
              data.berat.toFixed(2),
              data.nilai > 0 ? `Rp ${data.nilai.toLocaleString('id-ID')}` : '-'
            ]),
            foot: [['GRAND TOTAL', grandTotalBerat.toFixed(2), grandTotalNilai > 0 ? `Rp ${grandTotalNilai.toLocaleString('id-ID')}` : '-']],
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], fontSize: 9, fontStyle: 'bold' },
            footStyles: { fillColor: [241, 245, 249], fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 9, cellPadding: 2.5 },
            margin: { left: 14, right: 14 }
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
      }

      doc.save(`Perizinan_Trip_${trip.kapal.namaKapal.replace(/\s/g, '_')}_${trip.id}.pdf`);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Gagal membuat PDF perizinan.');
    }
  };

  // â”€â”€ Export Logbook KKP (PDF & Excel) â€” format sesuai PERMEN-KP 33/2021 â”€â”€
  const handleExportLogbookKKP = async (trip: BackendTrip, format: 'pdf' | 'excel') => {
    try {
      // Fetch data logbook lengkap dari backend
      const res = await backendAPI.getTripLogbookData(trip.id);
      const logbook = (res as any).data;
      const kapal = logbook.trip.kapal || {};
      const nahkoda = logbook.trip.nahkoda || {};
      const catches: any[] = logbook.catches || [];
      const fishingPoints: any[] = logbook.fishingPoints || [];

      // Kelompokkan catches berdasarkan tanggal (per hari = 1 baris logbook)
      // Setiap fishing point net_retrieved = 1 baris aktivitas
      const retrievalPoints = fishingPoints.filter((p: any) => p.actionType === 'net_retrieved');
      const deployPoints = fishingPoints.filter((p: any) => p.actionType === 'net_deployed');

      // Buat baris aktivitas: gabungkan deploy + retrieval per pasangan
      // Jika tidak ada fishing points, buat baris dari catches langsung
      const rows: any[] = [];

      if (retrievalPoints.length > 0) {
        retrievalPoints.forEach((rp: any, idx: number) => {
          const dp = deployPoints[idx] || null;
          const rpCatches = catches.filter((c: any) => {
            const ids: number[] = rp.hasilTangkapIds || (rp.hasilTangkapId ? [rp.hasilTangkapId] : []);
            return ids.includes(c.id);
          });
          rows.push({ deploy: dp, retrieval: rp, catches: rpCatches });
        });
      } else if (catches.length > 0) {
        // Fallback: 1 baris per catch
        catches.forEach((c: any) => {
          rows.push({ deploy: null, retrieval: null, catches: [c] });
        });
      } else {
        rows.push({ deploy: null, retrieval: null, catches: [] });
      }

      // Kumpulkan semua jenis ikan unik
      const allFishTypes = Array.from(new Set(catches.map((c: any) => c.jenisIkan as string)));
      // Ambil max 10 jenis ikan (sesuai format KKP)
      const fishCols = allFishTypes.slice(0, 10);

      const tahun = new Date(logbook.trip.tanggalBerangkat).getFullYear();
      const tripKe = logbook.trip.id;
      const pelabuhan = logbook.trip.harborZone?.name || '-';

      if (format === 'excel') {
        // â”€â”€ EXCEL FORMAT LOGBOOK KKP â”€â”€
        const wb = XLSX.utils.book_new();
        const aoa: any[][] = [];

        // Baris 1-2: Header KKP
        aoa.push(['KEMENTERIAN KELAUTAN DAN PERIKANAN â€” PERMEN-KP 33 TAHUN 2021']);
        aoa.push(['LOG BOOK PENANGKAPAN IKAN â€” Rawai Tuna dan Pancing Ulur Tuna']);
        aoa.push([]);

        // Identitas kapal (field 1-17)
        aoa.push(['1. Nama Kapal', kapal.namaKapal || '-', '', '2. Pemilik/Operator', kapal.pemilik || '-']);
        aoa.push(['3. No. Perizinan', kapal.nomorRegistrasi || '-', '', '4. Transmitter SPKP', '-']);
        aoa.push(['5. Tahun', tahun, '', '6. Trip ke-', tripKe]);
        aoa.push(['7. Jenis/Kode API', kapal.alatTangkap || '-', '', '8. Gross Tonnage', kapal.beratKapal || '-']);
        aoa.push(['9. Panjang Kapal/LOA', kapal.panjangKapal ? `${kapal.panjangKapal} m` : '-', '', '10. Daya/Hlk', kapal.mesin?.daya || '-']);
        aoa.push(['11. Radio/MMSI/WPPNRI', '-', '', '12. Daerah Penangkapan', logbook.trip.areaTangkap?.nama || '-']);
        aoa.push(['13. Tanda Pengenal', kapal.nomorKapal || '-', '', '14. Nahkoda', nahkoda.nama || '-']);
        aoa.push(['15. Pelabuhan Keberangkatan', pelabuhan, '', '16. Pelabuhan Pendaratan', pelabuhan]);
        aoa.push(['17. Tgl Berangkat/Pendaratan',
          `${new Date(logbook.trip.tanggalBerangkat).toLocaleDateString('id-ID')} / ${logbook.trip.tanggalPulangAktual ? new Date(logbook.trip.tanggalPulangAktual).toLocaleDateString('id-ID') : new Date(logbook.trip.estimasiPulang).toLocaleDateString('id-ID')}`
        ]);
        aoa.push([]);

        // Header tabel aktivitas
        const headerRow1 = [
          'Tanggal (22)', 'Kode Aktivitas (23)',
          'Lintang', 'U/S', 'Bujur', 'T/B', 'Setting (DD/MM)',
          'Mulai Setting', 'Hauling',
          'Jml Mata Pancing (26)', 'Jarak Antar Pancing (27)',
        ];
        fishCols.forEach((f, i) => { headerRow1.push(`${f} - Ekor`); headerRow1.push(`${f} - KG`); });
        headerRow1.push('Burung Laut - Ekor', 'Penyu - Ekor', 'Hiu - Ekor', 'Mamalia - Ekor');
        headerRow1.push('Ikan Lain - Ekor', 'Ikan Lain - KG');
        aoa.push(headerRow1);

        // Baris data
        rows.forEach(({ deploy, retrieval, catches: rowCatches }) => {
          const tgl = retrieval
            ? new Date(retrieval.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
            : (rowCatches[0] ? new Date(rowCatches[0].tanggalTangkap).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) : '-');
          const loc = retrieval?.location || deploy?.location || {};
          const lat = loc.lat ? Math.abs(loc.lat).toFixed(4) : '-';
          const latDir = loc.lat ? (loc.lat >= 0 ? 'U' : 'S') : '-';
          const lng = loc.lng ? Math.abs(loc.lng).toFixed(4) : '-';
          const lngDir = loc.lng ? (loc.lng >= 0 ? 'T' : 'B') : '-';
          const settingDate = deploy ? new Date(deploy.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) : '-';
          const settingTime = deploy ? new Date(deploy.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
          const haulingTime = retrieval ? new Date(retrieval.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

          const row: any[] = [
            tgl, retrieval ? '2' : '1', lat, latDir, lng, lngDir, settingDate,
            settingTime, haulingTime, '-', '-',
          ];

          // Isi kolom per jenis ikan
          fishCols.forEach(fishType => {
            const c = rowCatches.find((x: any) => x.jenisIkan === fishType);
            row.push(c ? (c.quantity || '') : '');   // ekor dari field quantity
            row.push(c ? (c.beratKg || 0) : '');
          });

          // ERTS kosong
          row.push('', '', '', '');
          // Ikan lain kosong
          row.push('', '');
          aoa.push(row);
        });

        // Baris total
        const totalRow: any[] = ['', 'TOTAL', '', '', '', '', '', '', '', '', ''];
        fishCols.forEach(fishType => {
          const total = catches.filter((c: any) => c.jenisIkan === fishType).reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
          totalRow.push('');
          totalRow.push(total.toFixed(2));
        });
        totalRow.push('', '', '', '', '', '');
        aoa.push(totalRow);

        aoa.push([]);
        aoa.push(['31. Jumlah Tangkapan Halaman ini', catches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0).toFixed(2), 'kg']);
        aoa.push(['34. Nama Nakhoda', nahkoda.nama || '-']);

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [14, 16, 10, 5, 10, 5, 12, 10, 10, 14, 14,
          ...fishCols.flatMap(() => [8, 8]),
          8, 8, 8, 8, 8, 8
        ].map(w => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, ws, 'Logbook KKP');
        XLSX.writeFile(wb, `Logbook_KKP_${kapal.namaKapal?.replace(/\s/g, '_')}_Trip${tripKe}.xlsx`);

      } else {
        // â”€â”€ PDF FORMAT LOGBOOK KKP â”€â”€
        const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
        const pageW = doc.internal.pageSize.getWidth();
        let y = 10;

        // Header
        doc.setFontSize(9).setFont('helvetica', 'bold');
        doc.text('Kementerian Kelautan dan Perikanan Â· PERMEN-KP 33 Tahun 2021', pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(7).setFont('helvetica', 'normal');
        doc.text('Pengawakan Kapal Perikanan â€” Bentuk dan Format', pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(13).setFont('helvetica', 'bold');
        doc.text('LOG BOOK PENANGKAPAN IKAN', pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(8).setFont('helvetica', 'italic');
        doc.text('Alat Penangkapan Ikan Rawai Tuna dan Pancing Ulur Tuna', pageW / 2, y, { align: 'center' });
        y += 3;
        doc.setLineWidth(0.8).setDrawColor(0);
        doc.line(10, y, pageW - 10, y);
        y += 5;

        // Identitas kapal â€” 3 baris grid
        doc.setFontSize(7).setFont('helvetica', 'normal');
        const idFields = [
          [`1. Nama Kapal: ${kapal.namaKapal || '-'}`, `2. Pemilik/Operator: ${kapal.pemilik || '-'}`, `3. No. Perizinan: ${kapal.nomorRegistrasi || '-'}`, `4. Transmitter SPKP: -`, `5. Tahun: ${tahun}`, `6. Trip ke-: ${tripKe}`],
          [`7. Jenis/Kode API: ${kapal.alatTangkap || '-'}`, `8. GT: ${kapal.beratKapal || '-'}`, `9. LOA: ${kapal.panjangKapal ? kapal.panjangKapal + ' m' : '-'}`, `10. Daya: ${kapal.mesin?.daya || '-'}`, `11. Radio/MMSI: -`, `12. Daerah: ${logbook.trip.areaTangkap?.nama || '-'}`],
          [`13. Tanda Pengenal: ${kapal.nomorKapal || '-'}`, `14. Nahkoda: ${nahkoda.nama || '-'}`, `15. Pel. Berangkat: ${pelabuhan}`, `16. Pel. Pendaratan: ${pelabuhan}`, `17. Tgl: ${new Date(logbook.trip.tanggalBerangkat).toLocaleDateString('id-ID')} / ${logbook.trip.tanggalPulangAktual ? new Date(logbook.trip.tanggalPulangAktual).toLocaleDateString('id-ID') : new Date(logbook.trip.estimasiPulang).toLocaleDateString('id-ID')}`],
        ];
        idFields.forEach(rowFields => {
          const colW = (pageW - 20) / rowFields.length;
          rowFields.forEach((txt, ci) => {
            doc.rect(10 + ci * colW, y, colW, 7);
            doc.text(txt, 11 + ci * colW, y + 4.5, { maxWidth: colW - 2 });
          });
          y += 7;
        });
        y += 2;

        // Tabel aktivitas â€” struktur sesuai format KKP (Tuna, Cakalang, Lain, Total, Bycatch)
        // Header 3 baris: Row1=grup, Row2=subgrup, Row3=Ekor/KG
        const tableHead = [
          [
            { content: 'Tanggal', rowSpan: 3 },
            { content: 'Kode', rowSpan: 3 },
            { content: 'Posisi', colSpan: 2 },
            { content: 'Waktu', rowSpan: 3 },
            { content: 'Jml Pancing', rowSpan: 3 },
            { content: 'Komposisi Hasil Tangkapan', colSpan: 10 },
            { content: 'Spesies Terkait', colSpan: 6 },
            { content: 'Ikan Lainnya', colSpan: 3 },
          ],
          [
            { content: 'Lintang', rowSpan: 2 },
            { content: 'Bujur', rowSpan: 2 },
            { content: 'Tuna', colSpan: 2 },
            { content: 'Cakalang', colSpan: 2 },
            { content: 'Lain', colSpan: 2 },
            { content: 'Total', colSpan: 2 },
            { content: 'Bycatch', colSpan: 2 },
            { content: 'Penyu', colSpan: 2 },
            { content: 'Hiu', colSpan: 2 },
            { content: 'Mamalia', colSpan: 2 },
            { content: 'Nama', rowSpan: 2 },
            { content: 'Ekor', rowSpan: 2 },
            { content: 'KG', rowSpan: 2 },
          ],
          [
            'Ekor', 'KG', 'Ekor', 'KG', 'Ekor', 'KG',
            'Ekor', 'KG', 'Ekor', 'KG',
            'Ekor', 'KG', 'Ekor', 'KG', 'Ekor', 'KG',
          ],
        ];

        // Helper: ambil quantity dari catch (extendedData atau field langsung)
        const getQty = (c: any): string => {
          const q = c.quantity ?? c.extendedData?.quantity ?? null;
          return q != null && q > 0 ? String(q) : '';
        };
        const getKg = (c: any): string => {
          const kg = parseFloat(c.beratKg || c.beratMobile || 0);
          return kg > 0 ? kg.toFixed(1) : '';
        };

        const tableBody = rows.map(({ deploy, retrieval, catches: rowCatches }) => {
          const tgl = retrieval
            ? new Date(retrieval.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
            : (rowCatches[0] ? new Date(rowCatches[0].tanggalTangkap).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) : '-');
          const loc = retrieval?.location || deploy?.location || {};
          const lat = loc.lat ? `${Math.abs(loc.lat).toFixed(3)} ${loc.lat >= 0 ? 'U' : 'S'}` : '-';
          const lng = loc.lng ? `${Math.abs(loc.lng).toFixed(3)} ${loc.lng >= 0 ? 'T' : 'B'}` : '-';
          const waktu = retrieval
            ? new Date(retrieval.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : (deploy ? new Date(deploy.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');
          const kodeAkt = retrieval ? '2' : '1';

          // Kelompokkan berdasarkan nama ikan aktual dari data
          const tuna     = rowCatches.find((x: any) => x.jenisIkan?.toLowerCase().includes('tuna'));
          const cakalang = rowCatches.find((x: any) => x.jenisIkan?.toLowerCase().includes('cakalang'));
          const lainArr  = rowCatches.filter((x: any) =>
            !x.jenisIkan?.toLowerCase().includes('tuna') &&
            !x.jenisIkan?.toLowerCase().includes('cakalang')
          );
          // Lain: jumlahkan semua yang bukan tuna/cakalang
          const lainEkor = lainArr.reduce((s: number, c: any) => {
            const q = c.quantity ?? c.extendedData?.quantity ?? 0;
            return s + (parseInt(q) || 0);
          }, 0);
          const lainKg = lainArr.reduce((s: number, c: any) => s + (parseFloat(c.beratKg || 0)), 0);

          // Total semua tangkapan di baris ini
          const totalEkor = rowCatches.reduce((s: number, c: any) => {
            const q = c.quantity ?? c.extendedData?.quantity ?? 0;
            return s + (parseInt(q) || 0);
          }, 0);
          const totalKgRow = rowCatches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg || 0)), 0);

          // Ikan lainnya: tampilkan nama ikan pertama yang bukan tuna/cakalang
          const ikanLain = lainArr[0];

          return [
            tgl, kodeAkt, lat, lng, waktu, '-',
            // Tuna
            tuna ? getQty(tuna) : '', tuna ? getKg(tuna) : '',
            // Cakalang
            cakalang ? getQty(cakalang) : '', cakalang ? getKg(cakalang) : '',
            // Lain (gabungan)
            lainEkor > 0 ? String(lainEkor) : '', lainKg > 0 ? lainKg.toFixed(1) : '',
            // Total
            totalEkor > 0 ? String(totalEkor) : '', totalKgRow > 0 ? totalKgRow.toFixed(1) : '',
            // Bycatch (kosong â€” belum ada data)
            '', '',
            // Penyu, Hiu, Mamalia (kosong)
            '', '', '', '', '', '',
            // Ikan lainnya: nama ikan pertama dari kategori lain
            ikanLain ? ikanLain.jenisIkan : '',
            ikanLain ? getQty(ikanLain) : '',
            ikanLain ? getKg(ikanLain) : '',
          ];
        });

        // Baris total
        const grandTunaKg    = catches.filter((c: any) => c.jenisIkan?.toLowerCase().includes('tuna')).reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
        const grandCakalangKg = catches.filter((c: any) => c.jenisIkan?.toLowerCase().includes('cakalang')).reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
        const grandLainKg    = catches.filter((c: any) => !c.jenisIkan?.toLowerCase().includes('tuna') && !c.jenisIkan?.toLowerCase().includes('cakalang')).reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
        const grandTotalKg   = catches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
        const grandTunaEkor  = catches.filter((c: any) => c.jenisIkan?.toLowerCase().includes('tuna')).reduce((s: number, c: any) => s + (parseInt(c.quantity ?? c.extendedData?.quantity ?? 0) || 0), 0);
        const grandCakalangEkor = catches.filter((c: any) => c.jenisIkan?.toLowerCase().includes('cakalang')).reduce((s: number, c: any) => s + (parseInt(c.quantity ?? c.extendedData?.quantity ?? 0) || 0), 0);
        const grandLainEkor  = catches.filter((c: any) => !c.jenisIkan?.toLowerCase().includes('tuna') && !c.jenisIkan?.toLowerCase().includes('cakalang')).reduce((s: number, c: any) => s + (parseInt(c.quantity ?? c.extendedData?.quantity ?? 0) || 0), 0);
        const grandTotalEkor = catches.reduce((s: number, c: any) => s + (parseInt(c.quantity ?? c.extendedData?.quantity ?? 0) || 0), 0);
        tableBody.push([
          '', 'TOTAL', '', '', '', '',
          grandTunaEkor > 0 ? String(grandTunaEkor) : '', grandTunaKg > 0 ? grandTunaKg.toFixed(1) : '',
          grandCakalangEkor > 0 ? String(grandCakalangEkor) : '', grandCakalangKg > 0 ? grandCakalangKg.toFixed(1) : '',
          grandLainEkor > 0 ? String(grandLainEkor) : '', grandLainKg > 0 ? grandLainKg.toFixed(1) : '',
          grandTotalEkor > 0 ? String(grandTotalEkor) : '', grandTotalKg > 0 ? grandTotalKg.toFixed(1) : '',
          '', '', '', '', '', '', '', '', '', '', '',
        ]);

        autoTable(doc, {
          startY: y,
          head: tableHead,
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 0], textColor: 255, fontSize: 5, fontStyle: 'bold', halign: 'center', cellPadding: 1 },
          styles: { fontSize: 5, cellPadding: 1, halign: 'center', valign: 'middle', lineColor: [0, 0, 0], lineWidth: 0.2 },
          columnStyles: {
            0: { cellWidth: 11 }, // Tanggal
            1: { cellWidth: 8 },  // Kode
            2: { cellWidth: 16 }, // Lintang
            3: { cellWidth: 16 }, // Bujur
            4: { cellWidth: 10 }, // Waktu
            5: { cellWidth: 10 }, // Jml Pancing
          },
          margin: { left: 10, right: 10 },
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // Kode aktivitas + ringkasan
        if (y > 175) { doc.addPage(); y = 10; }
        doc.setFontSize(6.5).setFont('helvetica', 'normal');
        const kodeX = 10;
        doc.rect(kodeX, y, (pageW - 20) / 2, 22);
        doc.setFont('helvetica', 'bold').text('23. Kode Aktivitas:', kodeX + 2, y + 4);
        doc.setFont('helvetica', 'normal');
        ['1. Setting Pancing (Rawai Tuna)', '2. Penangkapan Pancing (Pancing Ulur Tuna)', '3. Singgah', '4. Penitipan ikan ke kapal lain', '5. Di pelabuhan'].forEach((txt, i) => {
          doc.text(`${txt}`, kodeX + 2, y + 8 + i * 3);
        });
        const ringX = kodeX + (pageW - 20) / 2;
        doc.rect(ringX, y, (pageW - 20) / 2, 22);
        doc.setFont('helvetica', 'bold').text('Ringkasan Halaman:', ringX + 2, y + 4);
        doc.setFont('helvetica', 'normal');
        const totalKg = catches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
        doc.text(`31. Jumlah Tangkapan: ${totalKg.toFixed(2)} kg`, ringX + 2, y + 9);
        doc.text(`33. Catatan Nakhoda: ${logbook.trip.catatan || '-'}`, ringX + 2, y + 14);
        y += 25;

        // Tanda tangan
        if (y > 185) { doc.addPage(); y = 10; }
        const sigW = (pageW - 20) / 3;
        ['34. Nama & TTD Nakhoda', '35. Nama & TTD Petugas', '36. Tanggal Penerimaan'].forEach((label, i) => {
          doc.rect(10 + i * sigW, y, sigW, 18);
          doc.setFontSize(6).setFont('helvetica', 'bold').text(label, 12 + i * sigW, y + 3);
          if (i === 0) {
            doc.setFont('helvetica', 'normal').text(nahkoda.nama || '_______________', 12 + i * sigW, y + 14);
          }
        });

        // Footer
        const totalPg = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPg; i++) {
          doc.setPage(i);
          doc.setFontSize(5.5).setFont('helvetica', 'normal').setTextColor(120);
          doc.text('E-Logbook Maritime System â€” Dokumen Resmi', 10, doc.internal.pageSize.getHeight() - 5);
          doc.text(`Hal ${i}/${totalPg}  |  Dicetak: ${new Date().toLocaleString('id-ID')}`, pageW - 10, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
          doc.setTextColor(0);
        }

        doc.save(`Logbook_KKP_${kapal.namaKapal?.replace(/\s/g, '_')}_Trip${tripKe}.pdf`);
      }
    } catch (err: any) {
      console.error('Export Logbook KKP error:', err);
      alert('Gagal membuat Logbook KKP: ' + err.message);
    }
  };

  const getUserName = (userId: string | number) => {
    if (!userId) return 'Unknown';
    const user = users.find(u => u.id == userId);
    return user ? `${user.nama} (${user.role})` : `User #${userId}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION - Maritime Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
            <FileSignature className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Perizinan & Perjalanan
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Kelola jadwal keberangkatan dan status perizinan kapal
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveScheduleTab('trips')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeScheduleTab === 'trips' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Perizinan Trip
            </button>
            <button 
              onClick={() => setActiveScheduleTab('tasks')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeScheduleTab === 'tasks' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Jadwal Tugas
            </button>
          </div>
        </div>
      </div>

      {activeScheduleTab === 'trips' ? (
        <>
          {/* SEARCH & FILTER BAR */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-lg border border-slate-200/60 shadow-sm sticky top-0 z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => handleFilterChange('semua')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                    activeFilter === 'semua' 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Semua ({getFilterCount('semua')})
                </button>
                <button 
                  onClick={() => handleFilterChange('menunggu')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border relative ${
                    activeFilter === 'menunggu' 
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/25' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Menunggu ({getFilterCount('menunggu')})
                  {getFilterCount('menunggu') > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => handleFilterChange('berjalan')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                    activeFilter === 'berjalan' 
                      ? 'bg-teal-500 border-teal-500 text-white shadow-md shadow-teal-500/25' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Berjalan ({getFilterCount('berjalan')})
                </button>
                <button 
                  onClick={() => handleFilterChange('selesai')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
                    activeFilter === 'selesai' 
                      ? 'bg-slate-600 border-slate-600 text-white shadow-md shadow-slate-500/25' 
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Selesai ({getFilterCount('selesai')})
                </button>
              </div>

              <div className="flex items-center gap-3">
                 {/* Bulk Actions */}
                {canWrite && selectedTripIds.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-xs font-bold text-blue-700">
                      {selectedTripIds.length} dipilih
                    </span>
                    <div className="h-4 w-px bg-blue-200 mx-1"></div>
                    <button
                      onClick={() => handleBulkApproval('approve')}
                      className="text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => handleBulkApproval('reject')}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                    >
                      Tolak
                    </button>
                    <button
                      onClick={() => setSelectedTripIds([])}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={loadTrips}
                  disabled={isLoading}
                  className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100"
                  title="Refresh Data"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Memuat data trip...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>Tidak ada trip untuk filter "{activeFilter}"</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">

                <th className="pl-4 pr-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left w-[30%]">Kapal & Nahkoda</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[20%]">Tanggal & Zona</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[20%]">Dokumen</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[15%]">Status</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[15%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(() => {
                const indexOfLast = currentTripPage * tripsPerPage;
                const indexOfFirst = indexOfLast - tripsPerPage;
                return filteredTrips.slice(indexOfFirst, indexOfLast);
              })().map((trip, index) => {
                // Logic adaptation for style to keep "progress bar" look but using original data source
                const pDocs = trip.perizinan?.dokumen;
                const docCount = (pDocs?.izinMelaut ? 1 : 0) + (pDocs?.dokumenKapal ? 1 : 0) + (pDocs?.asuransi ? 1 : 0);
                
                return (
                <tr key={trip.id || `trip-${index}`} className="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-0">

                  <td className="pl-4 pr-4 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Ship size={20} />
                      </div>
                      <div className="min-w-0">
                         <p className="font-bold text-slate-800 text-sm truncate">{trip.kapal?.namaKapal || 'Kapal Tidak Ditemukan'}</p>
                         <p className="text-xs text-slate-500 truncate">{trip.nahkoda?.nama || 'Tanpa Nahkoda'}</p>
                         <span className="text-[10px] text-slate-400 font-mono">{trip.kapal?.nomorRegistrasi || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col gap-1.5 items-center justify-center">
                       <div className="flex items-center gap-2 text-xs text-slate-700 w-full justify-center">
                          <Calendar size={14} className="text-blue-500" />
                          <span className="font-semibold">{new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-500" />
                          <span className="text-xs text-slate-600 truncate max-w-[140px]" title={trip.areaTangkap?.nama}>{trip.areaTangkap?.nama || 'Zona -'}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex flex-col gap-1.5 items-center">
                       <div className="flex items-center gap-1.5">
                          {[1,2,3].map(i => (
                            <div 
                              key={i}
                              className={`w-2.5 h-2.5 rounded-full ${
                                i <= docCount ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          ))}
                          <span className={`text-xs font-bold ml-1 ${
                             docCount >= 3 ? 'text-emerald-600' : 'text-slate-500'
                          }`}>
                             {docCount}/3
                          </span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border inline-block ${
                      trip.status === 'menunggu_dokumen' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      trip.status === 'menunggu_izin' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      trip.status === 'disetujui' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      trip.status === 'sedang_melaut' || trip.status === 'berjalan' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                      trip.status === 'selesai' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                      trip.status === 'ditolak' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {trip.status === 'menunggu_dokumen' ? 'Menunggu Dokumen' :
                       trip.status === 'menunggu_izin' ? 'Menunggu Izin' :
                       trip.status === 'disetujui' ? 'Disetujui' :
                       trip.status === 'sedang_melaut' || trip.status === 'berjalan' ? 'Sedang Melaut' :
                       trip.status === 'selesai' ? 'Selesai' : 
                       trip.status === 'ditolak' ? 'Ditolak' : 
                       trip.status?.replace(/_/g, ' ') || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top text-center">
                    <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                         onClick={() => handleOpenDetail(trip)}
                         className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                         title="Lihat Detail"
                      >
                         <Eye size={16} />
                      </button>

                      {canWrite && trip.status === 'menunggu_izin' && (
                        <>
                          <button
                             onClick={() => handleApprovalAction(trip.id, 'approve', trip.kapal?.namaKapal || 'Trip')}
                             className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                             title="Setujui Trip"
                          >
                             <CheckCircle2 size={16} />
                          </button>
                          <button
                             onClick={() => handleApprovalAction(trip.id, 'reject', trip.kapal?.namaKapal || 'Trip')}
                             className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                             title="Tolak Trip"
                          >
                             <XCircle size={16} />
                          </button>
                        </>
                      )}

                      {canDelete && ['menunggu_izin', 'menunggu_dokumen', 'ditolak'].includes(trip.status) && (
                         <button
                            onClick={() => handleDeleteTrip(trip.id, trip.kapal?.namaKapal || 'Trip')}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            title="Hapus"
                         >
                            <Trash2 size={16} />
                         </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredTrips.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Menampilkan <span className="font-semibold">{Math.min((currentTripPage - 1) * tripsPerPage + 1, filteredTrips.length)}</span> - <span className="font-semibold">{Math.min(currentTripPage * tripsPerPage, filteredTrips.length)}</span> dari <span className="font-semibold">{filteredTrips.length}</span> trip
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTripPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentTripPage === 1}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                  Halaman <span className="font-bold">{currentTripPage}</span> dari <span className="font-bold">{Math.ceil(filteredTrips.length / tripsPerPage)}</span>
                </div>
                <button
                  onClick={() => setCurrentTripPage(prev => Math.min(prev + 1, Math.ceil(filteredTrips.length / tripsPerPage)))}
                  disabled={currentTripPage >= Math.ceil(filteredTrips.length / tripsPerPage)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedTrip(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-white px-5 py-3 sticky top-0 z-10 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Ship className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">
                      Detail Perizinan Trip
                    </h3>
                    <p className="text-xs text-slate-600">
                      ID: {selectedTrip.id} â€¢ {selectedTrip.kapal?.namaKapal || 'Kapal Tidak Ditemukan'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      console.log('ðŸ”„ Refreshing trip data...');
                      loadTrips(); // Refresh data
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600"
                    title="Refresh data trip"
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={async () => {
                      console.log('ðŸ§Š Force refresh vessel data for kapal:', selectedTrip.kapal.id);
                      try {
                        const freshTrip = (await backendAPI.request(`/api/trip/${selectedTrip.id}`)) as any;
                        if (freshTrip.success && freshTrip.data) {
                          console.log('â›½ Fresh vessel fuel data:', freshTrip.data.kapal?.dataBahanBakar);
                          setSelectedTrip(freshTrip.data);
                        }
                      } catch (error) {
                        console.error('âŒ Error refreshing vessel data:', error);
                      }
                    }}
                    className="p-1.5 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                    title="Force refresh vessel data"
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Vessel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTrip(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Vessel Type Requirements */}
              {selectedTrip.kapal.tipeKapal && (() => {
                const requirements = getVesselRequirements(selectedTrip.kapal.tipeKapal);
                const validation = validateTripRequirements(selectedTrip, selectedTrip.kapal);
                return (
                  <div className={`p-4 rounded-xl border-2 ${validation.isValid ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center space-x-3 mb-3">
                      <Ship size={18} className="text-blue-600" />
                      <div>
                        <h4 className="font-bold text-slate-800">{requirements.name}</h4>
                        <p className="text-xs text-slate-500">Standar kebutuhan untuk tipe kapal ini</p>
                      </div>
                    </div>
                    {!validation.isValid && (
                      <div className="space-y-1">
                        {validation.issues.map((issue, idx) => (
                          <p key={idx} className="text-xs text-amber-700 flex items-center">
                            <XCircle size={12} className="mr-1" /> {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Info Trip */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kapal</p>
                  <p className="font-semibold">{selectedTrip.kapal.namaKapal}</p>
                  <p className="text-xs text-slate-500">{selectedTrip.kapal.nomorRegistrasi}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nahkoda</p>
                  <p className="font-semibold">{selectedTrip.nahkoda.nama}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Keberangkatan</p>
                  <p className="font-semibold">{new Date(selectedTrip.tanggalBerangkat).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estimasi Pulang</p>
                  <p className="font-semibold">{new Date(selectedTrip.estimasiPulang).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Documents & Operational Check */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center"><FileText size={18} className="mr-2 text-blue-600" /> Verifikasi Dokumen & Operasional</h4>
                
                {/* Dokumen Trip - Enhanced Cards with Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Shield size={14} className="text-blue-600" />
                      Dokumen Perizinan Trip
                    </p>
                  </div>

                  {selectedTrip.perizinan?.dokumen ? (
                    <div className="flex flex-col gap-4">
                      {/* Izin Melaut Card */}
                      {selectedTrip.perizinan.dokumen.izinMelaut !== undefined && (
                        <div className={`group relative rounded-xl border transition-all hover:shadow-lg ${
                          selectedTrip.perizinan.dokumen.izinMelaut 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-amber-200 bg-amber-50/50'
                        }`}>
                          <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl shadow-sm ${
                                  selectedTrip.perizinan.dokumen.izinMelaut ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  <FileCheck size={18} />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-slate-800">Izin Melaut</h5>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Wajib</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                selectedTrip.perizinan.dokumen.izinMelaut 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {selectedTrip.perizinan.dokumen.izinMelaut ? 'VALID' : 'PENDING'}
                              </span>
                            </div>
                            
                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                              <button
                                onClick={() => setPreviewDoc({
                                  url: selectedTrip.perizinan?.dokumentasi?.izinMelaut?.fileUrl
                                    ? `${API_CONFIG.BASE_URL}${selectedTrip.perizinan.dokumentasi.izinMelaut.fileUrl}`
                                    : `${API_CONFIG.BASE_URL}/uploads/documents/izin_melaut_${selectedTrip.kapal.id}.pdf`,
                                  name: 'Izin Melaut',
                                  type: 'pdf'
                                })}
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center gap-2 transition-all shadow-sm font-medium"
                              >
                                <Eye size={14} /> Lihat File
                              </button>
                              
                              {selectedTrip.status === 'menunggu_dokumen' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'izinMelaut', true)}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all active:scale-95"
                                    title="Setujui"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'izinMelaut', false)}
                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all active:scale-95"
                                    title="Tolak"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Dokumen Kapal Card */}
                      {selectedTrip.perizinan.dokumen.dokumenKapal !== undefined && (
                        <div className={`group relative rounded-xl border transition-all hover:shadow-lg ${
                          selectedTrip.perizinan.dokumen.dokumenKapal 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-amber-200 bg-amber-50/50'
                        }`}>
                          <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl shadow-sm ${
                                  selectedTrip.perizinan.dokumen.dokumenKapal ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  <Ship size={18} />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-slate-800">Dok. Kapal</h5>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Wajib</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                selectedTrip.perizinan.dokumen.dokumenKapal 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {selectedTrip.perizinan.dokumen.dokumenKapal ? 'VALID' : 'PENDING'}
                              </span>
                            </div>
                            
                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                              <button
                                onClick={() => setPreviewDoc({
                                  url: selectedTrip.perizinan?.dokumentasi?.dokumenKapal?.fileUrl
                                    ? `${API_CONFIG.BASE_URL}${selectedTrip.perizinan.dokumentasi.dokumenKapal.fileUrl}`
                                    : `${API_CONFIG.BASE_URL}/uploads/documents/dokumen_kapal_${selectedTrip.kapal.id}.pdf`,
                                  name: 'Dokumen Kapal',
                                  type: 'pdf'
                                })}
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center gap-2 transition-all shadow-sm font-medium"
                              >
                                <Eye size={14} /> Lihat File
                              </button>
                              
                              {selectedTrip.status === 'menunggu_dokumen' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'dokumenKapal', true)}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all active:scale-95"
                                    title="Setujui"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'dokumenKapal', false)}
                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all active:scale-95"
                                    title="Tolak"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Asuransi Card */}
                      {selectedTrip.perizinan.dokumen.asuransi !== undefined && (
                        <div className={`group relative rounded-xl border transition-all hover:shadow-lg ${
                          selectedTrip.perizinan.dokumen.asuransi 
                            ? 'border-emerald-200 bg-emerald-50/50' 
                            : 'border-amber-200 bg-amber-50/50'
                        }`}>
                          <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl shadow-sm ${
                                  selectedTrip.perizinan.dokumen.asuransi ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  <Shield size={18} />
                                </div>
                                <div>
                                  <h5 className="text-sm font-bold text-slate-800">Asuransi</h5>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Opsional</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                selectedTrip.perizinan.dokumen.asuransi 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}>
                                {selectedTrip.perizinan.dokumen.asuransi ? 'VALID' : 'PENDING'}
                              </span>
                            </div>
                            
                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                              <button
                                onClick={() => setPreviewDoc({
                                  url: selectedTrip.perizinan?.dokumentasi?.asuransi?.fileUrl
                                    ? `${API_CONFIG.BASE_URL}${selectedTrip.perizinan.dokumentasi.asuransi.fileUrl}`
                                    : `${API_CONFIG.BASE_URL}/uploads/documents/asuransi_${selectedTrip.kapal.id}.pdf`,
                                  name: 'Asuransi Kapal',
                                  type: 'pdf'
                                })}
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center gap-2 transition-all shadow-sm font-medium"
                              >
                                <Eye size={14} /> Lihat File
                              </button>
                              
                              {selectedTrip.status === 'menunggu_dokumen' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'asuransi', true)}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all active:scale-95"
                                    title="Setujui"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDocumentApproval(selectedTrip.id, 'asuransi', false)}
                                    className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all active:scale-95"
                                    title="Tolak"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                      <div className="flex items-center gap-2 text-slate-500">
                        <AlertTriangle size={16} />
                        <p className="text-xs">Belum ada data dokumen perizinan trip</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dokumen Kapal (dari Mobile App) */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Dokumen Kapal (Mobile App)</p>
                  {(() => {
                    // Debug: Log vessel data structure
                    const vesselDocs = selectedTrip.kapal.dokumen || [];
                    const sertifikatJalan = selectedTrip.kapal.sertifikatJalan || [];
                    
                    const hasVesselDocs = Array.isArray(vesselDocs) && vesselDocs.length > 0;
                    const hasCertificates = Array.isArray(sertifikatJalan) && sertifikatJalan.length > 0;
                    
                    if (!hasVesselDocs && !hasCertificates) {
                      return (
                        <div className="p-5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <AlertTriangle size={18} className="text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-amber-800">Dokumen Belum Diupload</p>
                              <p className="text-xs text-amber-600">Menunggu upload dari mobile app</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg">
                              <FileText size={12} /> Sertifikat Jalan
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg">
                              <Droplets size={12} /> Data Bahan Bakar
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg">
                              <Snowflake size={12} /> Data Es/Storage
                            </div>
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100/50 px-3 py-2 rounded-lg">
                              <FileCheck size={12} /> Dokumen Pribadi
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {/* Sertifikat Jalan */}
                        {hasCertificates && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Shield size={14} className="text-blue-600" />
                              <p className="text-[10px] font-bold text-blue-600 uppercase">Sertifikat Jalan ({sertifikatJalan.length})</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {sertifikatJalan.map((cert, idx) => {
                                const isExpired = cert.tanggalBerlaku && new Date(cert.tanggalBerlaku) < new Date();
                                const isExpiringSoon = cert.tanggalBerlaku && new Date(cert.tanggalBerlaku) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                
                                return (
                                  <div key={idx} className={`p-3 rounded-lg border-2 flex items-center justify-between ${
                                    isExpired ? 'border-red-300 bg-red-50' : 
                                    isExpiringSoon ? 'border-amber-300 bg-amber-50' : 
                                    'border-green-300 bg-green-50'
                                  }`}>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <FileText size={12} className="text-blue-600" />
                                        <p className="text-xs font-bold text-slate-800">{cert.nama || 'Sertifikat Jalan'}</p>
                                      </div>
                                      <p className="text-[10px] text-slate-600 font-mono">{cert.nomorSertifikat}</p>
                                      {cert.tanggalBerlaku && (
                                        <p className={`text-[9px] mt-1 font-semibold ${
                                          isExpired ? 'text-red-700' : 
                                          isExpiringSoon ? 'text-amber-700' : 
                                          'text-green-700'
                                        }`}>
                                          ðŸ“… Berlaku: {new Date(cert.tanggalBerlaku).toLocaleDateString('id-ID')}
                                          {isExpired && ' âŒ (EXPIRED)'}
                                          {isExpiringSoon && !isExpired && ' âš ï¸ (Segera Expired)'}
                                        </p>
                                      )}
                                      {cert.uploadedAt && (
                                        <p className="text-[8px] text-slate-400 mt-1">
                                          ðŸ“± Upload: {new Date(cert.uploadedAt).toLocaleDateString('id-ID')}
                                        </p>
                                      )}
                                      {cert.fileUrl && (
                                        <button
                                          onClick={() => setPreviewDoc({
                                            url: `${API_CONFIG.BASE_URL}${cert.fileUrl}`,
                                            name: cert.nama || 'Sertifikat Jalan',
                                            type: cert.fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
                                          })}
                                          className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10px] rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                          <Eye size={10} /> Preview File
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      {isExpired ? 
                                        <XCircle size={16} className="text-red-600" /> : 
                                        isExpiringSoon ? 
                                        <Clock size={16} className="text-amber-600" /> :
                                        <CheckCircle2 size={16} className="text-green-600" />
                                      }
                                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                        isExpired ? 'bg-red-200 text-red-800' : 
                                        isExpiringSoon ? 'bg-amber-200 text-amber-800' : 
                                        'bg-green-200 text-green-800'
                                      }`}>
                                        {isExpired ? 'EXPIRED' : isExpiringSoon ? 'SOON' : 'VALID'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Dokumen Lainnya */}
                        {hasVesselDocs && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Dokumen Lainnya</p>
                            <div className="grid grid-cols-1 gap-2">
                              {vesselDocs.map((doc, idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-blue-200 bg-blue-50 flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-700">{doc.jenis || doc.type || 'Dokumen'}</p>
                                    <p className="text-[10px] text-slate-500">{doc.nomor || doc.number || 'No. tidak tersedia'}</p>
                                    {doc.berlakuHingga && (
                                      <p className="text-[9px] text-blue-600 mt-1">
                                        Berlaku: {new Date(doc.berlakuHingga).toLocaleDateString('id-ID')}
                                      </p>
                                    )}
                                  </div>
                                  <CheckCircle2 size={14} className="text-blue-600" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Operasional */}
                  <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase">Kesiapan Operasional (Data Mobile App)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      // Get operational data from verify object (NEW) or vessel (OLD)
                      const tripFuelData = selectedTrip.perizinan?.fuelData;
                      const tripIceData = selectedTrip.perizinan?.iceData;
                      
                      const vesselFuelData = selectedTrip.kapal.dataBahanBakar || [];
                      
                      // Handle ice data structure
                      let vesselIceData = [];
                      if (Array.isArray(selectedTrip.kapal.iceData)) {
                        vesselIceData = selectedTrip.kapal.iceData;
                      } else if (Array.isArray(selectedTrip.kapal.storageData)) {
                        vesselIceData = selectedTrip.kapal.storageData;
                      } else if (selectedTrip.kapal.storageData?.iceData) {
                         vesselIceData = selectedTrip.kapal.storageData.iceData;
                      }

                      // Use trip data if available, otherwise fall back to vessel data
                      const activeFuelData = Array.isArray(tripFuelData) && tripFuelData.length > 0 ? tripFuelData : vesselFuelData;
                      const activeIceData = Array.isArray(tripIceData) && tripIceData.length > 0 ? tripIceData : vesselIceData;

                      const hasFuelData = activeFuelData.length > 0;
                      const hasIceData = activeIceData.length > 0;
                      
                      // Calculate totals if data exists
                      let totalFuel = 0;
                      let totalIce = 0;
                      
                      if (hasFuelData) {
                        totalFuel = activeFuelData.reduce((sum, fuel) => sum + (fuel.jumlahLiter || 0), 0);
                      }
                      
                      if (hasIceData) {
                        totalIce = activeIceData.reduce((sum, ice) => sum + (ice.jumlahKg || ice.jumlahEs || 0), 0);
                      }
                      
                      // Get vessel capacity from spesifikasi
                      const fuelCapacity = selectedTrip.kapal.spesifikasi?.kapasitasBensin || 1000;
                      const iceCapacity = selectedTrip.kapal.spesifikasi?.kapasitasEs || 500;
                      
                      // Calculate percentages
                      const fuelPercentage = fuelCapacity > 0 ? (totalFuel / fuelCapacity) * 100 : 0;
                      const icePercentage = iceCapacity > 0 ? (totalIce / iceCapacity) * 100 : 0;
                      
                      // Requirements
                      const requirements = getVesselRequirements(selectedTrip.kapal.tipeKapal || 'penangkap_ikan');
                      const fuelOK = hasFuelData && fuelPercentage >= requirements.minBensinPercentage;
                      const iceOK = hasIceData && icePercentage >= requirements.minEsPercentage;
                      
                      return (
                        <>
                          {/* Fuel Card - Unified Official Style */}
                          {(() => {
                            const isOverCapacity = totalFuel > fuelCapacity;
                            const isCompliant = fuelPercentage >= requirements.minBensinPercentage;
                            
                            // Status Logic: Red (Over) -> Amber (Low) -> Blue (Good)
                            let statusColor = isOverCapacity ? 'text-red-600' : (!isCompliant ? 'text-amber-600' : 'text-blue-600');
                            let statusBg = isOverCapacity ? 'bg-red-50' : (!isCompliant ? 'bg-amber-50' : 'bg-blue-50');
                            let statusBorder = isOverCapacity ? 'border-red-100' : (!isCompliant ? 'border-amber-100' : 'border-blue-100');
                            let accentColor = isOverCapacity ? 'bg-red-500' : (!isCompliant ? 'bg-amber-500' : 'bg-blue-500');
                            
                            return (
                              <div className={`relative overflow-hidden rounded-xl p-5 border transition-all ${statusBorder} ${statusBg} bg-opacity-40`}>
                                {/* Accent Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

                                {/* 1. Header */}
                                <div className="flex items-start justify-between mb-5 pl-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl shadow-sm bg-white text-slate-600 border border-slate-100`}>
                                      <Droplets size={18} />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-bold text-slate-800 tracking-tight">Bahan Bakar</h5>
                                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Solar / Diesel</p>
                                    </div>
                                  </div>
                                  <div className={`flex flex-col items-end`}>
                                     <span className={`text-base font-bold ${statusColor}`}>
                                      {fuelPercentage.toFixed(0)}%
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Min {requirements.minBensinPercentage}%
                                    </span>
                                  </div>
                                </div>

                                {/* 2. Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4 pl-2">
                                  <div className="bg-white/60 rounded-lg p-2.5 border border-slate-100/50">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Terisi</span>
                                    <span className="block text-base font-bold text-slate-900">{hasFuelData ? `${totalFuel.toFixed(0)}` : '0'}<span className="text-xs font-normal text-slate-500 ml-0.5">L</span></span>
                                  </div>
                                  <div className="bg-white/60 rounded-lg p-2.5 border border-slate-100/50">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Kapasitas</span>
                                    <span className="block text-base font-bold text-slate-900">{fuelCapacity}<span className="text-xs font-normal text-slate-500 ml-0.5">L</span></span>
                                  </div>
                                </div>
                                
                                {/* 3. Warning Components (Official) */}
                                {isOverCapacity ? (
                                  <div className="ml-2 mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Kapasitas Berlebih!</h4>
                                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                        Total pengisian <span className="font-bold">{totalFuel.toFixed(0)}L</span> melebihi kapasitas kapal <span className="font-bold">{fuelCapacity}L</span>.
                                      </p>
                                    </div>
                                  </div>
                                ) : !isCompliant ? (
                                  <div className="ml-2 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Belum Memenuhi Syarat</h4>
                                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        Minimal pengisian <span className="font-bold">{requirements.minBensinPercentage}%</span> dari kapasitas. Saat ini baru <span className="font-bold">{fuelPercentage.toFixed(0)}%</span>.
                                      </p>
                                    </div>
                                  </div>
                                ) : null}

                                {/* 4. Transaction List */}
                                <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/50 pl-2">
                                  {hasFuelData ? (
                                    <>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Riwayat Pengisian</div>
                                      <div className="space-y-2">
                                        {activeFuelData.map((data, idx) => (
                                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
                                            {/* Row 1: Header */}
                                            <div className="flex justify-between items-start mb-2">
                                               <div className="flex items-center gap-2">
                                                  <span className="text-sm font-bold text-slate-800">{data.jumlahLiter} <span className="text-[10px] font-normal text-slate-500">Liter</span></span>
                                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase tracking-wider border border-slate-200">{data.jenisBahanBakar || 'Solar'}</span>
                                               </div>
                                               
                                               {/* Proof Button */}
                                               {data.buktiFileUrl ? (
                                                 <button 
                                                    onClick={() => setPreviewDoc({
                                                      url: `${API_CONFIG.BASE_URL}${data.buktiFileUrl}`,
                                                      name: `Struk BBM (${data.jumlahLiter}L) - ${formatDateTime(data.tanggalPengisian)}`,
                                                      type: data.buktiFileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
                                                    })}
                                                    className="text-blue-600 hover:text-blue-700 transition-colors"
                                                    title="Lihat Bukti Struk"
                                                 >
                                                    <Eye size={16} />
                                                 </button>
                                               ) : (
                                                 <span className="text-[10px] text-slate-300 italic">No Proof</span>
                                               )}
                                            </div>

                                            {/* Row 2: Location & Date */}
                                            <div className="flex items-center gap-3 mb-2.5">
                                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <MapPin size={10} className="text-slate-400" />
                                                <span className="truncate max-w-[120px]">{data.lokasiPengisian || 'Lokasi -'}</span>
                                              </div>
                                              <div className="w-px h-2.5 bg-slate-200"></div>
                                              <div className="text-[10px] text-slate-500">
                                                {formatDateTime(data.uploadedAt || data.tanggalPengisian)}
                                              </div>
                                            </div>
                                            
                                            <div className="h-px bg-slate-50 w-full mb-2"></div>

                                            {/* Row 3: Financials & Audit */}
                                            <div className="flex items-center justify-between">
                                               <div className="flex items-center gap-1.5">
                                                  <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[8px] font-bold">
                                                     {getUserName(data.uploadedBy).charAt(0)}
                                                  </div>
                                                  <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={getUserName(data.uploadedBy)}>{getUserName(data.uploadedBy)}</span>
                                               </div>
                                               
                                               <div className="text-right">
                                                  <div className="text-[10px] text-slate-400">Total Harga</div>
                                                  <div className="text-xs font-bold text-slate-700">
                                                    {data.totalHarga ? formatRupiah(data.totalHarga) : (data.hargaPerLiter && data.jumlahLiter ? formatRupiah(data.hargaPerLiter * data.jumlahLiter) : '-')}
                                                  </div>
                                               </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                        <AlertTriangle size={14} className="text-slate-300" />
                                      </div>
                                      <span className="text-xs text-slate-400 font-medium">Belum ada data</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Ice Card - Unified Official Style */}
                          {(() => {
                            const isOverCapacity = totalIce > iceCapacity;
                            const isCompliant = icePercentage >= requirements.minEsPercentage;
                            
                            // Status Logic: Red (Over) -> Amber (Low) -> Blue (Good)
                            let statusColor = isOverCapacity ? 'text-red-600' : (!isCompliant ? 'text-amber-600' : 'text-cyan-600');
                            let statusBg = isOverCapacity ? 'bg-red-50' : (!isCompliant ? 'bg-amber-50' : 'bg-cyan-50');
                            let statusBorder = isOverCapacity ? 'border-red-100' : (!isCompliant ? 'border-amber-100' : 'border-cyan-100');
                            let accentColor = isOverCapacity ? 'bg-red-500' : (!isCompliant ? 'bg-amber-500' : 'bg-cyan-500');

                            return (
                              <div className={`relative overflow-hidden rounded-xl p-5 border transition-all ${statusBorder} ${statusBg} bg-opacity-40`}>
                                {/* Accent Stripe */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />

                                {/* 1. Header */}
                                <div className="flex items-start justify-between mb-5 pl-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl shadow-sm bg-white text-slate-600 border border-slate-100`}>
                                      <Snowflake size={18} />
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-bold text-slate-800 tracking-tight">Perbekalan Es</h5>
                                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Pengawet</p>
                                    </div>
                                  </div>
                                  <div className={`flex flex-col items-end`}>
                                     <span className={`text-base font-bold ${statusColor}`}>
                                      {icePercentage.toFixed(0)}%
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      Min {requirements.minEsPercentage}%
                                    </span>
                                  </div>
                                </div>

                                {/* 2. Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4 pl-2">
                                  <div className="bg-white/60 rounded-lg p-2.5 border border-slate-100/50">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Terisi</span>
                                    <span className="block text-base font-bold text-slate-900">{hasIceData ? `${totalIce.toFixed(0)}` : '0'}<span className="text-xs font-normal text-slate-500 ml-0.5">kg</span></span>
                                  </div>
                                  <div className="bg-white/60 rounded-lg p-2.5 border border-slate-100/50">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Kapasitas</span>
                                    <span className="block text-base font-bold text-slate-900">{iceCapacity}<span className="text-xs font-normal text-slate-500 ml-0.5">kg</span></span>
                                  </div>
                                </div>
                                
                                {/* 3. Warning Components (Official) */}
                                {isOverCapacity ? (
                                  <div className="ml-2 mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide">Kapasitas Berlebih!</h4>
                                      <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                        Total pengisian <span className="font-bold">{totalIce.toFixed(0)}kg</span> melebihi kapasitas kapal <span className="font-bold">{iceCapacity}kg</span>.
                                      </p>
                                    </div>
                                  </div>
                                ) : !isCompliant ? (
                                  <div className="ml-2 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                                    <div>
                                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Belum Memenuhi Syarat</h4>
                                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        Minimal pengisian <span className="font-bold">{requirements.minEsPercentage}%</span> dari kapasitas. Saat ini baru <span className="font-bold">{icePercentage.toFixed(0)}%</span>.
                                      </p>
                                    </div>
                                  </div>
                                ) : null}

                                {/* 4. Transaction List */}
                                <div className="flex flex-col gap-2 pt-1 border-t border-slate-200/50 pl-2">
                                  {hasIceData ? (
                                    <>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">Riwayat Pembelian</div>
                                      <div className="space-y-2">
                                        {activeIceData.map((data, idx) => (
                                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
                                            {/* Row 1: Header */}
                                            <div className="flex justify-between items-start mb-2">
                                               <div className="flex items-center gap-2">
                                                  <span className="text-sm font-bold text-slate-800">{data.jumlahKg || data.jumlahEs} <span className="text-[10px] font-normal text-slate-500">kg</span></span>
                                                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold uppercase tracking-wider border border-slate-200">ES BALOK</span>
                                               </div>
                                               
                                               {/* Proof Button */}
                                               {data.buktiFileUrl ? (
                                                 <button 
                                                    onClick={() => setPreviewDoc({
                                                      url: `${API_CONFIG.BASE_URL}${data.buktiFileUrl}`,
                                                      name: `Struk Es (${data.jumlahKg || data.jumlahEs} kg) - ${formatDateTime(data.tanggalPembelian || data.tanggalPengisian)}`,
                                                      type: data.buktiFileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
                                                    })}
                                                    className="text-cyan-600 hover:text-cyan-700 transition-colors"
                                                    title="Lihat Bukti Struk"
                                                 >
                                                    <Eye size={16} />
                                                 </button>
                                               ) : (
                                                 <span className="text-[10px] text-slate-300 italic">No Proof</span>
                                               )}
                                            </div>

                                            {/* Row 2: Location & Date */}
                                            <div className="flex items-center gap-3 mb-2.5">
                                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <MapPin size={10} className="text-slate-400" />
                                                <span className="truncate max-w-[120px]">{data.lokasiPembelian || data.lokasiPengisian || 'Lokasi -'}</span>
                                              </div>
                                              <div className="w-px h-2.5 bg-slate-200"></div>
                                              <div className="text-[10px] text-slate-500">
                                                {formatDateTime(data.uploadedAt || data.tanggalPembelian || data.tanggalPengisian)}
                                              </div>
                                            </div>
                                            
                                            <div className="h-px bg-slate-50 w-full mb-2"></div>

                                            {/* Row 3: Financials & Audit */}
                                            <div className="flex items-center justify-between">
                                               <div className="flex items-center gap-1.5">
                                                  <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[8px] font-bold">
                                                     {getUserName(data.uploadedBy).charAt(0)}
                                                  </div>
                                                  <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={getUserName(data.uploadedBy)}>{getUserName(data.uploadedBy)}</span>
                                               </div>
                                               
                                               <div className="text-right">
                                                  <div className="text-[10px] text-slate-400">Total Harga</div>
                                                  <div className="text-xs font-bold text-slate-700">
                                                    {data.totalHarga ? formatRupiah(data.totalHarga) : ((data.hargaPerKg || data.hargaPerRupiah) && (data.jumlahKg || data.jumlahEs) ? formatRupiah((data.hargaPerKg || data.hargaPerRupiah) * (data.jumlahKg || data.jumlahEs)) : '-')}
                                                  </div>
                                               </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                        <AlertTriangle size={14} className="text-slate-300" />
                                      </div>
                                      <span className="text-xs text-slate-400 font-medium">Belum ada data</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Detail Perjalanan */}
              {(selectedTrip.status === 'sedang_melaut' || selectedTrip.status === 'selesai') && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center"><Navigation size={18} className="mr-2 text-blue-600" /> Detail Perjalanan</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tracking Data - Premium Style */}
                    <div className="relative overflow-hidden rounded-xl p-5 bg-blue-50/40 border border-blue-100 transition-all hover:bg-blue-50/60">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      
                      <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className="p-2 rounded-xl bg-blue-100 text-blue-600 shadow-sm">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-800 tracking-tight">Data Tracking</h5>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Real-time GPS</p>
                        </div>
                      </div>

                      {selectedTrip.tracking ? (
                        <div className="space-y-3 pl-2">
                          <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-blue-50">
                            <span className="text-xs text-slate-500 font-medium">Total Jarak</span>
                            <span className="font-bold text-slate-900">{selectedTrip.tracking.totalDistance || 0} <span className="text-[10px] text-slate-500 font-normal">km</span></span>
                          </div>
                          <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-blue-50">
                            <span className="text-xs text-slate-500 font-medium">Waktu Berlayar</span>
                            <span className="font-bold text-slate-900">{selectedTrip.tracking.sailingTime || 0} <span className="text-[10px] text-slate-500 font-normal">jam</span></span>
                          </div>
                          <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-blue-50">
                            <span className="text-xs text-slate-500 font-medium">Kecepatan Rata-rata</span>
                            <span className="font-bold text-slate-900">{selectedTrip.tracking.avgSpeed || 0} <span className="text-[10px] text-slate-500 font-normal">knot</span></span>
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[10px] text-slate-400">Update Terakhir</span>
                            <span className="text-[10px] font-medium text-blue-600">
                              {selectedTrip.tracking.lastUpdate ? 
                                new Date(selectedTrip.tracking.lastUpdate).toLocaleString('id-ID') : 
                                'Tidak ada data'
                              }
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-6 text-center pl-2">
                          <p className="text-xs text-slate-400 italic">Belum ada data tracking tersedia</p>
                        </div>
                      )}
                    </div>

                    {/* Current Location - Premium Style */}
                    <div className="relative overflow-hidden rounded-xl p-5 bg-emerald-50/40 border border-emerald-100 transition-all hover:bg-emerald-50/60">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      
                      <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 shadow-sm">
                          <Navigation size={18} />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-800 tracking-tight">Lokasi Terkini</h5>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Posisi Kapal</p>
                        </div>
                      </div>

                      {selectedTrip.currentLocation ? (
                        <div className="space-y-3 pl-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/60 p-2 rounded-lg border border-emerald-50">
                              <span className="block text-[10px] text-slate-500 mb-0.5">Latitude</span>
                              <span className="block font-bold font-mono text-slate-900 text-xs">{selectedTrip.currentLocation.lat?.toFixed(6)}</span>
                            </div>
                            <div className="bg-white/60 p-2 rounded-lg border border-emerald-50">
                              <span className="block text-[10px] text-slate-500 mb-0.5">Longitude</span>
                              <span className="block font-bold font-mono text-slate-900 text-xs">{selectedTrip.currentLocation.lng?.toFixed(6)}</span>
                            </div>
                          </div>
                          
                          {selectedTrip.currentLocation.speed && (
                            <div className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-emerald-50">
                              <span className="text-xs text-slate-500 font-medium">Kecepatan Saat Ini</span>
                              <span className="font-bold text-emerald-700">{selectedTrip.currentLocation.speed} <span className="text-[10px] text-slate-500 font-normal">knot</span></span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1">
                            <span className="text-[10px] text-slate-400">Terpantau</span>
                            <span className="text-[10px] font-medium text-emerald-600">
                              {new Date(selectedTrip.currentLocation.timestamp).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ) : (
                         <div className="flex items-center justify-center py-6 text-center pl-2">
                          <p className="text-xs text-slate-400 italic">Lokasi kapal tidak terdeteksi</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Laporan Hasil Tangkap - Premium Style */}
                  {selectedTrip.laporan && (
                    <div className="relative overflow-hidden rounded-xl p-5 bg-orange-50/40 border border-orange-100 transition-all hover:bg-orange-50/60">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                      
                      <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shadow-sm">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-800 tracking-tight">Laporan Hasil Tangkap</h5>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Produksi</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-2 mb-4">
                        <div className="text-center bg-white/60 p-3 rounded-xl border border-orange-50">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Target</p>
                          <p className="font-bold text-xl text-slate-900">{selectedTrip.estimasiBerat || 0} <span className="text-xs font-normal text-slate-500">kg</span></p>
                        </div>
                        <div className="text-center bg-white/60 p-3 rounded-xl border border-orange-50">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Hasil Aktual</p>
                          <p className="font-bold text-xl text-slate-900">{selectedTrip.beratAktual || 0} <span className="text-xs font-normal text-slate-500">kg</span></p>
                        </div>
                        <div className="text-center bg-white/60 p-3 rounded-xl border border-orange-50">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Pencapaian</p>
                          <p className="font-bold text-xl text-orange-600">
                            {selectedTrip.estimasiBerat ? 
                              ((selectedTrip.beratAktual || 0) / selectedTrip.estimasiBerat * 100).toFixed(1) : 0
                            }%
                          </p>
                        </div>
                      </div>
                      
                      {selectedTrip.laporan.jenisIkan && selectedTrip.laporan.jenisIkan.length > 0 && (
                        <div className="pl-2 pt-3 border-t border-orange-200/50">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-2">Komposisi Tangkapan:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedTrip.laporan.jenisIkan.map((ikan, idx) => (
                              <span key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-orange-100 text-orange-800 rounded-lg text-xs font-medium shadow-sm">
                                <span>{ikan.nama}</span>
                                <span className="bg-orange-100 text-orange-700 px-1.5 rounded text-[10px] font-bold">{ikan.berat}kg</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Biaya Operasional - Premium Style */}
                  {selectedTrip.biaya && (
                    <div className="relative overflow-hidden rounded-xl p-5 bg-purple-50/40 border border-purple-100 transition-all hover:bg-purple-50/60">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                      
                      <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className="p-2 rounded-xl bg-purple-100 text-purple-600 shadow-sm">
                          <div className="font-bold text-lg leading-none">Rp</div>
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-slate-800 tracking-tight">Biaya Operasional</h5>
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">Keuangan</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pl-2">
                        <div className="text-center bg-white/60 p-2.5 rounded-lg border border-purple-50">
                          <p className="text-slate-500 mb-1">Bahan Bakar</p>
                          <p className="font-bold text-slate-800">Rp {(selectedTrip.biaya.bahanBakar || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-center bg-white/60 p-2.5 rounded-lg border border-purple-50">
                          <p className="text-slate-500 mb-1">Es</p>
                          <p className="font-bold text-slate-800">Rp {(selectedTrip.biaya.es || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-center bg-white/60 p-2.5 rounded-lg border border-purple-50">
                          <p className="text-slate-500 mb-1">Logistik</p>
                          <p className="font-bold text-slate-800">Rp {(selectedTrip.biaya.logistik || 0).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-center bg-purple-100/50 p-2.5 rounded-lg border border-purple-100">
                          <p className="text-purple-700 font-medium mb-1">Total</p>
                          <p className="font-bold text-purple-800 text-sm">Rp {((selectedTrip.biaya.bahanBakar || 0) + (selectedTrip.biaya.es || 0) + (selectedTrip.biaya.logistik || 0)).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

                  {/* Riwayat Titik Jaring */}
                  <div className="relative overflow-hidden rounded-xl p-5 bg-sky-50/40 border border-sky-100 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
                    <h5 className="font-bold text-sky-900 mb-4 flex items-center gap-2 pl-2">
                      <span className="text-lg">ðŸŽ£</span>
                      Riwayat Titik Jaring
                      <span className="ml-auto bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {tripFishingPoints.length}
                      </span>
                    </h5>
                    {loadingFishingPoints ? (
                      <div className="flex items-center gap-2 py-4 pl-2 text-sky-600 text-xs">
                        <RefreshCw size={14} className="animate-spin" /> Memuat data titik jaring...
                      </div>
                    ) : tripFishingPoints.length === 0 ? (
                      <div className="pl-2 py-4 text-xs text-slate-400 italic">Belum ada titik jaring yang dicatat untuk trip ini</div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pl-2">
                        {tripFishingPoints.map((point: any, idx: number) => {
                          const isDeployed = point.actionType === 'net_deployed';
                          const catches: any[] = point.hasilTangkap || [];
                          const totalBerat = catches.reduce((s: number, c: any) => s + (parseFloat(c.beratKg) || 0), 0);
                          const totalNilai = catches.reduce((s: number, c: any) => s + (parseFloat(c.totalHarga) || 0), 0);
                          return (
                            <div key={point.id || idx} className={`p-3 rounded-lg border ${
                              isDeployed ? 'bg-sky-50 border-sky-200' : 'bg-orange-50 border-orange-200'
                            }`}>
                              {/* Header titik */}
                              <div className="flex items-start gap-3">
                                <span className="text-lg shrink-0">{isDeployed ? 'ðŸŽ£' : 'â¬†ï¸'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-bold ${ isDeployed ? 'text-sky-800' : 'text-orange-800' }`}>
                                      {isDeployed ? 'Penurunan Jaring' : 'Pengangkatan Jaring'}
                                      {point.submittedByRole && (
                                        <span className="ml-2 text-[10px] font-normal text-slate-500">
                                          oleh {point.submittedByRole}
                                        </span>
                                      )}
                                    </p>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                      {new Date(point.timestamp).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-3 mt-1">
                                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                                      <MapPin size={10} />
                                      {point.location?.lat?.toFixed(5)}, {point.location?.lng?.toFixed(5)}
                                    </span>
                                    {point.depthMeters && (
                                      <span className="text-[10px] text-blue-700 font-semibold">ðŸŒŠ {point.depthMeters} m</span>
                                    )}
                                  </div>
                                  {point.notes && (
                                    <p className="text-[10px] text-slate-500 italic mt-1">{point.notes}</p>
                                  )}
                                </div>
                              </div>

                              {/* Hasil tangkap per titik */}
                              {!isDeployed && catches.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-orange-200">
                                  <p className="text-[10px] font-bold text-orange-700 uppercase mb-2">
                                    Hasil Tangkap ({catches.length} jenis)
                                  </p>
                                  <div className="space-y-1">
                                    {catches.map((c: any, ci: number) => (
                                      <div key={ci} className="flex items-center justify-between bg-white/70 px-2 py-1.5 rounded border border-orange-100">
                                        <span className="text-xs font-semibold text-slate-800">{c.jenisIkan}</span>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-600">
                                          <span className="font-bold text-orange-700">{parseFloat(c.beratKg).toFixed(1)} kg</span>
                                          {parseFloat(c.totalHarga) > 0 && (
                                            <span className="text-green-700 font-semibold">
                                              Rp {parseFloat(c.totalHarga).toLocaleString('id-ID')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-orange-200">
                                    <span className="text-[10px] font-bold text-orange-800">Total</span>
                                    <div className="flex gap-4 text-[10px]">
                                      <span className="font-bold text-orange-800">{totalBerat.toFixed(1)} kg</span>
                                      {totalNilai > 0 && (
                                        <span className="font-bold text-green-700">Rp {totalNilai.toLocaleString('id-ID')}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {!isDeployed && catches.length === 0 && (
                                <p className="text-[10px] text-slate-400 italic mt-2 pl-8">Tidak ada data tangkapan</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Catatan Trip - Premium Style */}
                  {selectedTrip.catatan && (
                    <div className="relative overflow-hidden rounded-xl p-5 bg-slate-50/40 border border-slate-100 transition-all">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400" />
                      <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Info size={16} className="text-slate-500" />
                        Catatan
                      </h5>
                      <div className="bg-white/60 p-3 rounded-xl border border-slate-100">
                        <p className="text-sm text-slate-600 italic">"{selectedTrip.catatan}"</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Riwayat Approval - Premium Style */}
                  {selectedTrip.perizinan && (
                    <div className="relative overflow-hidden rounded-xl p-5 bg-indigo-50/40 border border-indigo-100 transition-all">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                      
                      <h5 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <FileCheck size={18} className="text-indigo-600" />
                        Riwayat Persetujuan
                      </h5>
                      
                      <div className="space-y-3 pl-1">
                        {selectedTrip.perizinan.tanggalDisetujui && (
                          <div className="flex items-start gap-3 p-3 bg-green-50/60 border border-green-100 rounded-xl">
                            <div className="p-1.5 bg-green-100 rounded-full text-green-600 mt-0.5">
                              <CheckCircle2 size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-green-800">Trip Disetujui</p>
                              <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide mt-0.5">
                                {new Date(selectedTrip.perizinan.tanggalDisetujui).toLocaleString('id-ID')}
                              </p>
                              {selectedTrip.perizinan.catatan && (
                                <p className="text-xs text-green-700 mt-2 p-2 bg-green-100/50 rounded-lg italic border border-green-100">
                                  "{selectedTrip.perizinan.catatan}"
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {selectedTrip.perizinan.tanggalDitolak && (
                          <div className="flex items-start gap-3 p-3 bg-red-50/60 border border-red-100 rounded-xl">
                            <div className="p-1.5 bg-red-100 rounded-full text-red-600 mt-0.5">
                              <XCircle size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-red-800">Trip Ditolak</p>
                              <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide mt-0.5">
                                {new Date(selectedTrip.perizinan.tanggalDitolak).toLocaleString('id-ID')}
                              </p>
                              {selectedTrip.perizinan.alasanDitolak && (
                                <p className="text-xs text-red-700 mt-2 p-2 bg-red-100/50 rounded-lg italic border border-red-100">
                                  "{selectedTrip.perizinan.alasanDitolak}"
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {!selectedTrip.perizinan.tanggalDisetujui && !selectedTrip.perizinan.tanggalDitolak && (
                          <div className="flex items-start gap-3 p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
                            <div className="p-1.5 bg-amber-100 rounded-full text-amber-600 mt-0.5">
                              <Clock size={14} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-amber-800">Menunggu Persetujuan</p>
                              <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wide mt-0.5">
                                Dibuat: {new Date(selectedTrip.createdAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
            </div>

            {/* Footer Actions - Premium Style */}
            <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 flex space-x-4 sticky bottom-0 z-10">
            {selectedTrip.status === 'selesai' || selectedTrip.status === 'ditolak' ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 text-center py-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200">
                    <p className="text-sm font-medium">
                      Trip sudah {selectedTrip.status === 'selesai' ? 'selesai' : 'ditolak'}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider mt-1 opacity-70">
                      Status Final
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportTripPDF(selectedTrip)}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-sm transition-all shadow-lg"
                  >
                    <Download size={16} />
                    Export PDF
                  </button>
                </div>
              ) : canWrite ? (
                selectedTrip.status === 'darurat' ? (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'sedang_melaut', 'Status darurat dicabut/diselesaikan, kembali ke status melaut')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-white border border-emerald-200 text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Batalkan Darurat / Situasi Aman'}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'selesai', 'Trip selesai (dari kondisi darurat)')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-slate-600 text-white font-bold rounded-xl hover:bg-slate-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Selesaikan Trip'}
                  </button>
                </>
              ) : (selectedTrip.status === 'menunggu_izin' || selectedTrip.status === 'menunggu_dokumen') ? (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'ditolak', selectedTrip.status === 'menunggu_dokumen' ? 'Dokumen belum lengkap' : 'Dokumen tidak lengkap')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Tolak Izin'}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, selectedTrip.status === 'menunggu_dokumen' ? 'menunggu_izin' : 'disetujui', selectedTrip.status === 'menunggu_dokumen' ? 'Dokumen sudah lengkap, menunggu review' : 'Dokumen lengkap dan valid')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : (selectedTrip.status === 'menunggu_dokumen' ? 'Dokumen Lengkap' : 'Setujui Trip')}
                  </button>
                </>
              ) : selectedTrip.status === 'sedang_melaut' ? (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'darurat', 'Trip dihentikan karena situasi darurat')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-white border border-orange-200 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Tandai Darurat'}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'selesai', 'Trip selesai dari dashboard admin')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Selesaikan Trip'}
                  </button>
                </>
              ) : selectedTrip.status === 'disetujui' ? (
                <>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'ditolak', 'Trip dibatalkan')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Batalkan Trip'}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedTrip.id, 'sedang_melaut', 'Trip dimulai dari dashboard admin')}
                    disabled={actionLoading === selectedTrip.id}
                    className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
                  >
                    {actionLoading === selectedTrip.id ? (
                      <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Memproses...</span>
                    ) : 'Mulai Trip'}
                  </button>
                </>
              ) : (
                <div className="flex-1 text-center py-3 bg-slate-50 text-slate-500 rounded-xl">
                  <p className="text-sm font-medium">Status: {getStatusText(selectedTrip.status)}</p>
                </div>
              )
              ) : (
                <div className="flex-1 text-center py-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-200">
                  <p className="text-sm font-medium">Anda hanya dapat melihat data</p>
                  <p className="text-[10px] uppercase tracking-wider mt-1 opacity-70">Akses Read Only</p>
                </div>
              )}
              {/* Tombol Export PDF untuk semua status selain selesai/ditolak */}
              {selectedTrip.status !== 'selesai' && selectedTrip.status !== 'ditolak' && (
                <button
                  onClick={() => handleExportTripPDF(selectedTrip)}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all border border-slate-200"
                  title="Export PDF Perizinan"
                >
                  <Download size={16} />
                  PDF
                </button>
              )}
              {/* Tombol Logbook KKP â€” tampil hanya saat trip selesai */}
              {selectedTrip.status === 'selesai' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportLogbookKKP(selectedTrip, 'pdf')}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-all shadow-md"
                    title="Download Logbook KKP format PDF A3"
                  >
                    <FileText size={16} />
                    Logbook KKP
                  </button>
                  <button
                    onClick={() => handleExportLogbookKKP(selectedTrip, 'excel')}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md"
                    title="Download Logbook KKP format Excel"
                  >
                    <FileSpreadsheet size={16} />
                    .xlsx
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Approval */}
      {showApprovalModal && approvalAction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowApprovalModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  approvalAction.action === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {approvalAction.action === 'approve' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {approvalAction.action === 'approve' ? 'Setujui Trip' : 'Tolak Trip'}
                  </h3>
                  <p className="text-sm text-slate-500">{approvalAction.tripName}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {approvalAction.action === 'approve' ? 'Catatan Persetujuan' : 'Alasan Penolakan'}
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={approvalAction.action === 'approve' 
                    ? 'Masukkan catatan persetujuan...' 
                    : 'Masukkan alasan penolakan...'
                  }
                  required
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3">
                <Info size={18} className="text-blue-500 mt-0.5" />
                <p className="text-xs text-slate-600">
                  {approvalAction.action === 'approve' 
                    ? 'Trip akan disetujui dan nahkoda dapat memulai perjalanan.'
                    : 'Trip akan ditolak dan nahkoda perlu memperbaiki dokumen.'
                  }
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmApprovalAction}
                disabled={!approvalNote.trim() || !!actionLoading}
                className={`flex-1 py-2 px-4 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  approvalAction.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Memproses...' : (approvalAction.action === 'approve' ? 'Setujui' : 'Tolak')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Bulk Approval */}
      {showBulkApprovalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowBulkApprovalModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  bulkAction === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {bulkAction === 'approve' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {bulkAction === 'approve' ? 'Setujui Beberapa Trip' : 'Tolak Beberapa Trip'}
                  </h3>
                  <p className="text-sm text-slate-500">{selectedTripIds.length} trip dipilih</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Trip yang akan diproses:</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedTripIds.map(tripId => {
                    const trip = filteredTrips.find(t => t.id === tripId);
                    return (
                      <div key={tripId} className="text-xs text-slate-600">
                        â€¢ {trip?.kapal.namaKapal} - {trip?.nahkoda.nama}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {bulkAction === 'approve' ? 'Catatan Persetujuan' : 'Alasan Penolakan'}
                </label>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={bulkAction === 'approve' 
                    ? 'Masukkan catatan untuk semua trip...' 
                    : 'Masukkan alasan penolakan untuk semua trip...'
                  }
                  required
                />
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-xs text-slate-600">
                  {bulkAction === 'approve' 
                    ? `âœ… ${selectedTripIds.length} trip akan disetujui dengan catatan yang sama`
                    : `âŒ ${selectedTripIds.length} trip akan ditolak dengan alasan yang sama`
                  }
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowBulkApprovalModal(false)}
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmBulkApproval}
                disabled={!approvalNote.trim() || !!actionLoading}
                className={`flex-1 py-2 px-4 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  bulkAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Memproses...' : (bulkAction === 'approve' ? `Setujui ${selectedTripIds.length} Trip` : `Tolak ${selectedTripIds.length} Trip`)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewDoc(null)}></div>
          <div className="relative bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Preview Dokumen</h3>
                  <p className="text-xs text-white/80">{previewDoc.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm flex items-center gap-2 transition-colors"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 shadow-sm border border-rose-400 rounded-lg text-white text-sm flex items-center gap-2 transition-all ml-2"
                >
                  <X size={18} />
                  <span className="font-semibold">Tutup</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto">
              {previewDoc.type === 'pdf' ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full rounded-lg border border-slate-200 bg-white"
                  title={previewDoc.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </>
      ) : (
        <TripScheduleManagement />
      )}
    </div>
  );
};

export default TripManagement;


