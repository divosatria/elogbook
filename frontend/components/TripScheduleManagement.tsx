import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, CheckCircle, AlertCircle, Users, User, Ship, Bell, X, Edit, Trash2, FileText, Navigation, Printer } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TripTask {
  id: number;
  taskTitle: string;
  taskDescription: string;
  taskType: 'preparation' | 'departure' | 'fishing' | 'return' | 'maintenance';
  assignedTo: 'nahkoda' | 'abk' | 'all';
  scheduledDate: string;
  scheduledTime: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  notes?: string;
  catchPolygonId: number;
  catchPolygonIds?: number[]; // Multiple zonasi
  vesselId: number;
  nahkodaId?: number;
  abkIds?: number[];
  locationNotes?: string;
  harborZoneId?: number | string;
}

interface CatchPolygon {
  id: number;
  name: string;
  zoneType: 'fishing' | 'restricted' | 'conservation' | 'special';
  coordinates: any;
}

interface HarborZone {
  id: number;
  name: string;
  type: 'harbor' | 'port' | 'anchorage' | 'restricted' | 'conservation';
  is_active: boolean;
}

interface Vessel {
  id: number;
  namaKapal: string;
  nomorRegistrasi: string;
  vesselId: string;
  nahkodaId?: number;
  crewMembers?: any[];
}

interface User {
  id: number;
  nama: string;
  username: string;
  role: string;
  noTelepon?: string;
}

