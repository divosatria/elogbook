import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Eye, EyeOff, Shield, User, FileText, Download, CheckCircle, XCircle, Clock, Ship, Calendar, Search, CreditCard, BookOpen, Award, ShieldCheck, Heart, UserCheck, Camera, Wallet, Users, Contact, Activity, ClipboardList, X } from 'lucide-react';




import { backendAPI } from '../services/backendService';
import { API_ENDPOINTS } from '../config/urls';
import useRole from '../utils/useRole';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface Document {
  id: string;
  tripId: string;
  nahkodaId: string;
  nahkodaNama: string;
  kapalNama: string;
  jenisDocumen: 'ktp' | 'buku_pelaut' | 'sertifikat_nahkoda' | 'bst' | 'surat_sehat' | 'skck' | 'pas_foto' | 'npwp';
  namaFile: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  catatan?: string;
  expiryDate?: string;
  documentNumber?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  nama?: string;
  noTelepon?: string;
  role: string;
  isActive: boolean;
  fotoUrl?: string;
  _id?: string;
  createdAt: string;
}

const AccountManagement: React.FC = () => {
  const { isAdmin, canWrite, canDelete } = useRole();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsersList, setFilteredUsersList] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [docFilter, setDocFilter] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>(['nelayan', 'nahkoda', 'abk', 'operator', 'supervisor', 'admin']);
  const [newUser, setNewUser] = useState<{
    username: string;
    email: string;
    password: string;
    nama: string;
    noTelepon: string;
    role: string;
    foto?: File | null;
  }>({
    username: '',
    email: '',
    password: '',
    nama: '',
    noTelepon: '',
    role: 'nelayan',
    foto: null
  });
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  
  // Document details modal state
  const [showDocDetailsModal, setShowDocDetailsModal] = useState(false);
  const [selectedUserDocs, setSelectedUserDocs] = useState<{userName: string; documents: Document[]}>({userName: '', documents: []});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageProfiles, setCurrentPageProfiles] = useState(1);
  const usersPerPage = 5;
  const profilesPerPage = 5;

  useEffect(() => {
    loadUsers();
    loadAllDocuments();
    loadAvailableRoles();
    if (activeTab === 'documents') {
      loadDocuments();
    }
  }, [activeTab]);

  const loadAvailableRoles = async () => {
    try {
      const res = await backendAPI.request<{ data: string[] }>('/api/role-permissions/roles');
      if (res.data && res.data.length > 0) {
        setAvailableRoles(res.data);
      }
    } catch {
      // fallback ke default
    }
  };

  // Reload allDocuments when switching to profiles tab
  useEffect(() => {
    if (activeTab === 'profiles') {
      loadAllDocuments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'documents') {
      applyDocFilter();
    }
  }, [documents, docFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      console.log('Loading users...');
      const response = await backendAPI.getUsers();
      console.log('Users loaded:', response);
      const userData = response.data || response || [];
      setUsers(userData);
      setFilteredUsersList(userData);
    } catch (error) {
      console.error('Load users error:', error);
      if (error.message === 'UNAUTHORIZED') {
        alert('Session expired. Please login again.');
        window.location.href = '/login';
      } else if (error.message === 'NETWORK_ERROR') {
        alert('Cannot connect to server. Please check if backend is running.');
      } else {
        alert('Failed to load users: ' + (error.message || 'Unknown error'));
      }
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (path: string | undefined | null) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    // Ensure base doesn't end with slash and path doesn't start with slash, then join
    const baseUrl = backendAPI.baseURL.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      const formData = new FormData();
      formData.append('username', newUser.username);
      formData.append('email', newUser.email);
      if (newUser.password) formData.append('password', newUser.password);
      formData.append('nama', newUser.nama);
      formData.append('noTelepon', newUser.noTelepon);
      formData.append('role', newUser.role);
      
      if (newUser.foto) {
        formData.append('foto', newUser.foto);
      }

      await backendAPI.updateUser(editingUser.id || editingUser._id, formData);
      setShowEditModal(false);
      setEditingUser(null);
      setNewUser({ username: '', email: '', password: '', nama: '', noTelepon: '', role: 'nelayan', foto: null });
      setProfilePreview(null);
      await loadUsers();
    } catch (error) {
      console.error('Edit user error:', error);
      alert('Gagal mengupdate user: ' + (error.message || 'Unknown error'));
    }
  };

  const openEditModal = (user: User) => {
    console.log('Opening Edit Modal', user);
    setEditingUser(user);
    setNewUser({
      username: user.username,
      email: user.email,
      password: '',
      nama: user.nama || '',
      noTelepon: user.noTelepon || '',
      role: user.role,
      foto: null
    });
    console.log('Setting profile preview:', user.fotoUrl);
    setProfilePreview(user.fotoUrl || null);
    setShowEditModal(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewUser({ ...newUser, foto: file });
      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setProfilePreview(objectUrl);
      
      // Clean up memory when component unmounts or preview changes
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await backendAPI.getPendingDocuments();
      
      if (response.success && response.data) {
        // Transform backend data to frontend format - include ALL documents
        const transformedDocs: Document[] = response.data.flatMap((user: any) => {
          const allDocs = user.pendingDocuments || [];
          // Also get all documents from user.dokumen if available
          if (user.allDocuments) {
            allDocs.push(...user.allDocuments);
          }
          return allDocs.map((doc: any) => ({
            id: doc.id,
            tripId: `profile-${user.id}`,
            nahkodaId: user.id.toString(),
            nahkodaNama: user.nama || user.username,
            kapalNama: '-',
            jenisDocumen: doc.jenisDokumen.toLowerCase().replace(/ /g, '_') as any,
            namaFile: doc.fileName,
            fileUrl: doc.fileUrl,
            status: doc.status,
            uploadedAt: doc.uploadedAt,
            reviewedAt: doc.verifiedAt,
            reviewedBy: doc.verifiedBy ? 'Admin' : undefined,
            catatan: doc.rejectionReason,
            expiryDate: doc.tanggalBerlaku,
            documentNumber: doc.nomorDokumen
          }));
        });
        
        // Also get all documents from users to include approved ones
        const usersResponse = await backendAPI.getUsers();
        const allUsersData = usersResponse.data || usersResponse || [];
        
        allUsersData.filter(user => ['nahkoda', 'abk'].includes(user.role)).forEach((user: any) => {
          if (user.dokumen && Array.isArray(user.dokumen)) {
            user.dokumen.forEach((doc: any) => {
              // Avoid duplicates
              if (!transformedDocs.find(d => d.id === doc.id)) {
                transformedDocs.push({
                  id: doc.id,
                  tripId: `profile-${user.id}`,
                  nahkodaId: user.id.toString(),
                  nahkodaNama: user.nama || user.username,
                  kapalNama: '-',
                  jenisDocumen: doc.jenisDokumen.toLowerCase().replace(/ /g, '_') as any,
                  namaFile: doc.fileName,
                  fileUrl: doc.fileUrl,
                  status: doc.status,
                  uploadedAt: doc.uploadedAt,
                  reviewedAt: doc.verifiedAt,
                  reviewedBy: doc.verifiedBy ? 'Admin' : undefined,
                  catatan: doc.rejectionReason,
                  expiryDate: doc.tanggalBerlaku,
                  documentNumber: doc.nomorDokumen
                });
              }
            });
          }
        });
        
        setDocuments(transformedDocs);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllDocuments = async () => {
    try {
      // Get all users and their documents directly
      const usersResponse = await backendAPI.getUsers();
      const allUsersData = usersResponse.data || usersResponse || [];
      
      const transformedDocs: Document[] = [];
      
      allUsersData.filter(user => ['nahkoda', 'abk'].includes(user.role)).forEach((user: any) => {
        if (user.dokumen && Array.isArray(user.dokumen)) {
          user.dokumen.forEach((doc: any) => {
            transformedDocs.push({
              id: doc.id,
              tripId: `profile-${user.id}`,
              nahkodaId: user.id.toString(),
              nahkodaNama: user.nama || user.username,
              kapalNama: '-',
              jenisDocumen: doc.jenisDokumen.toLowerCase().replace(/ /g, '_') as any,
              namaFile: doc.fileName,
              fileUrl: doc.fileUrl,
              status: doc.status,
              uploadedAt: doc.uploadedAt,
              reviewedAt: doc.verifiedAt,
              reviewedBy: doc.verifiedBy ? 'Admin' : undefined,
              catatan: doc.rejectionReason,
              expiryDate: doc.tanggalBerlaku,
              documentNumber: doc.nomorDokumen
            });
          });
        }
      });
      
      setAllDocuments(transformedDocs);
    } catch (error) {
      console.error('Error loading all documents:', error);
      setAllDocuments([]);
    }
  };

  // Group documents by nahkoda
  const getGroupedDocuments = () => {
    const grouped = documents.reduce((acc, doc) => {
      const key = doc.nahkodaId;
      if (!acc[key]) {
        acc[key] = {
          nahkodaId: doc.nahkodaId,
          nahkodaNama: doc.nahkodaNama,
          kapalNama: doc.kapalNama,
          documents: [],
          lastUpload: doc.uploadedAt,
          overallStatus: 'pending'
        };
      }
      acc[key].documents.push(doc);
      // Update last upload time
      if (new Date(doc.uploadedAt) > new Date(acc[key].lastUpload)) {
        acc[key].lastUpload = doc.uploadedAt;
      }
      return acc;
    }, {});

    // Calculate overall status for each group
    Object.values(grouped).forEach(group => {
      const statuses = group.documents.map(d => d.status);
      if (statuses.every(s => s === 'approved')) {
        group.overallStatus = 'approved';
      } else if (statuses.some(s => s === 'rejected')) {
        group.overallStatus = 'rejected';
      } else {
        group.overallStatus = 'pending';
      }
    });

    return Object.values(grouped);
  };

  const applyDocFilter = () => {
    const groupedDocs = getGroupedDocuments();
    let filtered = groupedDocs;
    switch (docFilter) {
      case 'pending': filtered = groupedDocs.filter(group => group.overallStatus === 'pending'); break;
      case 'approved': filtered = groupedDocs.filter(group => group.overallStatus === 'approved'); break;
      case 'rejected': filtered = groupedDocs.filter(group => group.overallStatus === 'rejected'); break;
      default: filtered = groupedDocs;
    }
    setFilteredDocs(filtered);
  };

  const handleDeleteDocument = async (docId: string, nahkodaId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      try {
        await backendAPI.deleteDocument(nahkodaId, docId);
        
        // Reload documents
        await loadDocuments();
        await loadAllDocuments();
        await loadUsers();
        
        alert('Dokumen berhasil dihapus!');
        
        // Close modal if no more documents
        if (selectedDoc && selectedDoc.groupedDocs) {
          const remainingDocs = selectedDoc.groupedDocs.filter(d => d.id !== docId);
          if (remainingDocs.length === 0) {
            setSelectedDoc(null);
          } else {
            setSelectedDoc({...selectedDoc, groupedDocs: remainingDocs});
          }
        }
        
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Gagal menghapus dokumen: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const getDocFilterCount = (filterType: string) => {
    const groupedDocs = getGroupedDocuments();
    switch (filterType) {
      case 'pending': return groupedDocs.filter(g => g.overallStatus === 'pending').length;
      case 'approved': return groupedDocs.filter(g => g.overallStatus === 'approved').length;
      case 'rejected': return groupedDocs.filter(g => g.overallStatus === 'rejected').length;
      default: return groupedDocs.length;
    }
  };

  const getDocumentTypeText = (type: string) => {
    const types = {
      'ktp': 'KTP',
      'buku_pelaut': 'Buku Pelaut',
      'sertifikat_nahkoda': 'Sertifikat Nahkoda',
      'bst': 'BST (Basic Safety Training)',
      'surat_sehat': 'Surat Keterangan Sehat / MCU',
      'skck': 'SKCK',
      'pas_foto': 'Pas Foto',
      'npwp': 'NPWP'
    };
    return types[type] || type;
  };

  const getDocumentDisplayName = () => {
    return 'Dokumen Perizinan';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      'pending': 'bg-amber-50 text-amber-700 border border-amber-200',
      'approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      'rejected': 'bg-rose-50 text-rose-700 border border-rose-200'
    };
    return colors[status] || 'bg-slate-100 text-slate-600 border border-slate-200';
  };

  const getStatusIcon = (status: string) => {
    const icons: any = {
      'pending': <Clock size={14} className="text-amber-600" />,
      'approved': <CheckCircle size={14} className="text-emerald-600" />,
      'rejected': <XCircle size={14} className="text-rose-600" />
    };
    return icons[status] || <Clock size={14} className="text-slate-600" />;
  };

  const getDocumentIcon = (type: string) => {
    const iconProps = { size: 18, className: "shrink-0" };
    const icons: Record<string, JSX.Element> = {
      'ktp': <Contact size={18} className="shrink-0" />,
      'buku_pelaut': <BookOpen size={18} className="shrink-0" />,
      'sertifikat_nahkoda': <Award size={18} className="shrink-0" />,
      'bst': <Shield size={18} className="shrink-0" />,
      'surat_sehat': <Activity size={18} className="shrink-0" />,
      'surat_keterangan_sehat': <Activity size={18} className="shrink-0" />,
      'skck': <FileText size={18} className="shrink-0" />,
      'pas_foto': <User size={18} className="shrink-0" />,
      'npwp': <CreditCard size={18} className="shrink-0" />
    };
    return icons[type] || <FileText {...iconProps} />;
  };

  const isDocumentExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (diffDays <= 30) return { status: 'expiring', text: `${diffDays} hari lagi`, color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { status: 'valid', text: 'Valid', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', newUser.username);
      formData.append('email', newUser.email);
      formData.append('password', newUser.password);
      formData.append('nama', newUser.nama);
      formData.append('noTelepon', newUser.noTelepon);
      formData.append('role', newUser.role);
      
      if (newUser.foto) {
        formData.append('foto', newUser.foto);
      }

      await backendAPI.createUser(formData);
      setShowAddModal(false);
      setNewUser({ username: '', email: '', password: '', nama: '', noTelepon: '', role: 'nelayan', foto: null });
      setProfilePreview(null);
      await loadUsers(); // Reload data after create
    } catch (error) {
      console.error('Add user error:', error);
      alert('Gagal membuat user: ' + (error.message || 'Unknown error'));
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await backendAPI.toggleUserStatus(userId);
      await loadUsers(); // Reload data after toggle
    } catch (error) {
      console.error('Toggle user status error:', error);
      alert('Gagal mengubah status user: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Yakin ingin menghapus user ini?')) {
      try {
        await backendAPI.deleteUser(userId);
        await loadUsers(); // Reload data after delete
      } catch (error) {
        console.error('Delete user error:', error);
        alert('Gagal menghapus user: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleReviewDoc = async (docId: string, status: 'approved' | 'rejected', catatan: string) => {
    try {
      // Find the document to get nahkodaId
      const doc = documents.find(d => d.id === docId) || 
                  (selectedDoc?.groupedDocs?.find(d => d.id === docId));
      
      if (!doc) {
        alert('Dokumen tidak ditemukan');
        return;
      }

      // Use the correct API endpoints based on status
      if (status === 'approved') {
        await backendAPI.approveUserDocument(doc.nahkodaId, docId);
      } else {
        await backendAPI.rejectDocument(doc.nahkodaId, docId, catatan);
      }
      
      // Reload documents
      await loadDocuments();
      await loadAllDocuments();
      
      // Update selectedDoc if it exists
      if (selectedDoc?.groupedDocs) {
        const updatedDocs = selectedDoc.groupedDocs.map(d => 
          d.id === docId 
            ? { 
                ...d, 
                status, 
                catatan, 
                reviewedAt: new Date().toISOString(),
                reviewedBy: 'Admin'
              }
            : d
        );
        setSelectedDoc({...selectedDoc, groupedDocs: updatedDocs});
      }
      
      alert(`Dokumen berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}!`);
    } catch (error) {
      console.error('Error reviewing document:', error);
      alert('Gagal mereview dokumen: ' + (error.message || 'Unknown error'));
    }
  };

  // Search filter logic
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search changes
    setCurrentPageProfiles(1); // Reset profiles page too
    if (!searchQuery) {
      setFilteredUsersList(users);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        (user.nama && user.nama.toLowerCase().includes(lowerQuery)) ||
        (user.username && user.username.toLowerCase().includes(lowerQuery)) ||
        (user.email && user.email.toLowerCase().includes(lowerQuery))
      );
      setFilteredUsersList(filtered);
    }
  }, [searchQuery, users]);

  return (
    <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                Manajemen Pengguna
              </h1>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                Kelola akun, user, dan verifikasi dokumen perizinan
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={activeTab !== 'users'}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-300 font-bold text-xs active:scale-[0.98] ${
              activeTab === 'users' && isAdmin ? 'opacity-100' : 'opacity-0 invisible pointer-events-none'
            }`}
          >
            <UserPlus size={16} />
            <span>Tambah Akun</span>
          </button>
        </div>

        {/* TABS */}
        <div className="flex overflow-x-auto pb-1 sm:pb-0">
          <div className="bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 shadow-sm flex space-x-1 w-full sm:w-auto min-w-max">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'users' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
              }`}
            >
              Akun & Login
            </button>
            <button 
              onClick={() => setActiveTab('profiles')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'profiles' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
              }`}
            >
              Profil Pengguna
            </button>
            <button 
              onClick={() => setActiveTab('documents')}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                activeTab === 'documents' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-700'
              }`}
            >
              Dokumen Perizinan
            </button>
          </div>

        </div>

        {/* Search Input */}
        {(activeTab === 'users' || activeTab === 'profiles') && (
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 w-full text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400"
              placeholder="Cari user berdasarkan nama, email, atau username..."
            />
          </div>
        )}

      {/* Content berdasarkan tab aktif */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-20 py-3 text-xs font-bold text-slate-500 uppercase w-[30%]">User</th>
                <th className="px-8 py-3 text-xs font-bold text-slate-500 uppercase w-[15%]">Role</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase w-[15%]">Status</th>
                <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Dibuat</th>
                <th className="px-10 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-2 py-2"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                    <td className="px-2 py-2"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                    <td className="px-2 py-2"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                    <td className="px-2 py-2"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                    <td className="px-2 py-2"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredUsersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {searchQuery ? `Tidak ada user dengan kata kunci "${searchQuery}"` : 'Belum ada data user'}
                  </td>
                </tr>
              ) : (
                // Pagination logic
                (() => {
                  const indexOfLastUser = currentPage * usersPerPage;
                  const indexOfFirstUser = indexOfLastUser - usersPerPage;
                  const currentUsers = filteredUsersList.slice(indexOfFirstUser, indexOfLastUser);
                  
                  return currentUsers.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-2 py-2">
                      <div className="flex items-center space-x-2">
                        <div className={`relative w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 ${
                          user.role === 'admin' ? 'bg-red-100 text-red-600' :
                          user.role === 'operator' ? 'bg-cyan-100 text-cyan-600' :
                          user.role === 'supervisor' ? 'bg-indigo-100 text-indigo-600' :
                          user.role === 'nahkoda' ? 'bg-purple-100 text-purple-600' :
                          user.role === 'abk' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {user.fotoUrl ? (
                            <img 
                              src={getImageUrl(user.fotoUrl) || ''} 
                              alt={user.nama} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                              }}
                            />
                          ) : (
                            user.role === 'admin' ? <Shield size={18} /> : <User size={18} />
                          )}
                          {/* Fallback icon if image fails to load, initially hidden if fotoUrl exists */}
                          <div hidden={!!user.fotoUrl} className="flex items-center justify-center w-full h-full absolute inset-0">
                             {user.role === 'admin' ? <Shield size={18} /> : <User size={18} />}
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{user.nama || user.username}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[120px]">{user.email}</p>
                          {user.nama && <p className="text-xs text-slate-400">@{user.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        user.role === 'admin' ? 'bg-red-100 text-red-700' :
                        user.role === 'operator' ? 'bg-cyan-100 text-cyan-700' :
                        user.role === 'supervisor' ? 'bg-indigo-100 text-indigo-700' :
                        user.role === 'nahkoda' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'abk' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role === 'abk' ? 'ABK' : user.role}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => toggleUserStatus(user._id || user.id, user.isActive)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          {user.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {canWrite && (
                          <button 
                            onClick={() => openEditModal(user)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteUser(user._id || user.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
          </div>
        
        {/* Pagination Controls */}
        {!isLoading && filteredUsersList.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">
                Menampilkan <span className="font-semibold">{Math.min((currentPage - 1) * usersPerPage + 1, filteredUsersList.length)}</span> - <span className="font-semibold">{Math.min(currentPage * usersPerPage, filteredUsersList.length)}</span> dari <span className="font-semibold">{filteredUsersList.length}</span> user
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                  Halaman <span className="font-bold">{currentPage}</span> dari <span className="font-bold">{Math.ceil(filteredUsersList.length / usersPerPage)}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsersList.length / usersPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredUsersList.length / usersPerPage)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/50">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800">Profil Lengkap Nahkoda & ABK</h3>
            <p className="text-xs text-slate-500">Dokumen yang telah di-approve otomatis masuk ke profil masing-masing</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-20 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">User</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-[15%]">Role</th>
                <th className="px-7 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Kontak</th>
                <th className="px-0 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">Dokumen Tersertifikasi</th>
                <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[15%]">Status Profil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(() => {
                const filteredProfiles = filteredUsersList.filter(user => ['nahkoda', 'abk'].includes(user.role));
                
                if (filteredProfiles.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        {searchQuery ? (
                          <p>Tidak ada profil dengan kata kunci "{searchQuery}"</p>
                        ) : (
                          <>
                            <User size={48} className="mx-auto mb-4 text-slate-300" />
                            <p>Belum ada nahkoda atau ABK yang terdaftar</p>
                            <p className="text-sm text-slate-400 mt-2">Buat akun nahkoda/ABK di tab "Akun & Login" terlebih dahulu</p>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                }
                
                // Pagination logic for profiles
                const indexOfLastProfile = currentPageProfiles * profilesPerPage;
                const indexOfFirstProfile = indexOfLastProfile - profilesPerPage;
                const currentProfiles = filteredProfiles.slice(indexOfFirstProfile, indexOfLastProfile);
                
                return currentProfiles.map(user => {
                  const userId = (user.id || user._id)?.toString();
                  const approvedDocs = allDocuments.filter(doc => 
                    doc.nahkodaId === userId && doc.status === 'approved'
                  );
                  console.log(`User ${user.nama} (${userId}): approved docs:`, approvedDocs);
                  
                  return (
                    <tr key={user.id || user._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 ${
                            user.role === 'nahkoda' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                          }`}>
                            {user.fotoUrl ? (
                              <img 
                                src={getImageUrl(user.fotoUrl) || ''} 
                                alt={user.nama} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.role === 'nahkoda' ? <Shield size={20} /> : <User size={20} />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{user.nama || user.username}</p>
                            <p className="text-xs text-slate-400">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                          user.role === 'nahkoda' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {user.role === 'abk' ? 'ABK' : user.role}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600 truncate max-w-[120px]">{user.email}</p>
                          {user.noTelepon && (
                            <p className="text-xs text-slate-600">{user.noTelepon}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {approvedDocs.length > 0 ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                console.log('Opening modal for user:', user.nama || user.username);
                                console.log('Approved docs:', approvedDocs);
                                setSelectedUserDocs({
                                  userName: user.nama || user.username,
                                  documents: approvedDocs
                                });
                                setShowDocDetailsModal(true);
                              }}
                              className="text-left w-full hover:bg-blue-50 p-2 rounded-lg transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-blue-600 group-hover:scale-110 transition-transform">
                                  {getDocumentIcon(approvedDocs[0]?.jenisDocumen)}
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-700">
                                    {approvedDocs.length} Dokumen Tersertifikasi
                                  </p>
                                  <p className="text-xs text-slate-500 group-hover:text-blue-600">
                                    Klik untuk melihat detail
                                  </p>
                                </div>
                                <CheckCircle size={14} className="text-green-600" />
                              </div>
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Belum ada dokumen</p>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            approvedDocs.length >= 5 
                              ? 'bg-green-100 text-green-700' 
                              : approvedDocs.length >= 3 
                              ? 'bg-amber-100 text-amber-700'
                              : approvedDocs.length >= 1
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {approvedDocs.length >= 5 ? 'Lengkap' : 
                             approvedDocs.length >= 3 ? 'Baik' :
                             approvedDocs.length >= 1 ? 'Parsial' : 'Kosong'}
                          </span>
                          <span className="text-xs text-slate-500">({approvedDocs.length}/8)</span>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          </div>
          
          {/* Pagination Controls for Profiles */}
          {(() => {
            const filteredProfiles = filteredUsersList.filter(user => ['nahkoda', 'abk'].includes(user.role));
            return !isLoading && filteredProfiles.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600">
                    Menampilkan <span className="font-semibold">{Math.min((currentPageProfiles - 1) * profilesPerPage + 1, filteredProfiles.length)}</span> - <span className="font-semibold">{Math.min(currentPageProfiles * profilesPerPage, filteredProfiles.length)}</span> dari <span className="font-semibold">{filteredProfiles.length}</span> profil
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPageProfiles(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageProfiles === 1}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-700">
                      Halaman <span className="font-bold">{currentPageProfiles}</span> dari <span className="font-bold">{Math.ceil(filteredProfiles.length / profilesPerPage)}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPageProfiles(prev => Math.min(prev + 1, Math.ceil(filteredProfiles.length / profilesPerPage)))}
                      disabled={currentPageProfiles >= Math.ceil(filteredProfiles.length / profilesPerPage)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex space-x-2 bg-white p-2 rounded-md border border-slate-200 shadow-sm w-fit min-w-max">
            <button 
              onClick={() => setDocFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                docFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Semua</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${docFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getDocFilterCount('all')}
              </span>
            </button>
            <button 
              onClick={() => setDocFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                docFilter === 'pending' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Pending</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${docFilter === 'pending' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getDocFilterCount('pending')}
              </span>
            </button>
            <button 
              onClick={() => setDocFilter('approved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                docFilter === 'approved' 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Approved</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${docFilter === 'approved' ? 'bg-emerald-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getDocFilterCount('approved')}
              </span>
            </button>
            <button 
              onClick={() => setDocFilter('rejected')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${
                docFilter === 'rejected' 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Rejected</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${docFilter === 'rejected' ? 'bg-rose-400 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {getDocFilterCount('rejected')}
              </span>
            </button>
          </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                <p>Tidak ada dokumen untuk filter "{docFilter}"</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[25%]">Dokumen</th>
                    <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Nahkoda & Kapal</th>
                    <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[15%]">Upload</th>
                    <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Status</th>
                    <th className="px-2 py-3 text-xs font-bold text-slate-500 uppercase w-[20%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((group) => (
                    <tr key={group.nahkodaId} className="hover:bg-slate-100 transition-colors">
                      <td className="px-2 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md text-sm shrink-0 flex items-center justify-center">
                            <ClipboardList size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs truncate max-w-[150px]">Dokumen {group.nahkodaNama}</p>
                            <p className="text-xs text-slate-500">{group.documents.length} dokumen</p>
                            <p className="text-xs text-slate-400 truncate max-w-[150px]">
                              {group.documents.map(d => getDocumentTypeText(d.jenisDocumen)).join(', ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <User size={12} className="text-slate-400" />
                            <p className="text-xs font-medium">{group.nahkodaNama}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Ship size={12} className="text-slate-400" />
                            <p className="text-xs text-slate-500">{group.kapalNama}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <Calendar size={12} className="text-slate-400" />
                          <p className="text-xs text-slate-500">
                            {new Date(group.lastUpload).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold w-fit ${getStatusColor(group.overallStatus)}`}>
                          {getStatusIcon(group.overallStatus)}
                          <span>{group.overallStatus}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setSelectedDoc({ ...group.documents[0], groupedDocs: group.documents })}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Eye size={16} />
                          </button>
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
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Tambah Akun Baru</h3>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200 group cursor-pointer">
                  {profilePreview ? (
                    <>
                      <img 
                        src={profilePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                        }}
                      />
                      <div hidden className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <User size={32} className="text-slate-300" />
                      </div>
                    </>
                  ) : (
                    <User size={32} className="text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit size={16} className="text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Foto Profil</p>
                  <p className="text-xs text-slate-500">Klik gambar untuk mengubah (Max 5MB)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUser.nama}
                  onChange={(e) => setNewUser({...newUser, nama: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  placeholder="Nama lengkap pengguna"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">No. Telepon</label>
                <input
                  type="tel"
                  value={newUser.noTelepon}
                  onChange={(e) => setNewUser({...newUser, noTelepon: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>
                      {r === 'abk' ? 'ABK (Anak Buah Kapal)' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all"
                >
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Edit Akun</h3>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Photo Upload */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200 group cursor-pointer">
                  {profilePreview ? (
                    <>
                      <img 
                        src={getImageUrl(profilePreview) || ''} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Image load error:', e.currentTarget.src);
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('hidden');
                        }} 
                      />
                      <div hidden className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <User size={32} className="text-slate-300" />
                      </div>
                    </>
                  ) : (
                    <User size={32} className="text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit size={16} className="text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Foto Profil</p>
                  <p className="text-xs text-slate-500">Klik gambar untuk mengubah (Max 5MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUser.nama}
                  onChange={(e) => setNewUser({...newUser, nama: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  placeholder="Nama lengkap pengguna"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">No. Telepon</label>
                <input
                  type="tel"
                  value={newUser.noTelepon}
                  onChange={(e) => setNewUser({...newUser, noTelepon: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password (Kosongkan jika tidak diubah)</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 bg-slate-50/50 hover:bg-white transition-all"
                >
                  {availableRoles.map(r => (
                    <option key={r} value={r}>
                      {r === 'abk' ? 'ABK (Anak Buah Kapal)' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setNewUser({ username: '', email: '', password: '', nama: '', noTelepon: '', role: 'nelayan', foto: null });
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg transition-all"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}></div>
          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Dokumen {selectedDoc.nahkodaNama}</h3>
              <p className="text-xs text-slate-500">{selectedDoc.kapalNama}</p>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {selectedDoc.groupedDocs ? (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {selectedDoc.groupedDocs.map((doc) => (
                      <div key={doc.id} className="bg-slate-50 rounded-md p-3 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                              {getDocumentIcon(doc.jenisDocumen)}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{getDocumentTypeText(doc.jenisDocumen)}</p>
                              <p className="text-xs text-slate-500">{doc.namaFile}</p>
                              {doc.documentNumber && (
                                <p className="text-xs text-slate-400 font-mono">{doc.documentNumber}</p>
                              )}
                              {doc.expiryDate && (
                                <p className="text-xs text-slate-400">Berlaku hingga: {new Date(doc.expiryDate).toLocaleDateString('id-ID')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-bold ${getStatusColor(doc.status)}`}>
                              {getStatusIcon(doc.status)}
                              <span>{doc.status}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const fullUrl = doc.fileUrl.startsWith('http') 
                                  ? doc.fileUrl 
                                  : `${API_BASE_URL}${doc.fileUrl}`;
                                setPreviewDocUrl(fullUrl);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                              title="Lihat dokumen"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteDocument(doc.id, doc.nahkodaId)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        {doc.status === 'pending' && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReviewDoc(doc.id, 'rejected', `Dokumen ${getDocumentTypeText(doc.jenisDocumen)} ditolak`)}
                                className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md hover:bg-rose-200 transition-colors"
                              >
                                Tolak
                              </button>
                              <button
                                onClick={() => handleReviewDoc(doc.id, 'approved', `Dokumen ${getDocumentTypeText(doc.jenisDocumen)} disetujui`)}
                                className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md hover:bg-emerald-200 transition-colors"
                              >
                                Setujui
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {doc.reviewedAt && (
                          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-md p-3">
                            <p className="text-xs text-slate-600"><strong>Direview:</strong> {new Date(doc.reviewedAt).toLocaleString('id-ID')}</p>
                            <p className="text-xs text-slate-600"><strong>Oleh:</strong> {doc.reviewedBy}</p>
                            {doc.catatan && (
                              <p className="text-xs text-slate-600"><strong>Catatan:</strong> {doc.catatan}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>No documents found</p>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-6 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewDocUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">Preview Dokumen</h3>
              <div className="flex gap-2">
                <a 
                  href={previewDocUrl} 
                  download 
                  className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm font-medium transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button onClick={() => setPreviewDocUrl(null)} className="p-2 hover:bg-red-100 rounded-lg text-slate-500 hover:text-red-600 transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-900 flex items-center justify-center min-h-[300px]">
               <img 
                src={previewDocUrl} 
                alt="Document Preview" 
                className="max-w-full max-h-[70vh] object-contain rounded shadow-lg" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Gagal+Memuat+Gambar';
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {showDocDetailsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div style={{background: 'linear-gradient(to right, #2563eb, #1d4ed8)'}} className="px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Dokumen Tersertifikasi</h3>
                <p className="text-sm text-white/90 mt-1">{selectedUserDocs.userName || 'User'}</p>
              </div>
              <button
                onClick={() => setShowDocDetailsModal(false)}
                className="p-2 bg-white/10 hover:bg-red-500 rounded-full transition-all duration-200 text-white hover:scale-110 flex items-center justify-center"
                title="Tutup"
              >
                <X size={28} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedUserDocs.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  >
                    {/* Document Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-200">
                      <div className="text-blue-600">
                        {getDocumentIcon(doc.jenisDocumen)}
                      </div>
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {getDocumentTypeText(doc.jenisDocumen)}
                      </p>
                      {doc.documentNumber && (
                        <p className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                          No: {doc.documentNumber}
                        </p>
                      )}
                      {doc.expiryDate && (
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">
                          Berlaku: {new Date(doc.expiryDate).toLocaleDateString('id-ID')}
                        </p>
                      )}
                    </div>

                    {/* Status Check */}
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle size={16} className="text-green-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Total Dokumen:</span>
                  <span className="text-lg font-bold text-blue-600">{selectedUserDocs.documents.length} / 8</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AccountManagement;