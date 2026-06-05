import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { backendAPI } from '@/services/backendService';
import { safeLog } from '@/utils/security';
import { Ship, Lock, User, Eye, EyeOff } from 'lucide-react';
import logoIpb from '@/assets/images/logoipb.png';
import logoIpbfull from '@/assets/images/logoipbfull.png';

interface LoginProps {
  onLogin: (token: string, role?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    safeLog.info('Attempting login', { username });
    safeLog.info('API URL configured');

    try {
      const response = await backendAPI.login(username, password);
      safeLog.info('Login response received');
      
      if (!response?.token) {
        safeLog.error('No token in response');
        throw new Error('Invalid response format');
      }

      // Cek role â€” fetch web roles dari DB, fallback ke default jika gagal
      const userRole = response.user?.role;
      let webRoles = ['admin', 'operator', 'supervisor'];
      try {
        const rolesRes = await backendAPI.request<{ data: string[] }>('/api/role-permissions/public-roles');
        if (rolesRes.data && rolesRes.data.length > 0) webRoles = rolesRes.data;
      } catch { /* pakai fallback */ }
      
      if (userRole && !webRoles.includes(userRole)) {
        setError(`Akses ditolak. Role "${userRole}" hanya dapat menggunakan aplikasi mobile.`);
        return;
      }
      
      localStorage.setItem('token', response.token);
      safeLog.info('Token saved to localStorage');
      onLogin(response.token, userRole);
    } catch (error: any) {
      safeLog.error('Login error', error);
      
      // Parse error response untuk mendapatkan pesan yang lebih spesifik
      let errorMessage = 'username atau password salah';
      
      if (error.message.includes('401')) {
        // Coba parse response body untuk mendapatkan pesan error yang spesifik
        try {
          const errorText = error.message.split('response: ')[1];
          if (errorText) {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            } else {
              errorMessage = 'Username atau password salah';
            }
          } else {
            errorMessage = 'Username atau password salah';
          }
        } catch {
          errorMessage = 'Username atau password salah';
        }
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error, silakan coba lagi';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Left Panel - Branding */}
      <div className="w-full md:w-5/12 bg-blue-700 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Background Circles (Decorative) */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-blue-500 blur-3xl"></div>
        </div>

        <div className="relative z-10 text-white flex flex-col items-center">
          <img 
            src={logoIpbfull} 
            alt="E-Logbook Logo" 
            className="w-32 md:w-40 h-auto object-contain mb-4 hover:scale-105 transition-transform duration-500 will-change-transform drop-shadow-sm"
          />

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight drop-shadow-md">
            E-Logbook Admin
          </h1>
          
          <p className="text-white text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed tracking-wide drop-shadow-md">
            Sistem Manajemen Logbook Digital untuk<br />
            <span className="font-bold text-yellow-400">Penangkapan Ikan</span>
          </p>
        </div>
        
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full md:w-7/12 bg-white p-8 md:p-16 flex flex-col justify-center overflow-y-auto relative">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-10">
            <img 
              src={logoIpb} 
              alt="IPB University" 
              className="h-20 mx-auto mb-4 object-contain"
            />
            <h2 className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-1">Selamat Datang di</h2>
            <h3 className="text-slate-800 text-lg font-bold">E-Logbook Admin</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-slate-700">Username</label>
              </div>
              <div className="relative">
                <User size={20} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all outline-none text-slate-700 bg-slate-50 hover:bg-white text-sm"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all outline-none text-slate-700 bg-slate-50 hover:bg-white text-sm"
                  placeholder="Masukkan password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-blue-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-700/20 disabled:opacity-70 disabled:cursor-not-allowed text-sm transform active:scale-[0.98]"
            >
              {isLoading ? 'Memuat...' : 'Masuk'}
            </button>
            
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm text-blue-700 hover:text-blue-800 font-medium transition-colors hover:underline"
              >
                Lupa Password?
              </Link>
            </div>
            
          </form>
        </div>

        <div className="absolute bottom-24 left-0 w-full text-center space-y-1">
          <p className="text-slate-400 text-xs font-medium">
            Versi 1.0.1
          </p>
          <p className="text-slate-400 text-xs font-medium">
            <span className="mx-1">&copy;</span> 2026 IPB University. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

