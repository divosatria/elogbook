import React, { useState, useEffect } from 'react';
import { Save, Database, Bell, Shield, Globe, Smartphone, Mail, Key, Upload, Image, Fish, DollarSign, Settings as SettingsIcon, FileSignature } from 'lucide-react';

import { sanitizeInput, escapeHtml } from '@/utils/security';
import FishPriceSettings from '@/features/settings/FishPriceSettings';
import EmailSettings from '@/features/settings/EmailSettings';
import SignatureSettings from '@/features/settings/SignatureSettings';
import RoleAccessManager from '@/features/settings/RoleAccessManager';

interface AppSettings {
  systemName: string;
  systemLogo: string;
  headerTitle: string;
  websiteTitle: string;
  timezone: string;
  language: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  sosAlertSound: boolean;
  autoBackup: boolean;
  backupInterval: string;
  weatherApiKey: string;
  maxLoginAttempts: number;
  sessionTimeout: number;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('system');
  const [settings, setSettings] = useState<AppSettings>({
    systemName: 'E-Logbook Maritime System',
    systemLogo: '',
    headerTitle: 'E-Logbook Maritime',
    websiteTitle: 'E-Logbook Maritime - Sistem Manajemen Digital Perikanan',
    timezone: 'Asia/Jakarta',
    language: 'id',
    emailNotifications: true,
    smsNotifications: false,
    sosAlertSound: true,
    autoBackup: true,
    backupInterval: 'daily',
    weatherApiKey: '',
    maxLoginAttempts: 3,
    sessionTimeout: 60
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      setSaveMessage('Pengaturan berhasil disimpan');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    // Don't sanitize image data URLs
    if (typeof value === 'string' && key !== 'systemLogo') {
      value = sanitizeInput(value);
    }
    
    setSettings(prev => ({ ...prev, [key]: value }));
    // Save to localStorage for immediate use
    localStorage.setItem('appSettings', JSON.stringify({ ...settings, [key]: value }));
    
    // Update document title if websiteTitle is changed
    if (key === 'websiteTitle') {
      document.title = value;
    }
    
    // Update favicon if systemLogo is changed
    if (key === 'systemLogo') {
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      if (value) {
        favicon.href = value;
        favicon.type = 'image/png';
      } else {
        // Reset to default favicon if logo is removed
        favicon.href = '/favicon.svg';
        favicon.type = 'image/svg+xml';
      }
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveMessage('File harus berupa gambar (PNG, JPG, JPEG)');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setSaveMessage('Ukuran file maksimal 2MB');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const logoUrl = e.target?.result as string;
          if (logoUrl) {
            setSettings(prev => ({ ...prev, systemLogo: logoUrl }));
            localStorage.setItem('appSettings', JSON.stringify({ ...settings, systemLogo: logoUrl }));
            setSaveMessage('Logo berhasil diupload!');
            setTimeout(() => setSaveMessage(''), 3000);
            
            // Update favicon
            let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (!favicon) {
              favicon = document.createElement('link');
              favicon.rel = 'icon';
              document.head.appendChild(favicon);
            }
            favicon.href = logoUrl;
            favicon.type = 'image/png';
          }
        } catch (error) {
          console.error('Error processing logo:', error);
          setSaveMessage('Gagal memproses gambar');
          setTimeout(() => setSaveMessage(''), 3000);
        }
      };
      reader.onerror = () => {
        setSaveMessage('Gagal membaca file gambar');
        setTimeout(() => setSaveMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    event.target.value = '';
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      // Update document title with saved setting
      if (parsedSettings.websiteTitle) {
        document.title = parsedSettings.websiteTitle;
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION - Maritime Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
            <SettingsIcon className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Pengaturan Aplikasi
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
              Kelola konfigurasi sistem dan preferensi pengguna
            </p>
          </div>
        </div>
        {activeTab === 'system' && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 font-bold text-xs active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} strokeWidth={2.5} />
            {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        )}
      </div>

      {saveMessage && (
        <div className={`p-4 rounded-xl ${saveMessage.includes('berhasil') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {saveMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'system' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe size={18} />
            <span className="font-medium">Sistem</span>
          </button>
          <button
            onClick={() => setActiveTab('fish-prices')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'fish-prices' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Fish size={18} />
            <span className="font-medium">Harga Ikan</span>
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'email' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Mail size={18} />
            <span className="font-medium">Email</span>
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'signature' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSignature size={18} />
            <span className="font-medium">Tanda Tangan</span>
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              activeTab === 'access' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield size={18} />
            <span className="font-medium">Hak Akses</span>
          </button>

        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Settings */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Pengaturan Sistem</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Logo Sistem</label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50">
                  {settings.systemLogo ? (
                    <img src={settings.systemLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Image size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      <Upload size={16} className="mr-2" />
                      Upload Logo
                    </label>
                    {settings.systemLogo && (
                      <button
                        onClick={() => updateSetting('systemLogo', '')}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG hingga 2MB</p>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Sistem</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => updateSetting('systemName', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nama Header Menu</label>
              <input
                type="text"
                value={settings.headerTitle}
                onChange={(e) => updateSetting('headerTitle', e.target.value)}
                placeholder="Nama yang tampil di header sidebar"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Judul Website</label>
              <input
                type="text"
                value={settings.websiteTitle}
                onChange={(e) => updateSetting('websiteTitle', e.target.value)}
                placeholder="Judul yang tampil di tab browser"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Zona Waktu</label>
              <select
                value={settings.timezone}
                onChange={(e) => updateSetting('timezone', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Asia/Jakarta">WIB (Jakarta)</option>
                <option value="Asia/Makassar">WITA (Makassar)</option>
                <option value="Asia/Jayapura">WIT (Jayapura)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Bahasa</label>
              <select
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Bell size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Notifikasi</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Email Notifications</p>
                <p className="text-xs text-slate-500">Terima notifikasi via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                  className="sr-only"
                />
                <div className="w-11 h-6 rounded-full transition-colors relative" style={{ backgroundColor: settings.emailNotifications ? '#2563eb' : '#e2e8f0' }}>
                  <div className="absolute top-[2px] rounded-full h-5 w-5 transition-transform shadow-sm" style={{ backgroundColor: '#ffffff', left: '2px', transform: settings.emailNotifications ? 'translateX(20px)' : 'translateX(0)', border: `1px solid ${settings.emailNotifications ? '#ffffff' : '#cbd5e1'}` }}></div>
                </div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">SMS Notifications</p>
                <p className="text-xs text-slate-500">Terima notifikasi via SMS</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => updateSetting('smsNotifications', e.target.checked)}
                  className="sr-only"
                />
                <div className="w-11 h-6 rounded-full transition-colors relative" style={{ backgroundColor: settings.smsNotifications ? '#2563eb' : '#e2e8f0' }}>
                  <div className="absolute top-[2px] rounded-full h-5 w-5 transition-transform shadow-sm" style={{ backgroundColor: '#ffffff', left: '2px', transform: settings.smsNotifications ? 'translateX(20px)' : 'translateX(0)', border: `1px solid ${settings.smsNotifications ? '#ffffff' : '#cbd5e1'}` }}></div>
                </div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">SOS Alert Sound</p>
                <p className="text-xs text-slate-500">Suara alarm untuk SOS</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sosAlertSound}
                  onChange={(e) => updateSetting('sosAlertSound', e.target.checked)}
                  className="sr-only"
                />
                <div className="w-11 h-6 rounded-full transition-colors relative" style={{ backgroundColor: settings.sosAlertSound ? '#2563eb' : '#e2e8f0' }}>
                  <div className="absolute top-[2px] rounded-full h-5 w-5 transition-transform shadow-sm" style={{ backgroundColor: '#ffffff', left: '2px', transform: settings.sosAlertSound ? 'translateX(20px)' : 'translateX(0)', border: `1px solid ${settings.sosAlertSound ? '#ffffff' : '#cbd5e1'}` }}></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Keamanan</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Max Login Attempts</label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="10"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Session Timeout (menit)</label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="15"
                max="480"
              />
            </div>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Database size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Backup & Storage</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Auto Backup</p>
                <p className="text-xs text-slate-500">Backup otomatis database</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackup}
                  onChange={(e) => updateSetting('autoBackup', e.target.checked)}
                  className="sr-only"
                />
                <div className="w-11 h-6 rounded-full transition-colors relative" style={{ backgroundColor: settings.autoBackup ? '#2563eb' : '#e2e8f0' }}>
                  <div className="absolute top-[2px] rounded-full h-5 w-5 transition-transform shadow-sm" style={{ backgroundColor: '#ffffff', left: '2px', transform: settings.autoBackup ? 'translateX(20px)' : 'translateX(0)', border: `1px solid ${settings.autoBackup ? '#ffffff' : '#cbd5e1'}` }}></div>
                </div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Interval Backup</label>
              <select
                value={settings.backupInterval}
                onChange={(e) => updateSetting('backupInterval', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!settings.autoBackup}
              >
                <option value="hourly">Setiap Jam</option>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Weather API Key</label>
              <input
                type="password"
                value={settings.weatherApiKey}
                onChange={(e) => updateSetting('weatherApiKey', e.target.value)}
                placeholder="Masukkan API key untuk weather service"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'fish-prices' && (
        <FishPriceSettings />
      )}

      {activeTab === 'email' && (
        <EmailSettings />
      )}

      {activeTab === 'signature' && (
        <SignatureSettings />
      )}

      {activeTab === 'access' && (
        <RoleAccessManager />
      )}

    </div>
  );
};

export default Settings;


