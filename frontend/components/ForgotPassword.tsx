import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { backendAPI } from '../services/backendService';
import logoIpbfull from '../src/assets/images/logoipbfull.png';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate email
    if (!email) {
      setError('Email wajib diisi');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Format email tidak valid');
      return;
    }

    setLoading(true);

    try {
      const response = await backendAPI.request('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (response.success) {
        setSuccess(true);
        setEmail(''); // Clear email field
      } else {
        setError(response.data.message || 'Gagal mengirim email reset password');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      
      if (err.response?.status === 429) {
        setError('Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Left Panel - Branding (sama seperti Login) */}
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
                  Email Terkirim
                </h2>
                
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.
                </p>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
                  <p className="text-sm text-blue-800">
                    <strong>Catatan:</strong> Link hanya berlaku selama 1 jam dan hanya dapat digunakan satu kali.
                  </p>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Kembali ke Login
                </button>
              </div>
            </div>
          ) : (
            // Form State
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Lupa Password
                </h2>
                <p className="text-gray-600 text-sm">
                  Masukkan email Anda dan kami akan mengirimkan link untuk reset password
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="text-gray-400" size={20} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                      placeholder="nama@email.com"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
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
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Mail size={20} />
                      Kirim Link Reset
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">atau</span>
                </div>
              </div>

              {/* Admin Contact */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Tidak bisa akses email?
                </p>
                <p className="text-xs text-gray-600 mb-3">
                  Hubungi administrator untuk bantuan
                </p>
                <div className="space-y-2">
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp Admin
                  </a>
                  <a
                    href="mailto:admin@elogbookipb.web.id"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    admin@elogbookipb.web.id
                  </a>
                </div>
              </div>

              {/* Back to Login */}
              <Link
                to="/login"
                className="block text-center text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                <div className="flex items-center justify-center gap-1">
                  <ArrowLeft size={16} />
                  Kembali ke Login
                </div>
              </Link>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            © 2026 E-Logbook Maritime. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
