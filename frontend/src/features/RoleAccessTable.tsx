import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Shield, RefreshCw } from 'lucide-react';
import useRole from '@/utils/useRole';
import { backendAPI } from '@/services/backendService';

interface Permission {
  id: number;
  role: string;
  category: string;
  feature: string;
  allowed: boolean;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  admin:      { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
  operator:   { bg: 'bg-cyan-50',   text: 'text-cyan-700',   border: 'border-cyan-200',   dot: 'bg-cyan-500'   },
  supervisor: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
};

const getRoleColor = (role: string) =>
  ROLE_COLORS[role] ?? { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };

const Check = () => <CheckCircle2 size={15} className="text-emerald-500 mx-auto" />;
const Cross = () => <XCircle size={15} className="text-slate-300 mx-auto" />;

const RoleAccessTable: React.FC = () => {
  const { role } = useRole();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [permRes, roleRes] = await Promise.all([
        backendAPI.request<{ data: Permission[] }>('/api/role-permissions'),
        backendAPI.request<{ data: string[] }>('/api/role-permissions/roles'),
      ]);
      setPermissions(permRes.data || []);
      setRoles(roleRes.data || []);
    } catch {
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build matrix: category â†’ feature â†’ role â†’ allowed
  const categories: string[] = [];
  const featuresByCategory: Record<string, string[]> = {};
  const matrix: Record<string, Record<string, Record<string, boolean>>> = {};

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
    matrix[p.category][p.feature][p.role] = Boolean(p.allowed);
  });

  const uniqueCategories = [...new Set(categories)];
  Object.keys(featuresByCategory).forEach(cat => {
    featuresByCategory[cat] = [...new Set(featuresByCategory[cat])];
  });

  const c = getRoleColor(role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={20} className="animate-spin text-blue-500 mr-2" />
        <span className="text-slate-500 text-sm">Memuat data hak akses...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-50 rounded-lg">
            <Shield size={18} className="text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tabel Hak Akses</h3>
            <p className="text-xs text-slate-400">Fitur yang tersedia per role pengguna (dari database)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            Role Anda: {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
          <button onClick={load} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider w-[45%]">Fitur</th>
              {roles.map(r => {
                const rc = getRoleColor(r);
                return (
                  <th key={r} className="px-3 py-3 text-center font-bold uppercase tracking-wider">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${rc.bg} ${rc.text} ${rc.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                      {r}
                    </span>
                  </th>
                );
              })}
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
                {featuresByCategory[category]?.map((feature, i) => {
                  const isCurrentAllowed = matrix[category]?.[feature]?.[role] !== false;
                  return (
                    <tr key={i} className={`border-b border-slate-50 transition-colors ${
                      isCurrentAllowed ? 'hover:bg-emerald-50/30' : 'hover:bg-slate-50/50'
                    }`}>
                      <td className={`px-4 py-2.5 font-medium ${isCurrentAllowed ? 'text-slate-700' : 'text-slate-400'}`}>
                        {feature}
                        {!isCurrentAllowed && (
                          <span className="ml-2 text-[9px] font-bold text-slate-300 uppercase tracking-wider">tidak tersedia</span>
                        )}
                      </td>
                      {roles.map(r => {
                        const allowed = matrix[category]?.[feature]?.[r];
                        return (
                          <td key={r} className="px-3 py-2.5 text-center">
                            {allowed === undefined ? <span className="text-slate-200">â€”</span> : allowed ? <Check /> : <Cross />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Diizinkan</div>
        <div className="flex items-center gap-1.5"><XCircle size={13} className="text-slate-300" /> Tidak tersedia</div>
        <div className="ml-auto text-[10px] text-slate-400">* Mobile app (nahkoda/abk) tidak dapat mengakses web dashboard</div>
      </div>
    </div>
  );
};

export default RoleAccessTable;

