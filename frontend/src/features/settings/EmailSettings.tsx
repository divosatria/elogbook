import React, { useState, useEffect } from 'react';
import { Mail, Send, Settings, TestTube, Save, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface EmailSettings {
  id?: number;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  emailUser: string;
  emailPass: string;
  fromName: string;
  fromAddress: string;
  testEmail: string;
  isActive: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  variables: string[];
}

const EmailSettings: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    emailUser: '',
    emailPass: '',
    fromName: 'E-Logbook Maritime System',
    fromAddress: '',
    testEmail: '',
    isActive: true
  });

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load current settings
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setSettings(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email-settings/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error loading email templates:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Pengaturan email berhasil disimpan!' });
        setSettings(data.data);
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal menyimpan pengaturan email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan pengaturan' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.testEmail) {
      setMessage({ type: 'error', text: 'Masukkan alamat email untuk test' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsTesting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/email-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          testEmailAddress: settings.testEmail
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Test email berhasil dikirim ke ${settings.testEmail}!` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal mengirim test email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengirim test email' });
    } finally {
      setIsTesting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const updateSetting = (key: keyof EmailSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const smtpProviders = [
    { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
    { name: 'Outlook/Hotmail', host: 'smtp-mail.outlook.com', port: 587, secure: false },
    { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    { name: 'Custom', host: '', port: 587, secure: false }
  ];

  const selectProvider = (provider: typeof smtpProviders[0]) => {
    if (provider.name !== 'Custom') {
      setSettings(prev => ({
        ...prev,
        smtpHost: provider.host,
        smtpPort: provider.port,
        smtpSecure: provider.secure
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Pengaturan Email</h2>
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          <Save size={18} className="mr-2" /> 
          {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMTP Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Settings size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Konfigurasi SMTP</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Provider Email</label>
              <div className="grid grid-cols-2 gap-2">
                {smtpProviders.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => selectProvider(provider)}
                    className={`p-2 text-sm rounded-lg border transition-all ${
                      settings.smtpHost === provider.host
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">SMTP Host</label>
              <input
                type="text"
                value={settings.smtpHost}
                onChange={(e) => updateSetting('smtpHost', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Port</label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => updateSetting('smtpPort', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">SSL/TLS</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.smtpSecure}
                    onChange={(e) => updateSetting('smtpSecure', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm text-slate-600">Secure</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Email Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <Mail size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Kredensial Email</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email User</label>
              <input
                type="email"
                value={settings.emailUser}
                onChange={(e) => updateSetting('emailUser', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@elogbook-maritime.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password/App Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={settings.emailPass}
                  onChange={(e) => updateSetting('emailPass', e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="App password untuk Gmail"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Untuk Gmail, gunakan App Password bukan password biasa
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">From Name</label>
              <input
                type="text"
                value={settings.fromName}
                onChange={(e) => updateSetting('fromName', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="E-Logbook Maritime System"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">From Address</label>
              <input
                type="email"
                value={settings.fromAddress}
                onChange={(e) => updateSetting('fromAddress', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="noreply@elogbook-maritime.com"
              />
            </div>
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <TestTube size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Test Email</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Tujuan Test</label>
              <input
                type="email"
                value={settings.testEmail}
                onChange={(e) => updateSetting('testEmail', e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="test@example.com"
              />
            </div>
            
            <button
              onClick={handleTestEmail}
              disabled={isTesting || !settings.testEmail}
              className="w-full bg-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              <Send size={18} className="mr-2" />
              {isTesting ? 'Mengirim Test Email...' : 'Kirim Test Email'}
            </button>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                <strong>Tips:</strong> Test email akan mengirim email konfigurasi untuk memverifikasi pengaturan SMTP Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Email Templates */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Mail size={20} />
            </div>
            <h3 className="font-bold text-slate-800">Template Email</h3>
          </div>
          
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-800">{template.name}</h4>
                    <p className="text-sm text-slate-600">{template.description}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Subject: {template.subject}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-slate-500">
                    Variables: {template.variables.join(', ')}
                  </p>
                </div>
              </div>
            ))}
            
            {templates.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <Mail size={32} className="mx-auto mb-2 opacity-50" />
                <p>Tidak ada template email</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-800 mb-4">📧 Panduan Konfigurasi Email</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-medium mb-2">Gmail:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Aktifkan 2-Factor Authentication</li>
              <li>• Buat App Password di Google Account</li>
              <li>• Gunakan App Password, bukan password biasa</li>
              <li>• Host: smtp.gmail.com, Port: 587</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Outlook/Hotmail:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Host: smtp-mail.outlook.com</li>
              <li>• Port: 587</li>
              <li>• Gunakan password akun Microsoft</li>
              <li>• Pastikan SMTP auth diaktifkan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;