import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { backendAPI } from '@/services/backendService';

interface PermissionContextType {
  permissions: Record<string, boolean>;
  hasPermission: (feature: string) => boolean;
  isLoading: boolean;
  loaded: boolean;
  reload: () => void;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: {},
  hasPermission: () => false,
  isLoading: false,
  loaded: false,
  reload: () => {},
});

export const usePermissions = () => useContext(PermissionContext);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    if (!role || !token) return;

    setIsLoading(true);
    try {
      const res = await backendAPI.request<{ data: Array<{ role: string; feature: string; allowed: boolean }> }>(
        '/api/role-permissions'
      );
      const map: Record<string, boolean> = {};
      (res.data || [])
        .filter(p => p.role === role)
        .forEach(p => { map[p.feature] = p.allowed === true || p.allowed === 1; });
      console.log('Permissions for role:', role, map);
      setPermissions(map);
      setLoaded(true);
    } catch {
      setPermissions({});
      setLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Listen perubahan localStorage (saat login set userRole)
  useEffect(() => {
    const onStorage = () => load();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [load]);

  // Jika belum selesai load, sembunyikan semua (return false)
  // Jika sudah load tapi feature tidak ada di map, berarti role tidak punya akses
  const hasPermission = (feature: string): boolean => {
    if (!loaded) return false;
    return permissions[feature] === true;
  };

  return (
    <PermissionContext.Provider value={{ permissions, hasPermission, isLoading, loaded, reload: load }}>
      {children}
    </PermissionContext.Provider>
  );
};

