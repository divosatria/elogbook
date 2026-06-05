# Dokumentasi Perubahan — Endpoint Sinkronisasi Edge (IoT)

Sesuai permintaan, fitur untuk menerima paket data (batch) dari perangkat **LoRa Edge / Desktop** telah ditambahkan ke backend E-Logbook Maritime.

---

## Spesifikasi API Sinkronisasi

### 1. URL Endpoint
`POST /api/edge/sync`

### 2. Autentikasi (Static API Key)
Endpoint ini dilindungi oleh middleware khusus **IoT/Edge**. Authentication tidak menggunakan Bearer JWT milik *user*, melainkan **Static API Key**. 
- Header Wajib: `Authorization: Bearer <API-KEY>`
- Di mana `<API-KEY>` harus cocok dengan konfigurasi `EDGE_API_KEY` di file `.env`.

### 3. Struktur JSON Payload yang Diterima
Endpoint siap memproses struktur persis seperti yang Anda lampirkan:

```json
{
  "source": "lora_edge",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "count": 2,
  "packets": [
    {
      "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "raw_data": "{\"type\":\"rx\",\"data\":\"sensor:25.3\",\"rssi\":-67,\"snr\":9.2}",
      "parsed_data": "sensor:25.3",
      "rssi": -67,
      "snr": 9.2,
      "packet_type": "rx",
      "received_at": "2025-01-15T10:30:00.000Z",
      "lat": -6.5921,
      "lng": 106.7915,
      "suhu_air": 28.5,
      "suhu_kelembaban": 70.0,
      "berat": 10.5,
      "interval": 5,
      "trail": "T1"
    }
  ]
}
```

### 4. Respons Keberhasilan
Sistem menggunakan `bulkCreate` dengan opsi `updateOnDuplicate` (berdasarkan `uuid`). 
Sehingga, jika data berhasil masuk (baik *insert* maupun *update* duplikat), API akan merespons dengan:

**HTTP 201 Created**
```json
{
  "success": true,
  "message": "Data successfully synced",
  "synced_count": 2
}
```

---

## Detail File yang Ditambahkan & Diubah

| File | Keterangan |
|------|------------|
| `src/models/EdgeData.js` (Baru) | Model database `edge_data` yang menyimpan seluruh atribut dari payload `packets`. `uuid` digunakan sebagai Primary Key. |
| `src/models/index.js` (Modifikasi)| Registrasi model `EdgeData` ke instance Sequelize utama. |
| `src/middleware/edgeAuth.js` (Baru) | Filter keamanan (middleware) ringan yang bertugas mencocokkan Bearer Token dengan `EDGE_API_KEY` secara statis. Mengembalikan status `401 Unauthorized` jika token salah. |
| `src/controllers/edgeController.js` (Baru)| Memproses Array `packets`, mengabaikan array kosong, menyuntikkan origin `source`, dan melakukan *Bulk Insert* ke database agar tidak lambat. |
| `src/routes/edge.js` (Baru)| Mendefinisikan Rute URL `/sync` dan menyambungkannya dengan middleware dan controller di atas. |
| `src/app.js` (Modifikasi)| Mendaftarkan URL base `/api/edge` ke seluruh ekosistem backend aplikasi. |
| `.env` (Modifikasi)| Penambahan variabel lingkungan kunci utama `EDGE_API_KEY="my-secret-edge-key-123"`. |

---

## 🚀 Cara Implementasi Selanjutnya di Server Anda

> [!IMPORTANT]
> Karena kita membuat tabel baru di MySQL, pastikan tabelnya terbentuk (ter-sync). 
> 
> Anda bisa menjalankan skrip khusus yang saya sertakan:
> `node syncEdgeData.js`
>
> *(Catatan: Pastikan MySQL / XAMPP Anda sedang berjalan saat mengeksekusi ini!)*

Jika Anda sudah menjalankan `syncEdgeData.js` dengan sukses, Anda bisa menyalakan Node.js Server kembali:
```bash
npm run dev
```

Anda sudah bisa menguji *endpoint* tersebut via Postman atau menembaknya langsung dari aplikasi Desktop/IoT!
