import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { backendAPI } from '@/services/backendService';

interface Permission {
  id: number;
  role: string;
  category: string;
  feature: string;
  allowed: boolean;
}

type Matrix = Record<string, Record<string, Record<string, { id: number; allowed: boolean }>>>;

const PROTECTED_ROLES = ['admin', 'operator', 'supervisor'];

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-red-100 text-red-700 border-red-200',
  operator:   'bg-cyan-100 text-cyan-700 border-cyan-200',
  supervisor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const getRoleColor = (role: string) =>
  ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-700 border-slate-200';

const RoleAccessManager: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        backendAPI.request('/api/role-permissions'),
        backendAPI.request('/api/role-permissions/roles'),
      ]);
      setPermissions(permRes.data || []);
      setRoles(roleRes.data || []);
    } catch (e: any) {
      showToast('Gagal memuat data: ' + e.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build matrix
  const matrix: Matrix = {};
  const categories: string[] = [];
  const featuresByCategory: Record<string, string[]> = {};

  permissions.forEach(p => {
    if (!matrix[p.category]) {
      matrix[p.category] = {};
      categories.push(p.category);
      featuresByCategory[p.category] = [];
    }
    if (!matrix[p.category][p.feature]) {
      matrix[p.category][p.feature] = {};
      featuresByCategory[p.category].push(p.feature);
    }
    matrix[p.category][p.feature][p.role] = { id: p.id, allowed: p.allowed };
  });

  const uniqueCategories = [...new Set(categories)];
  Object.keys(featuresByCategory).forEach(cat => {
    featuresByCategory[cat] = [...new Set(featuresByCategory[cat])];
  });

  const handleToggle = async (id: number, currentAllowed: boolean) => {
    setSaving(id);
    try {
      await backendAPI.request(`/api/role-permissions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ allowed: !currentAllowed }),
      });
      setPermissions(prev => prev.map(p => p.id === id ? { ...p, allowed: !currentAllowed } : p));
    } catch (e: any) {
      showToast('Gagal update: ' + e.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    try {
      await backendAPI.request('/api/role-permissions/role', {
        method: 'POST',
        body: JSON.stringify({ role: newRole.trim().toLowerCase() }),
      });
      showToast(`Role "${newRole}" berhasil ditambahkan`);
      setNewRole('');
      setShowAddRole(false);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteRole = async (role: string) => {
    if (!confirm(`Hapus role "${role}" beserta semua permissionnya?`)) return;
    try {
      await backendAPI.request(`/api/role-permissions/role/${role}`, { method: 'DELETE' });
      showToast(`Role "${role}" dihapus`);
      load();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-blue-500 mr-3" />
        <span className="text-slate-500 font-medium">Memuat data hak akses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-50 rounded-lg"><Shield size={18} className="text-slate-500" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Manajemen Hak Akses</h3>
            <p className="text-xs text-slate-400">Klik toggle untuk mengubah akses. Perubahan langsung tersimpan.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddRole(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition">
            <Plus size={14} /> Tambah Role
          </button>
          <button onClick={load} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 font-medium">Role aktif:</span>
        {roles.map(role => (
          <div key={role} className="flex items-center gap-1">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleColor(role)}`}>{role}</span>
            {!PROTECTED_ROLES.includes(role) && (
              <button onClick={() => handleDeleteRole(role)}
                className="p-0.5 text-slate-300 hover:text-red-500 transition">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider w-[45%]">Fitur</th>
                {roles.map(role => (
                  <th key={role} className="px-3 py-3 text-center font-bold uppercase tracking-wider">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${getRoleColor(role)}`}>
                      {role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueCategories.map(category => (
                <React.Fragment key={category}>
                  <tr className="bg-slate-50/70">
                    <td colSpan={roles.length + 1} className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {category}
                    </td>
                  </tr>
                  {featuresByCategory[category]?.map(feature => (
                    <tr key={feature} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{feature}</td>
                      {roles.map(role => {
                        const cell = matrix[category]?.[feature]?.[role];
                        if (!cell) return <td key={role} className="px-3 py-2.5 text-center text-slate-200">â€”</td>;
                        const isSaving = saving === cell.id;
                        return (
                          <td key={role} className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => handleToggle(cell.id, cell.allowed)}
                              disabled={isSaving}
                              className={`inline-flex items-center justify-center w-8 h-5 rounded-full transition-all duration-200 ${
                                isSaving ? 'opacity-50 cursor-wait' :
                                cell.allowed ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-200 hover:bg-slate-300'
                              }`}
                              title={cell.allowed ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            >
                              <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                cell.allowed ? 'translate-x-1.5' : '-translate-x-1.5'
                              }`} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-3 rounded-full bg-emerald-500 inline-block" /> Diizinkan
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-3 rounded-full bg-slate-200 inline-block" /> Tidak diizinkan
          </div>
          <span className="ml-auto text-[10px] text-slate-400">{permissions.length} permission terdaftar</span>
        </div>
      </div>

      {/* Modal Tambah Role */}
      {showAddRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddRole(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-slate-800">Tambah Role Baru</h3>
            <p className="text-xs text-slate-500">Role baru akan mendapat semua fitur yang ada dengan akses <strong>nonaktif</strong> secara default.</p>
            <input
              type="text"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddRole()}
              placeholder="Nama role (contoh: viewer)"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowAddRole(false); setNewRole(''); }}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition text-sm">
                Batal
              </button>
              <button onClick={handleAddRole} disabled={!newRole.trim()}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition text-sm disabled:opacity-50">
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleAccessManager;