const TripScheduleManagement: React.FC = () => {
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [catchPolygons, setCatchPolygons] = useState<CatchPolygon[]>([]);
  const [harborZones, setHarborZones] = useState<HarborZone[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TripTask | null>(null);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [selectedZoneToAdd, setSelectedZoneToAdd] = useState<string>('');
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const tasksPerPage = 5;

  const [formData, setFormData] = useState({
    taskTitle: '',
    taskDescription: '',
    taskType: 'preparation' as const,
    assignedTo: 'all' as const,
    scheduledDate: '',
    scheduledTime: '',
    priority: 'medium' as const,
    catchPolygonId: '',
    catchPolygonIds: [] as string[], // Multiple zonasi
    locationNotes: '',
    vesselId: '',
    nahkodaId: '',
    abkIds: [] as string[],
    harborZoneId: '' // Pelabuhan keberangkatan
  });

  useEffect(() => {
    loadData();
  }, []);

  // Debug effect to log state changes
  useEffect(() => {
    console.log('Catch polygons state updated:', catchPolygons);
  }, [catchPolygons]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setTasks([]);
        setCatchPolygons([]);
        return;
      }

      const [tasksResponse, polygonsResponse, harborZonesResponse, vesselsResponse, usersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/operational-tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/catch-polygons`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/harbor-zones`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/kapal`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const parsedTasks = (tasksData.data || []).map((t: any) => {
          let parsedCatchPolygonIds = t.catchPolygonIds || [];
          let parsedAbkIds = t.abkIds || [];
          
          try {
            if (typeof t.catchPolygonIds === 'string') parsedCatchPolygonIds = JSON.parse(t.catchPolygonIds);
          } catch (e) { parsedCatchPolygonIds = []; }
          
          try {
            if (typeof t.abkIds === 'string') parsedAbkIds = JSON.parse(t.abkIds);
          } catch (e) { parsedAbkIds = []; }

          return {
            ...t,
            catchPolygonIds: parsedCatchPolygonIds,
            abkIds: parsedAbkIds
          };
        });
        setTasks(parsedTasks);
      }

      if (polygonsResponse.ok) {
        const polygonsData = await polygonsResponse.json();
        setCatchPolygons(polygonsData.data || []);
      }

      if (harborZonesResponse.ok) {
        const harborZonesData = await harborZonesResponse.json();
        // Filter only active harbor zones
        const activeHarbors = (harborZonesData.data || []).filter((zone: HarborZone) => zone.is_active);
        setHarborZones(activeHarbors);
      }

      if (vesselsResponse.ok) {
        const vesselsData = await vesselsResponse.json();
        setVessels(vesselsData.data || vesselsData || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data || usersData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const url = editingTask 
        ? `${API_BASE_URL}/api/operational-tasks/${editingTask.id}`
        : `${API_BASE_URL}/api/operational-tasks`;
      
      const method = editingTask ? 'PUT' : 'POST';
      
      const submitData: any = {
        taskTitle: formData.taskTitle,
        taskDescription: formData.taskDescription,
        taskType: formData.taskType,
        assignedTo: formData.assignedTo,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        priority: formData.priority,
        vesselId: parseInt(formData.vesselId),
        nahkodaId: formData.nahkodaId ? parseInt(formData.nahkodaId) : null,
        abkIds: formData.abkIds.length > 0 ? formData.abkIds.map(id => parseInt(id)) : null,
        locationNotes: formData.locationNotes,
        harborZoneId: formData.harborZoneId ? parseInt(formData.harborZoneId) : null
      };
      
      // Handle multiple catch polygons
      if (formData.catchPolygonIds.length > 0) {
        submitData.catchPolygonIds = formData.catchPolygonIds.map(id => parseInt(id));
      }
      
      // Backward compatibility - single catch polygon
      if (formData.catchPolygonId && formData.catchPolygonId !== '') {
        submitData.catchPolygonId = parseInt(formData.catchPolygonId);
      }
      
      console.log('Submitting task data:', submitData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        await loadData();
        resetForm();
        alert(editingTask ? 'Tugas berhasil diperbarui!' : 'Tugas berhasil dibuat!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Gagal menyimpan tugas');
    }
  };

  const handleCompleteTask = async (taskId: number, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/operational-tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        await loadData();
        alert('Tugas berhasil diselesaikan!');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Gagal menyelesaikan tugas');
    }
  };

  const handleCreateTripFromTask = async (task: TripTask) => {
    if (!confirm(`Buat trip dari jadwal "${task.taskTitle}"?\n\nTrip akan dibuat dan masuk ke Perizinan Trip untuk review dokumen.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Get vessel details
      const vessel = vessels.find(v => v.id === task.vesselId);
      if (!vessel) {
        alert('Kapal tidak ditemukan!');
        return;
      }

      // Calculate trip dates based on task
      const taskDate = new Date(task.scheduledDate);
      const estimatedReturn = new Date(taskDate);
      estimatedReturn.setDate(estimatedReturn.getDate() + 7); // Default 7 days

      const tripData = {
        kapalId: task.vesselId,
        nahkodaId: task.nahkodaId,
        awakKapal: task.abkIds || [],
        tanggalBerangkat: task.scheduledDate,
        estimasiPulang: estimatedReturn.toISOString().split('T')[0],
        durasi: 7,
        areaTangkap: {
          nama: task.catchPolygonIds && task.catchPolygonIds.length > 0 
            ? catchPolygons.filter(p => task.catchPolygonIds.includes(p.id)).map(p => p.name).join(', ')
            : catchPolygons.find(p => p.id === task.catchPolygonId)?.name || 'Area tidak diset',
          zona: 'Zona dari jadwal tugas'
        },
        targetIkan: 'Sesuai jadwal tugas',
        estimasiBerat: 1000, // Default estimate
        harborZoneId: task.harborZoneId || null,
        catatan: `📋 SURAT TUGAS\n\nJudul: ${task.taskTitle}\nDeskripsi: ${task.taskDescription || 'Tidak ada deskripsi'}\nJenis Tugas: ${getTaskTypeLabel(task.taskType)}\nPrioritas: ${task.priority}\n\nCatatan Lokasi: ${task.locationNotes || 'Tidak ada catatan lokasi'}\n\n⚠️ Nahkoda dan ABK wajib upload dokumen kapal sebelum berlayar.`,
        // Set status awal untuk menunggu dokumen
        status: 'menunggu_dokumen'
      };

      const response = await fetch(`${API_BASE_URL}/api/trip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tripData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Jadwal Trip berhasil dibuat!\n\n📋 Trip ID: ${result.data.id}\n🚢 Kapal: ${vessel.namaKapal}\n📅 Tanggal: ${new Date(task.scheduledDate).toLocaleDateString('id-ID')}\n\n➡️ Trip sudah masuk ke tab "Perizinan Trip"\n📱 Nahkoda & ABK akan dapat notifikasi di mobile app\n📄 Menunggu upload dokumen dari nahkoda`);
        
        // Mark task as completed with note
        await handleCompleteTask(task.id, `✅ Trip telah dibuat dari jadwal ini.\n📋 Trip ID: ${result.data.id}\n📱 Nahkoda & ABK sudah dapat notifikasi tugas.`);
      } else {
        const error = await response.json();
        alert(`❌ Gagal membuat trip: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating trip from task:', error);
      alert('❌ Gagal membuat trip dari jadwal tugas');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Yakin ingin menghapus tugas ini?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/operational-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await loadData();
        alert('Tugas berhasil dihapus!');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Gagal menghapus tugas');
    }
  };

  // Auto-populate crew when vessel is selected
  const handleVesselChange = async (vesselId: string) => {
    setFormData({...formData, vesselId, nahkodaId: '', abkIds: []});
    
    if (!vesselId) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Get vessel details with crew info
      const response = await fetch(`${API_BASE_URL}/api/kapal/${vesselId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const vesselData = await response.json();
        const vessel = vesselData.data || vesselData;
        
        // Auto-populate nahkoda if assigned
        if (vessel.nahkodaId) {
          setFormData(prev => ({...prev, nahkodaId: vessel.nahkodaId.toString()}));
        }
        
        // Auto-populate ABK if assigned
        if (vessel.crewMembers && vessel.crewMembers.length > 0) {
          const abkIds = vessel.crewMembers
            .filter(crew => crew.User && crew.User.role === 'abk')
            .map(crew => crew.User.id.toString());
          setFormData(prev => ({...prev, abkIds}));
        }
      }
    } catch (error) {
      console.error('Error loading vessel crew:', error);
    }
  };

  const generateTaskLetter = (task: TripTask) => {
    const doc = new jsPDF();
    const vessel = vessels.find(v => v.id === task.vesselId);
    const nahkoda = users.find(u => u.id === task.nahkodaId);
    const assignedAbk = users.filter(u => task.abkIds?.includes(u.id));
    const catchPolygon = catchPolygons.find(p => p.id === task.catchPolygonId);
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT TUGAS KAPAL', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PT. SAMUDERA JAYA ABADI', 105, 26, { align: 'center' });
    doc.text('Jl. Pelabuhan Perikanan No. 10, Jakarta Utara', 105, 30, { align: 'center' });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    // Letter Info
    doc.setFontSize(11);
    doc.text(`Nomor: ST/${new Date().getFullYear()}/${task.id.toString().padStart(4, '0')}`, 20, 45);
    doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 140, 45);
    
    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DIBERIKAN KEPADA:', 105, 55, { align: 'center' });
    
    // Personnel Table
    const personnelData = [
      ['Jabatan', 'Nama', 'ID/Keterangan'],
      ['Nahkoda', nahkoda?.nama || '-', nahkoda?.username || '-'],
      ...assignedAbk.map(abk => ['ABK (Crew)', abk.nama, abk.username])
    ];

    autoTable(doc, {
      startY: 60,
      head: [personnelData[0]],
      body: personnelData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 20, right: 20 }
    });
    
    // Task Details
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL PENUGASAN:', 20, finalY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const details = [
      ['Judul Tugas', task.taskTitle],
      ['Jenis Tugas', getTaskTypeLabel(task.taskType)],
      ['Prioritas', task.priority.toUpperCase()],
      ['Jadwal', `${new Date(task.scheduledDate).toLocaleDateString('id-ID')} ${task.scheduledTime}`],
      ['Kapal', vessel ? `${vessel.namaKapal} (${vessel.vesselId || vessel.nomorRegistrasi})` : '-'],
      ['Lokasi / Zonasi', catchPolygon ? `${catchPolygon.name} (${catchPolygon.zoneType})` : '-'],
      ['Status', 'TERLAKSANA / SELESAI'],
      ['Waktu Penyelesaian', task.completedAt ? new Date(task.completedAt).toLocaleString('id-ID') : '-']
    ];

    autoTable(doc, {
      startY: finalY + 5,
      body: details,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      margin: { left: 20, right: 20 }
    });

    // Description
    const descY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Deskripsi / Catatan:', 20, descY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitDesc = doc.splitTextToSize(task.taskDescription || '-', 170);
    doc.text(splitDesc, 20, descY + 12);
    
    // Footer Signature
    const sigY = descY + 20 + (splitDesc.length * 5);
    
    doc.text('Mengetahui,', 140, sigY);
    doc.text('Kepala Operasional', 140, sigY + 5);
    doc.text('( ........................... )', 140, sigY + 25);
    
    // Open PDF
    doc.save(`Surat_Tugas_${task.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const resetForm = () => {
    setFormData({
      taskTitle: '',
      taskDescription: '',
      taskType: 'preparation',
      assignedTo: 'all',
      scheduledDate: '',
      scheduledTime: '',
      priority: 'medium',
      catchPolygonId: '',
      catchPolygonIds: [],
      locationNotes: '',
      vesselId: '',
      nahkodaId: '',
      abkIds: [],
      harborZoneId: ''
    });
    setSelectedZoneToAdd('');
    setShowAddForm(false);
    setEditingTask(null);
  };

  const handleEdit = (task: TripTask) => {
    setFormData({
      taskTitle: task.taskTitle,
      taskDescription: task.taskDescription || '',
      taskType: task.taskType as any,
      assignedTo: task.assignedTo as any,
      scheduledDate: task.scheduledDate.split('T')[0],
      scheduledTime: task.scheduledTime,
      priority: task.priority as any,
      catchPolygonId: task.catchPolygonId?.toString() || '',
      catchPolygonIds: task.catchPolygonIds?.map(id => id.toString()) || [],
      locationNotes: task.locationNotes || '',
      vesselId: task.vesselId?.toString() || '',
      nahkodaId: task.nahkodaId?.toString() || '',
      abkIds: task.abkIds?.map(id => id.toString()) || [],
      harborZoneId: (task as any).harborZoneId?.toString() || ''
    });
    setEditingTask(task);
    setShowAddForm(true);
  };

  const getTaskTypeLabel = (type: string) => {
    const labels = {
      preparation: 'Persiapan',
      departure: 'Keberangkatan',
      fishing: 'Penangkapan',
      return: 'Kepulangan',
      maintenance: 'Perawatan'
    };
    return labels[type] || type;
  };

  const getAssignedToLabel = (assignedTo: string) => {
    const labels = {
      nahkoda: 'Nahkoda',
      abk: 'ABK',
      all: 'Semua Crew'
    };
    return labels[assignedTo] || assignedTo;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || colors.pending;
  };

  const filteredTasks = selectedZone 
    ? tasks.filter(task => 
        (task.catchPolygonIds && task.catchPolygonIds.includes(selectedZone)) || 
        task.catchPolygonId === selectedZone
      )
    : tasks;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="pr-4">
          <h2 className="text-lg font-bold text-slate-800">Jadwal Tugas & Surat Tugas</h2>
          <p className="text-xs text-slate-500 mt-1">
            Buat jadwal trip untuk nahkoda & ABK. Setelah jadwal dibuat, klik tombol 
            <Ship size={12} className="inline mx-1" /> untuk mengirim ke Perizinan Trip dan notifikasi mobile app.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center hover:bg-blue-700 transition-all whitespace-nowrap shrink-0"
        >
          <Plus size={18} className="mr-2" />
          Tambah Tugas
        </button>
      </div>

      {/* Zone Filter */}
      <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm w-fit">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter Zonasi:</label>
          <div className="relative">
            <select
              value={selectedZone || ''}
              onChange={(e) => {
                setSelectedZone(e.target.value ? parseInt(e.target.value) : null);
                setCurrentTaskPage(1);
              }}
              className="px-3 py-1.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs font-medium text-slate-700 appearance-none cursor-pointer"
            >
              <option value="">Semua Zonasi</option>
              {catchPolygons.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form - Modal Popup */}
      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-white px-5 py-3 sticky top-0 z-10 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 rounded-lg">
                    <Edit className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {editingTask ? 'Edit Jadwal Tugas' : 'Buat Jadwal Baru'}
                    </h3>
                    <p className="text-xs text-slate-500">Masukan detail operasional kapal dan crew</p>
                  </div>
                </div>
                <button 
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                
                {/* SECTION 1: Detail Tugas */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <FileText size={14} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Informasi Umum</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Judul Tugas <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.taskTitle}
                        onChange={(e) => setFormData({...formData, taskTitle: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 placeholder:text-slate-400"
                        placeholder="Contoh: Trip Penangkapan Zona Utara"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Jenis Operasi</label>
                      <div className="relative">
                        <select
                          value={formData.taskType}
                          onChange={(e) => setFormData({...formData, taskType: e.target.value as any})}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none cursor-pointer"
                        >
                          <option value="preparation">Persiapan</option>
                          <option value="departure">Keberangkatan</option>
                          <option value="fishing">Penangkapan</option>
                          <option value="return">Kepulangan</option>
                          <option value="maintenance">Perawatan</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Deskripsi & Instruksi</label>
                      <textarea
                        value={formData.taskDescription}
                        onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-slate-700 placeholder:text-slate-400"
                        rows={2}
                        placeholder="Berikan instruksi detail untuk crew..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Lokasi & Waktu */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Navigation size={14} className="text-emerald-500" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lokasi & Jadwal</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Zonasi Selection */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Zonasi Tangkap</label>
                      
                      <div className="p-1 bg-slate-50/50 rounded-lg border border-slate-200/60">
                        {/* Active Selection List */}
                        {formData.catchPolygonIds.length > 0 && (
                          <div className="p-2 flex flex-wrap gap-1.5">
                            {formData.catchPolygonIds.map(id => {
                              const polygon = catchPolygons.find(p => p.id.toString() === id);
                              return polygon ? (
                                <div key={id} className={`pl-2.5 pr-1.5 py-1 rounded-md flex items-center gap-1.5 border text-xs font-bold ${
                                  polygon.zoneType === 'fishing' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                                  'bg-blue-50 border-blue-200 text-blue-700'
                                }`}>
                                  <span>{polygon.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newIds = formData.catchPolygonIds.filter(selectedId => selectedId !== id);
                                      setFormData({...formData, catchPolygonIds: newIds});
                                    }}
                                    className="p-0.5 hover:bg-black/5 rounded-md transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Add Zone Controls */}
                        <div className="flex gap-2 p-1.5">
                          <div className="relative flex-1">
                            <select
                              value={selectedZoneToAdd}
                              onChange={(e) => setSelectedZoneToAdd(e.target.value)}
                              className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs text-slate-700 appearance-none cursor-pointer shadow-sm"
                            >
                              <option value="">+ Pilih Area Tangkap...</option>
                              {catchPolygons
                                .filter(polygon => !formData.catchPolygonIds.includes(polygon.id.toString()))
                                .map(polygon => (
                                  <option key={polygon.id} value={polygon.id}>
                                    {polygon.name} ({polygon.zoneType === 'fishing' ? 'Zona Hijau' : 'Zona Merah'})
                                  </option>
                                ))
                              }
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                              <Navigation size={12} />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedZoneToAdd && !formData.catchPolygonIds.includes(selectedZoneToAdd)) {
                                setFormData({
                                  ...formData, 
                                  catchPolygonIds: [...formData.catchPolygonIds, selectedZoneToAdd]
                                });
                                setSelectedZoneToAdd('');
                              }
                            }}
                            disabled={!selectedZoneToAdd}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 rounded-lg font-bold transition-all shadow-sm hover:shadow active:scale-95"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 px-1">
                        * Pilih zonasi dari dropdown untuk menentukan area operasi kapal
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Waktu <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input
                          type="time"
                          value={formData.scheduledTime}
                          onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"
                          required
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Pelabuhan Keberangkatan</label>
                      <div className="relative">
                        <select
                          value={formData.harborZoneId}
                          onChange={(e) => setFormData({...formData, harborZoneId: e.target.value})}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800 appearance-none cursor-pointer"
                        >
                          <option value="">-- Pilih Pelabuhan --</option>
                          {harborZones.map(harbor => (
                            <option key={harbor.id} value={harbor.id}>
                              {harbor.name} ({harbor.type === 'harbor' ? 'Pelabuhan' : harbor.type === 'port' ? 'Pelabuhan Besar' : 'Zona Berlabuh'})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 px-1">
                        * Pilih pelabuhan tempat kapal akan berangkat
                      </p>
                    </div>
                    
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Catatan Lokasi</label>
                      <input
                        type="text"
                        value={formData.locationNotes}
                        onChange={(e) => setFormData({...formData, locationNotes: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                        placeholder="Detail koordinat atau landmark..."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Armada & Crew */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Ship size={14} className="text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Armada & Crew</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Kapal <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <select
                          value={formData.vesselId}
                          onChange={(e) => handleVesselChange(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-800 appearance-none cursor-pointer"
                          required
                        >
                          <option value="">-- Pilih Kapal --</option>
                          {vessels.map(vessel => (
                            <option key={vessel.id} value={vessel.id}>
                              {vessel.namaKapal} ({vessel.vesselId || vessel.nomorRegistrasi})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                          <Ship size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Prioritas</label>
                      <div className="flex gap-1.5">
                        {['low', 'medium', 'high', 'urgent'].map((p) => (
                           <button
                              key={p}
                              type="button"
                              onClick={() => setFormData({...formData, priority: p as any})}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                                formData.priority === p 
                                  ? getPriorityColor(p) + ' border-transparent shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                              }`}
                           >
                             {p === 'low' ? 'Low' : p === 'medium' ? 'Med' : p === 'high' ? 'High' : 'Urgent'}
                           </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Nahkoda</label>
                      <select
                        value={formData.nahkodaId}
                        onChange={(e) => setFormData({...formData, nahkodaId: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700"
                      >
                        <option value="">-- Pilih Nahkoda --</option>
                        {users.filter(user => user.role === 'nahkoda').map(nahkoda => (
                          <option key={nahkoda.id} value={nahkoda.id}>
                            {nahkoda.nama || nahkoda.username}
                            {formData.vesselId && vessels.find(v => v.id.toString() === formData.vesselId)?.nahkodaId === nahkoda.id ? ' (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Target Penugasan</label>
                      <select
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({...formData, assignedTo: e.target.value as any})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700"
                      >
                        <option value="all">Semua Crew (Nahkoda & ABK)</option>
                        <option value="nahkoda">Hanya Nahkoda</option>
                        <option value="abk">Hanya ABK</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">
                        Pilih Crew (ABK)
                      </label>
                      <div className="relative">
                        <select
                          value={formData.abkIds[0] || ''}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            setFormData({...formData, abkIds: selectedId ? [selectedId] : []});
                          }}
                          className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium text-slate-700 appearance-none cursor-pointer"
                        >
                          <option value="">-- Pilih Salah Satu ABK --</option>
                          {users.filter(user => user.role === 'abk').map(abk => (
                            <option key={abk.id} value={abk.id}>
                              {abk.nama || abk.username}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                          <Users size={14} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 px-1">
                        * Untuk saat ini hanya dapat memilih 1 ABK utama per jadwal
                      </p>
                    </div>
                  </div>
                </div>

                {/* INFO BOX */}
                <div className="md:col-span-2">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex gap-3">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm h-fit">
                      <Bell size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs mb-1">Alur Jadwal Otomatis</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                        Setelah jadwal dibuat, sistem akan otomatis mengirim notifikasi ke Nahkoda & ABK. 
                        Tombol "Kirim Dokumen" akan muncul untuk memulai proses perizinan.
                      </p>
                      <div className="flex gap-1.5 items-center">
                        <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-700 border border-blue-100">1. Jadwal</span>
                        <span className="text-slate-300 text-xs">→</span>
                        <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-700 border border-blue-100">2. Notifikasi</span>
                        <span className="text-slate-300 text-xs">→</span>
                        <span className="px-2 py-0.5 bg-white rounded text-[10px] font-bold text-blue-700 border border-blue-100">3. Upload Dokumen</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </form>
            </div>

            {/* Modal Footer - Sticky Actions */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-xs"
              >
                Batalkan
              </button>
              <button
                type="submit"
                form="task-form-unused"
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.querySelector('form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transform active:scale-[0.98] transition-all text-xs flex items-center gap-1.5"
              >
                <CheckCircle size={14} />
                {editingTask ? 'Simpan Perubahan' : 'Buat Jadwal Baru'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[25%]">Informasi Tugas</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Masuk Zonasi & Kapal</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Jadwal & Crew</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">Status & Prioritas</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[15%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(() => {
              const indexOfLast = currentTaskPage * tasksPerPage;
              const indexOfFirst = indexOfLast - tasksPerPage;
              return filteredTasks.slice(indexOfFirst, indexOfLast);
            })().map((task) => {
              const catchPolygon = catchPolygons.find(p => p.id === task.catchPolygonId);
              const vessel = vessels.find(v => v.id === task.vesselId);
              const nahkoda = users.find(u => u.id === task.nahkodaId);
              const assignedAbk = users.filter(u => task.abkIds?.includes(u.id));
              
              return (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 align-top">
                    <div>
                      <p className="font-bold text-slate-800 text-sm mb-1">{task.taskTitle}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                         <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                            {getTaskTypeLabel(task.taskType)}
                         </span>
                         <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                            {getAssignedToLabel(task.assignedTo)}
                         </span>
                      </div>
                      {task.taskDescription && (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{task.taskDescription}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="space-y-3">
                      {/* Zonasi */}
                      <div>
                        {task.catchPolygonIds && task.catchPolygonIds.length > 0 ? (
                           <div className="flex flex-wrap gap-1.5">
                             {task.catchPolygonIds.map(polygonId => {
                               const catchPolygon = catchPolygons.find(p => p.id === polygonId);
                               return catchPolygon ? (
                                 <span key={polygonId} className={`text-[10px] px-2 py-1 rounded-md font-bold border ${
                                   catchPolygon.zoneType === 'fishing' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                   'bg-rose-50 text-rose-700 border-rose-100'
                                 }`}>
                                   {catchPolygon.name}
                                 </span>
                               ) : null;
                             })}
                           </div>
                        ) : (
                          catchPolygon && (
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold border ${
                              catchPolygon.zoneType === 'fishing' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {catchPolygon.name}
                            </span>
                          )
                        )}
                      </div>
                      
                      {/* Kapal */}
                      {vessel ? (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Ship size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">{vessel.namaKapal}</p>
                            <p className="text-[10px] text-slate-500">{vessel.vesselId || vessel.nomorRegistrasi}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada kapal</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{new Date(task.scheduledDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock size={14} className="text-slate-400" />
                        <span>{task.scheduledTime}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 mt-2">
                        {nahkoda && (
                          <div className="text-xs mb-1">
                            <span className="text-slate-500">Nahkoda:</span> <span className="font-semibold text-slate-700">{nahkoda.nama || nahkoda.username}</span>
                          </div>
                        )}
                        {assignedAbk.length > 0 && (
                          <div className="text-xs">
                             <span className="text-slate-500">Crew:</span> <span className="font-semibold text-slate-700">{assignedAbk.length} Personil</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-col gap-3 items-center">
                      {/* Priority with Dot Indicator */}
                      <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${
                            task.priority === 'urgent' ? 'bg-red-500' :
                            task.priority === 'high' ? 'bg-orange-500' :
                            task.priority === 'medium' ? 'bg-blue-500' :
                            'bg-slate-400'
                         }`}></span>
                         <span className={`text-xs font-bold ${
                            task.priority === 'urgent' ? 'text-red-700' :
                            task.priority === 'high' ? 'text-orange-700' :
                            task.priority === 'medium' ? 'text-blue-700' :
                            'text-slate-600'
                         }`}>
                           {task.priority === 'low' ? 'Low' : 
                            task.priority === 'medium' ? 'Medium' :
                            task.priority === 'high' ? 'High' : 'Urgent'}
                         </span>
                      </div>

                      {/* Status Badge - Pill Style */}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        task.status === 'cancelled' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {task.status === 'pending' ? 'Menunggu' :
                         task.status === 'in_progress' ? 'Berlangsung' :
                         task.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top text-center">
                    <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {task.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleCreateTripFromTask(task)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                            title="Proses Perizinan"
                          >
                            <Ship size={16} />
                          </button>
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                            title="Selesaikan"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        </>
                      )}
                      
                      {(task.status === 'completed' || task.status === 'confirmed' as any) && (
                        <button
                          onClick={() => generateTaskLetter(task)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Cetak Surat Tugas"
                        >
                          <Printer size={16} />
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex items-center gap-1.5 text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                          <CheckCircle size={14} />
                          <span className="text-xs font-bold">Terlaksana</span>
                        </div>
                      )}
                      
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
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
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  {selectedZone ? 'Belum ada tugas untuk zonasi ini' : 'Belum ada tugas operasional'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {!loading && filteredTasks.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Menampilkan <span className="font-semibold">{Math.min((currentTaskPage - 1) * tasksPerPage + 1, filteredTasks.length)}</span> - <span className="font-semibold">{Math.min(currentTaskPage * tasksPerPage, filteredTasks.length)}</span> dari <span className="font-semibold">{filteredTasks.length}</span> tugas
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTaskPage(prev => Math.max(prev - 1, 1))}
                disabled={currentTaskPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                Halaman <span className="font-bold">{currentTaskPage}</span> dari <span className="font-bold">{Math.ceil(filteredTasks.length / tasksPerPage)}</span>
              </div>
              <button
                onClick={() => setCurrentTaskPage(prev => Math.min(prev + 1, Math.ceil(filteredTasks.length / tasksPerPage)))}
                disabled={currentTaskPage >= Math.ceil(filteredTasks.length / tasksPerPage)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripScheduleManagement;