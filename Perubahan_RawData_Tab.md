# Changelog & Catatan Perubahan: Fitur "Raw Data IoT"

Berikut adalah rangkuman perubahan yang telah diimplementasikan untuk menambahkan halaman pemantauan data mentah (Raw Data) dari perangkat IoT/Edge di *Dashboard* (Frontend).

## 1. Modifikasi Sisi Backend (Node.js)
Untuk melayani permintaan data mentah ke *frontend*, *backend* memerlukan jalur *endpoint* baru yang aman dan dikhususkan untuk aplikasi *Dashboard*.

- **`src/controllers/edgeController.js`**
  Menambahkan *method* `getRawData`. Metode ini menggunakan metode paginasi bawaan Sequelize (`findAndCountAll`) untuk mengambil seluruh isi dari tabel `edge_data`. Data ini diurutkan berdasarkan `received_at` secara *Descending* (dari yang terbaru).

- **`src/routes/edge.js`**
  Menambahkan rute baru `GET /api/edge/raw-data`. Berbeda dengan `/api/edge/sync` yang memakai `Static API Key`, rute baru ini menggunakan *middleware* `authenticate` bawaan *Dashboard* (berbasis JSON Web Token / JWT) sehingga data mentah ini hanya bisa dilihat oleh pengguna/admin yang sudah *login* di *Dashboard*.

---

## 2. Modifikasi Sisi Frontend (React.js / Vite)
Data dari rute *backend* di atas kemudian dihubungkan dan dirender ke dalam antarmuka web.

- **`services/backendService.ts`**
  Menambahkan fungsi `getRawEdgeData(page, limit)` untuk melakukan *HTTP GET Request* ke `/api/edge/raw-data` di *backend*.

- **`components/RawData.tsx`** *(File Baru)*
  Membuat halaman baru `RawData.tsx`. Halaman ini berisi desain antarmuka tabel (*Grid*) dinamis yang menampilkan:
  - Kolom **UUID** dan **Source** (*lora_edge* dll).
  - Kolom **Tipe** paket (*rx* atau *tx*).
  - Kolom **Sensor**, yang secara dinamis menampilkan data relevan dari JSON seperti Suhu (°C), Berat (kg), dan RSSI.
  - Kolom **Lokasi (GPS)** `lat, lng`.
  - Kolom **Waktu**.
  Halaman ini juga sudah dilengkapi dengan fitur **Pencarian (Search)** berbasis teks dan tombol **Muat Ulang (Refresh)**.

- **`components/AppContent.tsx`**
  Mendaftarkan *Route* `<Route path="/raw-data" element={<RawData />} />` agar URL `/raw-data` dapat memuat komponen di atas dengan sempurna dan tetap terlingkupi oleh struktur proteksi sesi bawaan.

- **`components/Layout.tsx`**
  Memodifikasi struktur *sidebar* aplikasi dengan menyisipkan menu navigasi **Raw Data** berikon `Database` tepat di bawah menu **Data Master**. Menu ini akan langsung mengarahkan pengguna ke halaman `/raw-data`.
