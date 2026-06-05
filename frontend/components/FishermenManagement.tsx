import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Phone, MapPin, Calendar, Camera, User, Eye, Award } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface Certificate {
  name: string;
  file: string; // base64 or file path
}

interface Fisherman {
  _id: string;
  nama: string;
  nik: string;
  noTelepon: string;
  alamat: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  foto?: string;
  status: 'active' | 'inactive';
  pengalaman: number;
  sertifikat: Certificate[];
  // Optional fields from database
  email?: string;
  statusPernikahan?: 'belum_menikah' | 'menikah' | 'cerai';
  pendidikan?: 'SD' | 'SMP' | 'SMA' | 'D3' | 'S1' | 'S2' | 'S3';
  kontakDarurat?: { nama: string; noTelepon: string; hubungan: string };
  catatan?: string;
}

const FishermenManagement: React.FC = () => {
  const [fishermen, setFishermen] = useState<Fisherman[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFisherman, setEditingFisherman] = useState<Fisherman | null>(null);
  const [viewingFisherman, setViewingFisherman] = useState<Fisherman | null>(null);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    noTelepon: '',
    alamat: '',
    tanggalLahir: '',
    jenisKelamin: 'L' as 'L' | 'P',
    pengalaman: 0,
    sertifikat: [] as Certificate[],
    // Optional fields from database
    email: '',
    statusPernikahan: 'belum_menikah' as 'belum_menikah' | 'menikah' | 'cerai',
    pendidikan: 'SMA' as 'SD' | 'SMP' | 'SMA' | 'D3' | 'S1' | 'S2' | 'S3',
    kontakDarurat: { nama: '', noTelepon: '', hubungan: '' },
    catatan: ''
  });

  useEffect(() => {
    fetchFishermen();
  }, []);

  const fetchFishermen = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setFishermen([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/nahkoda`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const transformedFishermen = data.map((fisherman: any) => ({
          _id: fisherman.id.toString(),
          nama: fisherman.nama,
          nik: fisherman.nik,
          noTelepon: fisherman.noTelepon,
          alamat: fisherman.alamat,
          tanggalLahir: fisherman.tanggalLahir,
          jenisKelamin: fisherman.jenisKelamin,
          foto: fisherman.foto || '',
          status: fisherman.status || 'active',
          pengalaman: fisherman.pengalaman || 0,
          sertifikat: fisherman.sertifikat || []
        }));
        setFishermen(transformedFishermen);
      } else {
        setFishermen([]);
      }
    } catch (error) {
      console.error('Error fetching fishermen:', error);
      setFishermen([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockFishermen: Fisherman[] = [
      {
        _id: '1',
        nama: 'Ahmad Suryadi',
        nik: '3201234567890001',
        noTelepon: '081234567890',
        alamat: 'Jl. Pantai Indah No. 123, Pelabuhan Ratu',
        tanggalLahir: '1985-05-15',
        jenisKelamin: 'L',
        foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status: 'active',
        pengalaman: 15,
        sertifikat: [
          { name: 'Sertifikat Keselamatan Laut', file: '' },
          { name: 'Sertifikat Penangkapan Ikan', file: '' }
        ]
      },
      {
        _id: '2',
        nama: 'Siti Nurhaliza',
        nik: '3201234567890002',
        noTelepon: '081234567891',
        alamat: 'Jl. Nelayan Sejahtera No. 45, Muara Angke',
        tanggalLahir: '1990-08-22',
        jenisKelamin: 'P',
        status: 'active',
        pengalaman: 8,
        sertifikat: [{ name: 'Sertifikat Pengolahan Ikan', file: '' }]
      }
    ];
    setFishermen(mockFishermen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        handleLocalSubmit();
        return;
      }
      
      const fisherData = {
        nama: formData.nama,
        nik: formData.nik,
        noTelepon: formData.noTelepon,
        alamat: formData.alamat,
        tanggalLahir: formData.tanggalLahir,
        jenisKelamin: formData.jenisKelamin,
        foto: photoPreview,
        pengalaman: formData.pengalaman,
        sertifikat: formData.sertifikat,
        email: formData.email || null,
        statusPernikahan: formData.statusPernikahan,
        pendidikan: formData.pendidikan,
        kontakDarurat: formData.kontakDarurat.nama ? formData.kontakDarurat : null,
        catatan: formData.catatan || null
      };

      const url = editingFisherman ? `${API_BASE_URL}/api/nahkoda/${editingFisherman._id}` : `${API_BASE_URL}/api/nahkoda`;
      const method = editingFisherman ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fisherData)
      });

      if (response.ok) {
        await fetchFishermen();
        resetForm();
        alert(editingFisherman ? 'Data nahkoda berhasil diupdate!' : 'Data nahkoda berhasil ditambahkan!');
      } else if (response.status === 401) {
        handleLocalSubmit();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving fisherman:', error);
      handleLocalSubmit();
    }
  };

  const handleLocalSubmit = () => {
    if (editingFisherman) {
      setFishermen(prev => prev.map(f => 
        f._id === editingFisherman._id 
          ? {
              ...f,
              nama: formData.nama,
              nik: formData.nik,
              noTelepon: formData.noTelepon,
              alamat: formData.alamat,
              tanggalLahir: formData.tanggalLahir,
              jenisKelamin: formData.jenisKelamin,
              foto: photoPreview,
              pengalaman: formData.pengalaman,
              sertifikat: formData.sertifikat,
              email: formData.email || undefined,
              statusPernikahan: formData.statusPernikahan,
              pendidikan: formData.pendidikan,
              kontakDarurat: formData.kontakDarurat.nama ? formData.kontakDarurat : undefined,
              catatan: formData.catatan || undefined
            }
          : f
      ));
    } else {
      const newFisherman: Fisherman = {
        _id: Date.now().toString(),
        nama: formData.nama,
        nik: formData.nik,
        noTelepon: formData.noTelepon,
        alamat: formData.alamat,
        tanggalLahir: formData.tanggalLahir,
        jenisKelamin: formData.jenisKelamin,
        foto: photoPreview,
        status: 'active',
        pengalaman: formData.pengalaman,
        sertifikat: formData.sertifikat,
        email: formData.email || undefined,
        statusPernikahan: formData.statusPernikahan,
        pendidikan: formData.pendidikan,
        kontakDarurat: formData.kontakDarurat.nama ? formData.kontakDarurat : undefined,
        catatan: formData.catatan || undefined
      };
      setFishermen(prev => [...prev, newFisherman]);
    }
    
    resetForm();
    alert(editingFisherman ? 'Data nahkoda berhasil diupdate!' : 'Data nahkoda berhasil ditambahkan!');
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      nik: '',
      noTelepon: '',
      alamat: '',
      tanggalLahir: '',
      jenisKelamin: 'L',
      pengalaman: 0,
      sertifikat: [],
      email: '',
      statusPernikahan: 'belum_menikah',
      pendidikan: 'SMA',
      kontakDarurat: { nama: '', noTelepon: '', hubungan: '' },
      catatan: ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setShowAddForm(false);
    setEditingFisherman(null);
  };

  const handleEdit = (fisherman: Fisherman) => {
    setFormData({
      nama: fisherman.nama,
      nik: fisherman.nik,
      noTelepon: fisherman.noTelepon,
      alamat: fisherman.alamat,
      tanggalLahir: fisherman.tanggalLahir,
      jenisKelamin: fisherman.jenisKelamin,
      pengalaman: fisherman.pengalaman,
      sertifikat: fisherman.sertifikat,
      email: fisherman.email || '',
      statusPernikahan: fisherman.statusPernikahan || 'belum_menikah',
      pendidikan: fisherman.pendidikan || 'SMA',
      kontakDarurat: fisherman.kontakDarurat || { nama: '', noTelepon: '', hubungan: '' },
      catatan: fisherman.catatan || ''
    });
    setPhotoFile(null);
    setPhotoPreview(fisherman.foto || '');
    setEditingFisherman(fisherman);
    setShowAddForm(true);
  };

  const handleDelete = async (fishermanId: string) => {
    if (confirm('Yakin ingin menghapus data nahkoda ini?')) {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setFishermen(prev => prev.filter(f => f._id !== fishermanId));
          alert('Data nelayan berhasil dihapus!');
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/nahkoda/${fishermanId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          await fetchFishermen();
          alert('Data nahkoda berhasil dihapus!');
        } else if (response.status === 401) {
          setFishermen(prev => prev.filter(f => f._id !== fishermanId));
          alert('Data nahkoda berhasil dihapus!');
        } else {
          const error = await response.json();
          alert(`Error: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting fisherman:', error);
        setFishermen(prev => prev.filter(f => f._id !== fishermanId));
        alert('Data nahkoda berhasil dihapus!');
      }
    }
  };

  const handleCertificateAdd = () => {
    setFormData({
      ...formData,
      sertifikat: [...formData.sertifikat, { name: '', file: '' }]
    });
  };

  const handleCertificateRemove = (index: number) => {
    setFormData({
      ...formData,
      sertifikat: formData.sertifikat.filter((_, i) => i !== index)
    });
  };

  const handleCertificateChange = (index: number, field: 'name' | 'file', value: string) => {
    const updatedCertificates = [...formData.sertifikat];
    updatedCertificates[index] = { ...updatedCertificates[index], [field]: value };
    setFormData({ ...formData, sertifikat: updatedCertificates });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCertificateFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleCertificateChange(index, 'file', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Data Nahkoda</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus size={18} className="mr-2" />
          Tambah Nahkoda
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">
            {editingFisherman ? 'Edit Data Nahkoda' : 'Tambah Nahkoda Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({...formData, nama: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">NIK</label>
              <input
                type="text"
                value={formData.nik}
                onChange={(e) => setFormData({...formData, nik: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">No. Telepon</label>
              <input
                type="tel"
                value={formData.noTelepon}
                onChange={(e) => setFormData({...formData, noTelepon: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Lahir</label>
              <input
                type="date"
                value={formData.tanggalLahir}
                onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Jenis Kelamin</label>
              <select
                value={formData.jenisKelamin}
                onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value as 'L' | 'P'})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pengalaman (tahun)</label>
              <input
                type="number"
                value={formData.pengalaman}
                onChange={(e) => setFormData({...formData, pengalaman: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email <span className="text-slate-400">(opsional)</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Status Pernikahan <span className="text-slate-400">(opsional)</span></label>
              <select
                value={formData.statusPernikahan}
                onChange={(e) => setFormData({...formData, statusPernikahan: e.target.value as any})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="belum_menikah">Belum Menikah</option>
                <option value="menikah">Menikah</option>
                <option value="cerai">Cerai</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pendidikan <span className="text-slate-400">(opsional)</span></label>
              <select
                value={formData.pendidikan}
                onChange={(e) => setFormData({...formData, pendidikan: e.target.value as any})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="D3">D3</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Alamat</label>
              <textarea
                value={formData.alamat}
                onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                rows={3}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Kontak Darurat <span className="text-slate-400">(opsional)</span></label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nama kontak darurat"
                  value={formData.kontakDarurat.nama}
                  onChange={(e) => setFormData({...formData, kontakDarurat: {...formData.kontakDarurat, nama: e.target.value}})}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="No. telepon darurat"
                  value={formData.kontakDarurat.noTelepon}
                  onChange={(e) => setFormData({...formData, kontakDarurat: {...formData.kontakDarurat, noTelepon: e.target.value}})}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Hubungan (keluarga, teman, dll)"
                  value={formData.kontakDarurat.hubungan}
                  onChange={(e) => setFormData({...formData, kontakDarurat: {...formData.kontakDarurat, hubungan: e.target.value}})}
                  className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Catatan <span className="text-slate-400">(opsional)</span></label>
              <textarea
                value={formData.catatan}
                onChange={(e) => setFormData({...formData, catatan: e.target.value})}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Catatan tambahan tentang nelayan"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Foto</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Sertifikat</label>
                <button
                  type="button"
                  onClick={handleCertificateAdd}
                  className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                >
                  + Tambah Sertifikat
                </button>
              </div>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {formData.sertifikat.map((cert, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-3 border border-slate-200 rounded-lg">
                    <input
                      type="text"
                      placeholder="Nama sertifikat"
                      value={cert.name}
                      onChange={(e) => handleCertificateChange(index, 'name', e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleCertificateFileChange(index, e)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleCertificateRemove(index)}
                      className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                {formData.sertifikat.length === 0 && (
                  <p className="text-sm text-slate-500 italic text-center py-4">Belum ada sertifikat. Klik "Tambah Sertifikat" untuk menambah.</p>
                )}
              </div>
            </div>
            <div className="md:col-span-2 flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                {editingFisherman ? 'Update' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Nahkoda</th>
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">NIK</th>
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Kontak</th>
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Pengalaman</th>
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {fishermen.map((fisherman) => (
              <tr key={fisherman._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                      {fisherman.foto ? (
                        <img src={fisherman.foto} alt={fisherman.nama} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={16} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{fisherman.nama}</p>
                      <p className="text-xs text-slate-500">{fisherman.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm text-slate-700">{fisherman.nik}</p>
                  <p className="text-xs text-slate-500">{new Date(fisherman.tanggalLahir).toLocaleDateString('id-ID')}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm text-slate-700">{fisherman.noTelepon}</p>
                  <p className="text-xs text-slate-500 truncate max-w-32">{fisherman.alamat}</p>
                </td>
                <td className="p-4">
                  <p className="text-sm font-bold text-slate-700">{fisherman.pengalaman} tahun</p>
                  {fisherman.sertifikat.length > 0 && (
                    <div className="flex items-center text-xs text-blue-600 mt-1">
                      <Award size={12} className="mr-1" />
                      {fisherman.sertifikat.length} sertifikat
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(fisherman.status)}`}>
                    {fisherman.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => setViewingFisherman(fisherman)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Lihat Detail"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(fisherman)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(fisherman._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {fishermen.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Belum ada data nahkoda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {viewingFisherman && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Detail Nahkoda</h3>
                <button
                  onClick={() => setViewingFisherman(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {viewingFisherman.foto ? (
                      <img src={viewingFisherman.foto} alt={viewingFisherman.nama} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={48} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{viewingFisherman.nama}</h4>
                    <p className="text-slate-500">{viewingFisherman.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">NIK</p>
                      <p className="text-sm text-slate-700">{viewingFisherman.nik}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Tanggal Lahir</p>
                      <p className="text-sm text-slate-700">{new Date(viewingFisherman.tanggalLahir).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">No. Telepon</p>
                      <p className="text-sm text-slate-700">{viewingFisherman.noTelepon}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pengalaman</p>
                      <p className="text-sm text-slate-700">{viewingFisherman.pengalaman} tahun</p>
                    </div>
                    {viewingFisherman.email && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Email</p>
                        <p className="text-sm text-slate-700">{viewingFisherman.email}</p>
                      </div>
                    )}
                    {viewingFisherman.statusPernikahan && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Status Pernikahan</p>
                        <p className="text-sm text-slate-700">
                          {viewingFisherman.statusPernikahan === 'belum_menikah' ? 'Belum Menikah' : 
                           viewingFisherman.statusPernikahan === 'menikah' ? 'Menikah' : 'Cerai'}
                        </p>
                      </div>
                    )}
                    {viewingFisherman.pendidikan && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pendidikan</p>
                        <p className="text-sm text-slate-700">{viewingFisherman.pendidikan}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Alamat</p>
                    <p className="text-sm text-slate-700">{viewingFisherman.alamat}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(viewingFisherman.status)}`}>
                      {viewingFisherman.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </div>
                  {viewingFisherman.kontakDarurat?.nama && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Kontak Darurat</p>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-red-700">{viewingFisherman.kontakDarurat.nama}</p>
                        <p className="text-xs text-red-600">{viewingFisherman.kontakDarurat.noTelepon}</p>
                        <p className="text-xs text-red-500">{viewingFisherman.kontakDarurat.hubungan}</p>
                      </div>
                    </div>
                  )}
                  {viewingFisherman.catatan && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Catatan</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{viewingFisherman.catatan}</p>
                    </div>
                  )}
                  {viewingFisherman.sertifikat.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase mb-2">Sertifikat</p>
                      <div className="space-y-2">
                        {viewingFisherman.sertifikat.map((cert, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Award size={14} className="text-green-600" />
                              <span className="text-sm text-green-700">{cert.name}</span>
                            </div>
                            {cert.file && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setViewingCertificate(cert)}
                                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                                >
                                  Lihat
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = cert.file;
                                    link.download = `${cert.name}.pdf`;
                                    link.click();
                                  }}
                                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                >
                                  Download
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Viewer Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">{viewingCertificate.name}</h3>
                <button
                  onClick={() => setViewingCertificate(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto">
              {viewingCertificate.file ? (
                viewingCertificate.file.startsWith('data:image') ? (
                  <img 
                    src={viewingCertificate.file} 
                    alt={viewingCertificate.name}
                    className="w-full h-auto rounded-lg border"
                  />
                ) : (
                  <iframe 
                    src={viewingCertificate.file}
                    className="w-full h-96 border rounded-lg"
                    title={viewingCertificate.name}
                  />
                )
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>File sertifikat tidak tersedia</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = viewingCertificate.file;
                  link.download = `${viewingCertificate.name}.pdf`;
                  link.click();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setViewingCertificate(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FishermenManagement;