import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Settings, Wifi, Shield, Info, HelpCircle } from 'lucide-react';
import QuickHelp from '@/components/ui/QuickHelp';

interface MapsBlockedNotificationProps {
  onClose?: () => void;
  onOpenSettings?: () => void;
}

const MapsBlockedNotification: React.FC<MapsBlockedNotificationProps> = ({ 
  onClose, 
  onOpenSettings 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const handleOpenBrowserSettings = () => {
    if (navigator.userAgent.includes('Chrome')) {
      window.open('chrome://settings/content/location', '_blank');
    } else if (navigator.userAgent.includes('Firefox')) {
      window.open('about:preferences#privacy', '_blank');
    } else if (navigator.userAgent.includes('Safari')) {
      alert('Buka Safari > Preferences > Websites > Location untuk mengatur izin lokasi');
    } else {
      alert('Buka pengaturan browser Anda dan cari bagian "Privacy" atau "Location" untuk mengatur izin');
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div className={`fixed top-4 right-4 z-[9999] transition-all duration-300 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}>
        <div className="bg-white border-l-4 border-orange-500 rounded-lg shadow-2xl max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 border-b border-orange-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle size={20} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Maps Diblokir</h3>
                  <p className="text-xs text-slate-600">Akses peta dibatasi oleh browser/jaringan</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-1 hover:bg-white/50 rounded-full transition-colors"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700 font-medium">Browser memblokir akses peta</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sistem akan menggunakan input koordinat manual sebagai alternatif
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Wifi size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700 font-medium">GPS tetap berfungsi</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Anda masih bisa menggunakan lokasi GPS saat ini
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleOpenBrowserSettings}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Settings size={16} />
                  <span>Pengaturan</span>
                </button>
                
                <button
                  onClick={() => setShowQuickHelp(true)}
                  className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <HelpCircle size={16} />
                  <span>Panduan Cepat</span>
                </button>
              </div>
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-200 transition-colors text-sm"
              >
                <Info size={16} />
                <span>{showDetails ? 'Sembunyikan' : 'Lihat'} Detail Lengkap</span>
              </button>
            </div>

            {showDetails && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
                <h4 className="font-medium text-slate-800 text-sm mb-3">ðŸ”“ Cara Membuka Blokir Maps:</h4>
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="font-bold text-blue-800 mb-2">âœ¨ CARA TERCEPAT (Semua Browser):</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-700">
                      <li>Cari ikon <strong>ðŸ”’</strong> atau <strong>â“˜</strong> di address bar</li>
                      <li>Klik ikon tersebut</li>
                      <li>Cari "Location" atau "Lokasi"</li>
                      <li>Ubah ke "Allow" atau "Izinkan"</li>
                      <li>Refresh halaman (F5)</li>
                    </ol>
                  </div>
                  
                  <div>
                    <p className="font-medium text-slate-700 mb-2">ðŸŒ Chrome:</p>
                    <p className="mb-1">â€¢ Klik ikon gembok â†’ Site settings â†’ Location â†’ Allow</p>
                    <p className="text-slate-500">â€¢ Atau ketik: chrome://settings/content/location</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-slate-700 mb-2">ðŸ¦Š Firefox:</p>
                    <p className="mb-1">â€¢ Klik ikon shield â†’ Turn off Tracking Protection</p>
                    <p className="text-slate-500">â€¢ Atau: Settings â†’ Privacy & Security â†’ Location</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-slate-700 mb-2">ðŸ§­ Safari:</p>
                    <p className="mb-1">â€¢ Safari â†’ Preferences â†’ Websites â†’ Location</p>
                    <p className="text-slate-500">â€¢ Atau klik gembok â†’ Website Settings</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-slate-700 mb-2">ðŸ”· Edge:</p>
                    <p className="mb-1">â€¢ Klik gembok â†’ Permissions â†’ Location â†’ Allow</p>
                    <p className="text-slate-500">â€¢ Atau: Settings â†’ Site permissions â†’ Location</p>
                  </div>
                  
                  <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                    <p className="font-medium text-green-700 mb-1">ðŸ§ª Test Berhasil:</p>
                    <p className="text-green-600 text-xs">Tekan F12 â†’ Console â†’ ketik:</p>
                    <code className="text-xs bg-green-100 px-1 rounded">navigator.geolocation.getCurrentPosition(console.log)</code>
                  </div>
                  
                  <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="font-medium text-yellow-700 mb-1">ðŸ†˜ Jika Masih Tidak Bisa:</p>
                    <ul className="text-yellow-600 text-xs space-y-1">
                      <li>â€¢ Coba browser lain (Chrome/Firefox)</li>
                      <li>â€¢ Gunakan VPN (Cloudflare WARP gratis)</li>
                      <li>â€¢ Hubungi admin IT untuk whitelist</li>
                      <li>â€¢ Sistem tetap berfungsi dengan input manual</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2 px-3 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tutup Notifikasi
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('mapsBlockedNotificationDismissed', 'true');
                  handleClose();
                }}
                className="flex-1 py-2 px-3 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Jangan Tampilkan Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {showQuickHelp && (
        <QuickHelp onClose={() => setShowQuickHelp(false)} />
      )}
    </>
  );
};

export default MapsBlockedNotification;
