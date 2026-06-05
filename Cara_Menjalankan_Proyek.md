# Panduan Menjalankan Proyek Web E-Logbook

Dokumen ini menjelaskan langkah-langkah mudah untuk menjalankan aplikasi **Backend**, **Frontend**, dan **AI (Model Prediksi)** secara bersamaan di lingkungan *development* (pengembangan lokal).

---

## 1. Menyiapkan Terminal (Dibutuhkan 3 Terminal)

Karena kita memiliki 3 komponen (Backend, Frontend, dan AI Model) yang berjalan di server dan port berbeda, Anda harus membuka **tiga jendela terminal terpisah** (bisa menggunakan *split terminal* di VS Code).

### Terminal 1: Menjalankan Backend (Server API)
Backend bertanggung jawab untuk menyediakan API dan menghubungkan ke database MySQL.

1. Buka terminal baru.
2. Pindah ke folder `backend`:
   ```bash
   cd backend
   ```
3. *(Opsional)* Jika Anda baru pertama kali atau ada perubahan package, jalankan `npm install`.
4. Jalankan server backend:
   ```bash
   npm run dev
   ```
> [!NOTE]
> Server Backend akan berjalan di **http://localhost:5000**.
> Jangan tutup terminal ini, biarkan berjalan di latar belakang.

---

### Terminal 2: Menjalankan Frontend (Aplikasi Web)
Frontend adalah tampilan web (React/Vite) yang akan Anda lihat di browser.

1. Buka terminal baru (terminal kedua).
2. Pindah ke folder `frontend`:
   ```bash
   cd frontend
   ```
3. *(Opsional)* Jika Anda baru pertama kali, jalankan `npm install`.
4. Jalankan server frontend:
   ```bash
   npm run dev
   ```
> [!NOTE]
> Server Frontend akan berjalan di **http://localhost:5173**.
> Jangan tutup terminal ini.

---

### Terminal 3: Menjalankan AI (Model Prediksi)
Proyek ini memiliki *Machine Learning API* (Python) di folder `model-prediksi`.

1. Buka terminal baru (terminal ketiga).
2. Pindah ke folder `backend` terlebih dahulu:
   ```bash
   cd backend
   ```
3. Jalankan script khusus AI (script ini otomatis akan mengaktifkan *virtual environment* Python dan menjalankan `api.py`):
   ```bash
   npm run start:ai
   ```
> [!TIP]
> **API AI Prediksi** akan berjalan dan siap menerima *request* dari Frontend/Backend.

---

## 2. Mengakses Aplikasi

Setelah ketiga terminal di atas berjalan (`npm run dev` di backend, `npm run dev` di frontend, dan `npm run start:ai` untuk Python), Anda bisa membuka browser (Chrome/Edge/Firefox) dan mengakses URL berikut:

- **Web E-Logbook (Frontend):** [http://localhost:5173](http://localhost:5173)
- **API Dokumentasi (Swagger):** [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

### Kredensial Default (Jika dibutuhkan saat Login)
- **Username:** `admin`
- **Password:** `admin123`

---

## Ringkasan Singkat (Cheat Sheet)

```bash
# TERMINAL 1 (BACKEND)
cd backend
npm run dev

# TERMINAL 2 (FRONTEND)
cd frontend
npm run dev

# TERMINAL 3 (AI MODEL)
cd backend
npm run start:ai
```

> [!TIP]
> Pastikan MySQL (misalnya lewat XAMPP) sudah dalam keadaan **Start** sebelum Anda menjalankan backend.
