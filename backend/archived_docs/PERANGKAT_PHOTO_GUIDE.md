# 📸 Fitur Foto Perangkat - E-Logbook Maritime

## 🎯 Overview
Fitur foto perangkat memungkinkan pengguna untuk menambahkan dokumentasi visual untuk setiap perangkat dalam inventaris kapal.

## ✨ Fitur Baru

### 1. **Upload Foto Perangkat**
- ✅ Support format: JPG, PNG, WEBP
- ✅ Maksimal ukuran: 5MB
- ✅ Preview gambar sebelum upload
- ✅ Hapus foto dengan tombol X

### 2. **Tampilan Foto di Tabel**
- ✅ Thumbnail foto 48x48px di kolom nama perangkat
- ✅ Placeholder icon jika tidak ada foto
- ✅ Rounded corners dengan border

### 3. **Form Management**
- ✅ Drag & drop file input
- ✅ File validation client-side
- ✅ Preview dengan opsi hapus
- ✅ Reset form membersihkan foto

## 🔧 Technical Implementation

### Frontend Changes (DataPerangkat.tsx)
```typescript
// New state for file handling
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

// File change handler
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  }
};
```

### Backend Integration
- ✅ Menggunakan multer middleware yang sudah ada
- ✅ File disimpan di `/uploads/perangkat-photos/`
- ✅ Naming convention: `perangkat-{timestamp}-{random}.ext`
- ✅ Auto-delete foto lama saat update

### Database Schema
```sql
-- Field foto sudah ada di tabel perangkats
foto TEXT NULL COMMENT 'Path foto perangkat'
```

## 📁 File Structure
```
backend/
├── uploads/
│   └── perangkat-photos/          # Folder foto perangkat
│       ├── .gitkeep
│       └── perangkat-*.jpg        # File foto
├── src/controllers/
│   └── perangkatController.js     # Upload logic
└── migrations/
    ├── update-perangkats-photos.sql
    └── create-sample-images.bat

frontend/
└── components/
    └── DataPerangkat.tsx          # UI dengan foto
```

## 🚀 Setup & Testing

### 1. Backend Setup
```bash
# Pastikan folder upload ada
mkdir -p backend/uploads/perangkat-photos

# Jalankan script untuk sample images (Windows)
cd backend
create-sample-images.bat

# Atau manual download dari:
# https://via.placeholder.com/400x300/87CEEB/000000?text=GPS+Garmin
```

### 2. Database Update
```sql
-- Update sample data dengan foto
source backend/migrations/update-perangkats-photos.sql;
```

### 3. Frontend Testing
- ✅ Buka halaman Data Perangkat
- ✅ Klik "Tambah Perangkat"
- ✅ Upload foto dan lihat preview
- ✅ Submit form dan cek foto di tabel
- ✅ Edit perangkat dan ganti foto

## 🎨 UI/UX Features

### Photo Display in Table
```tsx
{(p as any).fotoUrl ? (
  <img 
    src={apiUrl((p as any).fotoUrl)} 
    alt={p.namaPerangkat}
    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
  />
) : (
  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
    <Package size={20} className="text-slate-400" />
  </div>
)}
```

### Photo Upload Form
```tsx
<input
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  onChange={handleFileChange}
  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
/>
```

## 🔒 Security & Validation

### File Validation
- ✅ MIME type checking
- ✅ File extension validation
- ✅ File size limit (5MB)
- ✅ Unique filename generation

### Error Handling
- ✅ Invalid file type rejection
- ✅ File too large warning
- ✅ Upload failure handling
- ✅ Missing file graceful fallback

## 📱 Mobile Compatibility
- ✅ Responsive file input
- ✅ Touch-friendly preview
- ✅ Mobile camera access
- ✅ Optimized image display

## 🎯 Next Steps
1. **Image Optimization**: Auto-resize uploaded images
2. **Multiple Photos**: Support multiple photos per perangkat
3. **Image Gallery**: Modal view for larger photo display
4. **Bulk Upload**: Upload multiple perangkat photos at once
5. **Image Compression**: Client-side compression before upload

## 🐛 Troubleshooting

### Common Issues
1. **Foto tidak muncul**: Cek path `/uploads/perangkat-photos/` dan permissions
2. **Upload gagal**: Cek file size dan format
3. **Preview tidak muncul**: Cek browser support untuk FileReader API
4. **Foto lama tidak terhapus**: Cek write permissions di upload folder

### Debug Commands
```bash
# Cek folder permissions
ls -la backend/uploads/perangkat-photos/

# Cek file upload
curl -X POST -F "foto=@test.jpg" -F "namaPerangkat=Test" http://localhost:5000/api/perangkat
```