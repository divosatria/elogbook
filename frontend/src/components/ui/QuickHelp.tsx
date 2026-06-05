import React, { useState } from 'react';
import { HelpCircle, X, ExternalLink, Copy, Check } from 'lucide-react';

interface QuickHelpProps {
  onClose?: () => void;
}

const QuickHelp: React.FC<QuickHelpProps> = ({ onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Browser';
  };

  const browserName = getBrowserName();

  const copyToClipboard = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(stepId);
      setTimeout(() => setCopiedStep(null), 2000);
    });
  };

  const openBrowserSettings = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) {
      window.open('chrome://settings/content/location', '_blank');
    } else if (userAgent.includes('Firefox')) {
      window.open('about:preferences#privacy', '_blank');
    } else {
      alert(`Buka pengaturan ${browserName} dan cari bagian "Location" atau "Privacy"`);
    }
  };

  const quickSteps = [
    {
      id: 'step1',
      icon: '🔍',
      title: 'Cari Ikon di Address Bar',
      description: 'Lihat ikon 🔒 atau ⓘ di sebelah URL',
      action: 'Klik ikon tersebut'
    },
    {
      id: 'step2', 
      icon: '⚙️',
      title: 'Buka Site Settings',
      description: 'Pilih "Site settings" atau "Pengaturan situs"',
      action: 'Klik menu yang muncul'
    },
    {
      id: 'step3',
      icon: '📍',
      title: 'Ubah Location Permission',
      description: 'Cari "Location" dan ubah ke "Allow"',
      action: 'Pilih Allow/Izinkan'
    },
    {
      id: 'step4',
      icon: '🔄',
      title: 'Refresh Halaman',
      description: 'Tekan F5 atau Ctrl+R untuk refresh',
      action: 'Refresh sekarang'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle size={24} />
              <div>
                <h3 className="font-bold text-lg">Cara Cepat Buka Blokir Maps</h3>
                <p className="text-blue-100 text-sm">Panduan untuk {browserName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Steps */}
        <div className="p-6">
          <div className="space-y-4">
            {quickSteps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{step.icon}</span>
                    <h4 className="font-medium text-slate-800 text-sm">{step.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{step.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                      {step.action}
                    </span>
                    <button
                      onClick={() => copyToClipboard(step.action, step.id)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
                      title="Copy instruction"
                    >
                      {copiedStep === step.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Alternative Methods */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 text-sm mb-2">🚀 Cara Alternatif:</h4>
            <div className="space-y-2 text-xs text-yellow-700">
              {browserName === 'Chrome' && (
                <div className="flex items-center justify-between">
                  <span>Langsung ke pengaturan Chrome:</span>
                  <button
                    onClick={() => copyToClipboard('chrome://settings/content/location', 'chrome-url')}
                    className="flex items-center space-x-1 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded"
                  >
                    <span className="font-mono">chrome://settings/content/location</span>
                    {copiedStep === 'chrome-url' ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              )}
              {browserName === 'Firefox' && (
                <div className="flex items-center justify-between">
                  <span>Langsung ke pengaturan Firefox:</span>
                  <button
                    onClick={() => copyToClipboard('about:preferences#privacy', 'firefox-url')}
                    className="flex items-center space-x-1 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded"
                  >
                    <span className="font-mono">about:preferences#privacy</span>
                    {copiedStep === 'firefox-url' ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Test Command */}
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 text-sm mb-2">🧪 Test Berhasil:</h4>
            <p className="text-xs text-green-700 mb-2">Tekan F12 → Console → paste command ini:</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 text-xs bg-green-100 p-2 rounded font-mono text-green-800 overflow-x-auto">
                {`navigator.geolocation.getCurrentPosition(pos => console.log('GPS OK:', pos), err => console.log('Error:', err))`}
              </code>
              <button
                onClick={() => copyToClipboard('navigator.geolocation.getCurrentPosition(pos => console.log("GPS OK:", pos), err => console.log("Error:", err))', 'test-cmd')}
                className="p-2 hover:bg-green-200 rounded text-green-600"
                title="Copy test command"
              >
                {copiedStep === 'test-cmd' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={openBrowserSettings}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <ExternalLink size={16} />
              <span>Buka Pengaturan {browserName}</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              Tutup
            </button>
          </div>

          {/* Emergency Help */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              Masih tidak bisa? 
              <button className="text-blue-600 hover:text-blue-700 ml-1 underline">
                Hubungi Support IT
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickHelp;