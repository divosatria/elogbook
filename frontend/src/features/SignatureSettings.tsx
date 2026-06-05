import React, { useState, useEffect } from 'react';
import { FileSignature, Upload, X, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { backendAPI } from '@/services/backendService';

const SignatureSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    name: '',
    position: '',
    signature_image_path: null as string | null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await backendAPI.getSignatureSettings();
      setSettings(response);
      if (response.signature_image_path) {
        setPreviewImage(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${response.signature_image_path}`);
      }
    } catch (error) {
      console.error('Error loading signature settings:', error);
      showMessage('error', 'Gagal memuat pengaturan tanda tangan');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
        showMessage('error', 'Hanya file gambar (JPEG, JPG, PNG) yang diperbolehkan');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showMessage('error', 'Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      // Save name and position
      if (settings.name && settings.position) {
        await backendAPI.updateSignatureSettings({
          name: settings.name,
          position: settings.position
        });
      }

      // Upload signature image if selected
      if (selectedFile) {
        await backendAPI.uploadSignatureImage(selectedFile);
        setSelectedFile(null);
      }

      await loadSettings();
      showMessage('success', 'Pengaturan tanda tangan berhasil disimpan');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showMessage('error', error.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm('Yakin ingin menghapus gambar tanda tangan?')) return;

    try {
      setIsSaving(true);
      await backendAPI.deleteSignatureImage();
      setPreviewImage(null);
      setSelectedFile(null);
      await loadSettings();
      showMessage('success', 'Gambar tanda tangan berhasil dihapus');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      showMessage('error', error.response?.data?.message || 'Gagal menghapus gambar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <FileSignature className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Pengaturan Tanda Tangan PDF</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Konfigurasi tanda tangan untuk dokumen PDF resmi
          </p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="text-green-600 shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 shrink-0" size={20} />
          )}
          <p className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Name Input */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Nama Penandatangan
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Contoh: Dr. Ahmad Suryanto, M.Si"
          />
        </div>

        {/* Position Input */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Jabatan
          </label>
          <input
            type="text"
            value={settings.position}
            onChange={(e) => handleInputChange('position', e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Contoh: Kepala Dinas Kelautan dan Perikanan"
          />
        </div>

        {/* Signature Image Upload */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Gambar Tanda Tangan
          </label>
          
          {/* Preview */}
          {previewImage && (
            <div className="mb-4 relative inline-block">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50">
                <img 
                  src={previewImage} 
                  alt="Preview tanda tangan" 
                  className="max-h-32 object-contain"
                />
              </div>
              <button
                onClick={handleDeleteImage}
                className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Hapus gambar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Upload Button */}
          <div className="relative">
            <input
              type="file"
              id="signature-upload"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="signature-upload"
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
            >
              <Upload size={20} className="text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                {previewImage ? 'Ganti Gambar Tanda Tangan' : 'Upload Gambar Tanda Tangan'}
              </span>
            </label>
          </div>
          
          <p className="text-xs text-slate-500 mt-2">
            Format: JPEG, JPG, PNG â€¢ Maksimal 5MB â€¢ Rekomendasi: Background transparan
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={loadSettings}
            className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
            disabled={isSaving}
          >
            Reset
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || (!settings.name || !settings.position)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={18} />
                Simpan Pengaturan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureSettings;

