# 🔓 Cara Membuka Blokir Maps di Browser

## 🌐 **CHROME** (Paling Mudah)

### Metode 1: Dari Address Bar
1. **Lihat address bar** (tempat URL) → ada ikon **🔒** atau **ⓘ**
2. **Klik ikon tersebut**
3. **Pilih "Site settings"** atau **"Pengaturan situs"**
4. **Cari "Location"** → ubah ke **"Allow"**
5. **Refresh halaman** (F5)

### Metode 2: Dari Settings
1. **Klik titik 3** di pojok kanan atas Chrome
2. **Settings** → **Privacy and security** → **Site Settings**
3. **Location** → **Add** → masukkan URL website
4. **Allow** → **Add**

### Metode 3: Langsung ke URL
1. **Copy paste** di address bar: `chrome://settings/content/location`
2. **Enter**
3. **Add** → masukkan URL website → **Allow**

---

## 🦊 **FIREFOX**

### Metode 1: Dari Address Bar
1. **Lihat address bar** → ada ikon **🛡️** (shield)
2. **Klik shield icon**
3. **Klik "Turn off Tracking Protection"** (jika ada)
4. **Atau klik ikon gembok** → **Connection secure** → **More information**
5. **Tab "Permissions"** → **Location** → **Allow**

### Metode 2: Dari Settings
1. **Klik hamburger menu** (3 garis) di pojok kanan
2. **Settings** → **Privacy & Security**
3. **Permissions** → **Location** → **Settings**
4. **Search** nama website → **Allow**

---

## 🧭 **SAFARI** (Mac)

### Metode 1: Dari Menu
1. **Safari menu** → **Preferences** (atau Cmd+,)
2. **Tab "Websites"**
3. **Location** di sidebar kiri
4. **Cari website** → ubah ke **"Allow"**

### Metode 2: Dari Address Bar
1. **Klik ikon gembok** di address bar
2. **Website Settings**
3. **Location** → **Allow**

---

## 🔷 **EDGE**

### Metode 1: Dari Address Bar
1. **Klik ikon gembok** di address bar
2. **Permissions for this site**
3. **Location** → **Allow**

### Metode 2: Dari Settings
1. **Klik titik 3** di pojok kanan
2. **Settings** → **Site permissions** → **Location**
3. **Add** → masukkan URL → **Allow**

---

## 📱 **MOBILE BROWSERS**

### Chrome Mobile (Android)
1. **Tap ikon gembok** di address bar
2. **Permissions**
3. **Location** → **Allow**

### Safari Mobile (iPhone)
1. **Settings** → **Safari** → **Location Services**
2. **Enable Location Services**
3. **Safari Websites** → **Allow**

---

## 🚨 **TROUBLESHOOTING**

### Jika Masih Tidak Bisa:

#### 1. **Clear Browser Cache**
- **Chrome**: Ctrl+Shift+Delete → Clear browsing data
- **Firefox**: Ctrl+Shift+Delete → Clear recent history
- **Safari**: Develop menu → Empty caches

#### 2. **Disable Extensions**
- **Buka mode incognito/private**
- **Atau disable ad blocker sementara**

#### 3. **Check Network/Firewall**
```
Buka Command Prompt (Windows) atau Terminal (Mac/Linux):

ping tile.openstreetmap.org
ping unpkg.com

Jika gagal = jaringan/firewall memblokir
```

#### 4. **DNS Issues**
Ganti DNS ke:
- **Google**: 8.8.8.8, 8.8.4.4
- **Cloudflare**: 1.1.1.1, 1.0.0.1

---

## 🎯 **QUICK FIX UNTUK SEMUA BROWSER**

### Universal Steps:
1. **Cari ikon gembok 🔒 atau info ⓘ** di address bar
2. **Klik ikon tersebut**
3. **Cari "Location" atau "Lokasi"**
4. **Ubah ke "Allow" atau "Izinkan"**
5. **Refresh halaman** (F5 atau Ctrl+R)

### Jika Tidak Ada Ikon:
1. **Klik kanan** di halaman web
2. **Inspect Element** atau **Developer Tools**
3. **Console tab**
4. **Ketik**: `navigator.geolocation.getCurrentPosition(console.log, console.error)`
5. **Enter** → browser akan minta izin lokasi

---

## 🔧 **UNTUK ADMIN JARINGAN**

### Whitelist Domain:
```
*.openstreetmap.org
*.tile.openstreetmap.org
unpkg.com
*.unpkg.com
leafletjs.com
*.leafletjs.com
```

### Firewall Rules:
```
Allow HTTPS (443) to:
- tile.openstreetmap.org
- unpkg.com
- leafletjs.com
```

---

## ✅ **CARA TEST BERHASIL**

### 1. **Buka Developer Console**
- **F12** → **Console tab**
- **Ketik**: `navigator.geolocation.getCurrentPosition(pos => console.log('GPS OK:', pos), err => console.log('GPS Error:', err))`
- **Enter**

### 2. **Test Maps Loading**
- **Buka**: https://leafletjs.com/examples/quick-start/
- **Jika peta muncul** = berhasil
- **Jika kosong** = masih diblokir

### 3. **Test di E-Logbook**
- **Buka halaman Hasil Tangkapan**
- **Klik "Input Data Manual"**
- **Klik "Pilih dari Zonasi Tangkap"**
- **Klik "Gunakan Lokasi Saat Ini"**
- **Jika minta izin GPS** = berhasil

---

## 🆘 **JIKA MASIH TIDAK BISA**

### Solusi Terakhir:
1. **Gunakan browser lain** (Chrome, Firefox, Edge)
2. **Gunakan VPN** (Cloudflare WARP gratis)
3. **Hubungi admin IT** untuk whitelist domain
4. **Gunakan input koordinat manual** (sistem tetap berfungsi)

### Kontak Support:
- **IT Support**: Minta whitelist domain maps
- **Developer**: Lapor masalah teknis
- **User Manual**: Gunakan LocationPickerSimple

---

## 💡 **TIPS PENTING**

1. **Refresh halaman** setelah ubah pengaturan
2. **Restart browser** jika perlu
3. **Check antivirus** - kadang blokir maps
4. **Corporate network** - minta admin whitelist
5. **Mobile data** - coba ganti ke WiFi atau sebaliknya

**🎯 Yang paling penting: Sistem E-Logbook tetap berfungsi meskipun maps diblokir karena ada LocationPickerSimple sebagai alternatif!**