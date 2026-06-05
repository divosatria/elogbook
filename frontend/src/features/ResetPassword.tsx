import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, XCircle, Check } from 'lucide-react';
import { backendAPI } from '@/services/backendService';
import logoIpbfull from '@/assets/images/logoipbfull.png';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Token tidak valid');
        setVerifying(false);
        return;
      }

      try {
        const response = await backendAPI.request(`/api/auth/verify-reset-token/${token}`, {
          method: 'GET'
        });
        
        if (response.success) {
          setTokenValid(true);
          setUserEmail(response.data.email);
        } else {
          setError(response.data.message || 'Token tidak valid');
        }
      } catch (err: any) {
        console.error('Token verification error:', err);
        
        if (err.response?.data?.errorType === 'INVALID_TOKEN') {
          setError('Link reset password tidak valid atau sudah kadaluarsa');
        } else {
          setError(err.response?.data?.message || 'Gagal memverifikasi token');
        }
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Password strength validation
  const validatePasswordStrength = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password minimal 8 karakter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password harus mengandung huruf besar';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password harus mengandung huruf kecil';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password harus mengandung angka';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError('Semua field wajib diisi');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    setLoading(true);

    try {
      const response = await backendAPI.request(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          newPassword,
          confirmPassword
        })
      });

      if (response.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Gagal mereset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      
      if (err.response?.status === 429) {
        setError('Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.');
      } else if (err.response?.data?.errorType === 'INVALID_TOKEN') {
        setError('Link reset password tidak valid atau sudah kadaluarsa');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: string; color: string; width: string } => {
    if (password.length === 0) return { strength: '', color: '', width: '0%' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: 'Lemah', color: 'bg-red-500', width: '33%' };
    if (score === 3) return { strength: 'Sedang', color: 'bg-yellow-500', width: '66%' };
    return { strength: 'Kuat', color: 'bg-green-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Memverifikasi link reset password...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Link Tidak Valid</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/forgot-password"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Request Link Baru
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Left Panel - Branding */}
      <div className="w-full md:w-5/12 bg-blue-700 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Background Circles */}
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
            Reset Password
          </h1>
          
          <p className="text-white text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed tracking-wide drop-shadow-md">
            Sistem Manajemen Logbook Digital untuk<br />
            <span className="font-bold text-yellow-400">Penangkapan Ikan</span>
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          {success ? (
            // Success State
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Password Berhasil Direset
                </h2>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Password Anda telah berhasil diubah. Anda akan diarahkan ke halaman login...
                </p>

                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="animate-spin" size={20} />
                  <span className="text-sm">Mengalihkan ke login...</span>
                </div>
              </div>
            </div>
          ) : (
            // Form State
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Buat Password Baru
                </h2>
                <p className="text-sm text-gray-600">
                  Reset password untuk: <strong className="text-gray-800">{userEmail}</strong>
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* New Password Input */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Password Baru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                      placeholder="Minimal 8 karakter"
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Kekuatan Password:</span>
                        <span className={`text-xs font-medium ${
                          passwordStrength.strength === 'Kuat' ? 'text-green-600' :
                          passwordStrength.strength === 'Sedang' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {passwordStrength.strength}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: passwordStrength.width }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                      placeholder="Ketik ulang password baru"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <p className="text-xs font-medium text-blue-800 mb-2">Password harus mengandung:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`} />
                      Minimal 8 karakter
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                      Huruf besar (A-Z)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                      Huruf kecil (a-z)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className={`w-3 h-3 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`} />
                      Angka (0-9)
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Mereset Password...
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      Reset Password
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                >
                  Kembali ke Login
                </Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            Â© 2026 E-Logbook Maritime. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


