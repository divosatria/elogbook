# Emergency Alert System - E-Logbook Maritime

Sistem darurat untuk mengirim notifikasi SOS dengan SMS/WhatsApp ke nahkoda kapal.

## 🚨 Fitur Emergency Alert

### Cara Kerja
1. **ABK atau Nahkoda** mengirim SOS dari mobile app
2. **Sistem** otomatis mengirim notifikasi ke nahkoda via:
   - Socket.IO (real-time)
   - SMS ke nomor telepon nahkoda
   - WhatsApp ke nomor telepon nahkoda
3. **Status trip** otomatis berubah ke "darurat"
4. **Dashboard admin** menerima alert real-time

## 📱 Mobile API Endpoints

### 1. Send Emergency Alert
```http
POST /api/mobile/emergency-alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "tripId": 123,
  "location": {
    "lat": -6.1075,
    "lng": 106.7803
  },
  "message": "Mesin kapal rusak, butuh bantuan segera",
  "emergencyType": "ENGINE_FAILURE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency alert sent successfully",
  "data": {
    "tripId": 123,
    "emergencyType": "ENGINE_FAILURE",
    "nahkoda": "Budi Santoso",
    "notificationResults": {
      "socketNotification": true,
      "smsNotification": true,
      "whatsappNotification": true,
      "errors": []
    }
  }
}
```

### 2. Send SOS (Legacy)
```http
POST /api/mobile/sos
Authorization: Bearer <token>
Content-Type: application/json

{
  "tripId": 123,
  "location": {
    "lat": -6.1075,
    "lng": 106.7803
  },
  "message": "SOS - Butuh bantuan segera"
}
```

## 🌐 Web API Endpoints

### 1. Send Emergency Alert
```http
POST /api/emergency/alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "tripId": 123,
  "location": {
    "lat": -6.1075,
    "lng": 106.7803
  },
  "message": "Darurat - Kapal mengalami kebocoran",
  "emergencyType": "COLLISION"
}
```

### 2. Test Emergency Notification (Admin Only)
```http
POST /api/emergency/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "phoneNumber": "+6281234567890",
  "message": "Test emergency notification"
}
```

### 3. Get Emergency Configuration
```http
GET /api/emergency/config
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "twilioConfigured": true,
    "smsEnabled": true,
    "whatsappEnabled": true,
    "emergencyTypes": [
      "SOS",
      "MEDICAL", 
      "FIRE",
      "COLLISION",
      "ENGINE_FAILURE",
      "WEATHER"
    ]
  }
}
```

## ⚙️ Konfigurasi Twilio

### 1. Setup Environment Variables
```bash
# .env file
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 2. Install Dependencies
```bash
npm install twilio
```

### 3. Format Nomor Telepon
- Sistem otomatis format nomor Indonesia
- `08123456789` → `+628123456789`
- `628123456789` → `+628123456789`

## 📋 Jenis Emergency

| Type | Deskripsi |
|------|-----------|
| `SOS` | Panggilan darurat umum |
| `MEDICAL` | Darurat medis |
| `FIRE` | Kebakaran |
| `COLLISION` | Tabrakan/tubrukan |
| `ENGINE_FAILURE` | Kerusakan mesin |
| `WEATHER` | Cuaca buruk |

## 🔧 Testing Emergency System

### 1. Test SMS/WhatsApp
```bash
curl -X POST http://localhost:5000/api/emergency/test \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+6281234567890",
    "message": "Test emergency notification"
  }'
```

### 2. Test Socket.IO
```javascript
// Frontend JavaScript
socket.on('emergency_alert', (data) => {
  console.log('Emergency Alert:', data);
  // Show emergency notification
  showEmergencyAlert(data);
});
```

## 📱 Format Pesan Emergency

### SMS/WhatsApp Template:
```
🚨 DARURAT SOS

Kapal: KM Bahari Jaya
Pelapor: Ahmad (abk)
Lokasi: -6.1075, 106.7803
Waktu: 15/12/2024 14:30:00

Pesan: Mesin kapal rusak, butuh bantuan segera

Segera hubungi kapal dan lakukan tindakan darurat yang diperlukan.

E-Logbook Maritime System
```

## 🔒 Security & Authorization

### Mobile App
- Hanya role `nahkoda` dan `abk` yang bisa kirim emergency
- User harus terdaftar dalam trip untuk kirim alert
- Rate limiting untuk mencegah spam

### Web Dashboard  
- Admin bisa test emergency notification
- Semua emergency alert tercatat di database
- Real-time monitoring via Socket.IO

## 🚀 Deployment Notes

### Production Setup
1. **Twilio Account**: Daftar di https://twilio.com
2. **Phone Number**: Beli nomor Twilio untuk SMS
3. **WhatsApp**: Setup WhatsApp Business API
4. **Environment**: Set semua TWILIO_* variables
5. **Testing**: Test dengan nomor asli sebelum production

### Monitoring
- Log semua emergency alerts
- Track notification delivery status
- Monitor Twilio usage dan billing

## 🔍 Troubleshooting

### SMS/WhatsApp Tidak Terkirim
1. Cek konfigurasi Twilio di `.env`
2. Pastikan nomor telepon nahkoda valid
3. Cek saldo Twilio account
4. Lihat error logs di console

### Socket.IO Tidak Berfungsi
1. Pastikan client terhubung ke Socket.IO
2. Cek CORS configuration
3. Verify Socket.IO event listeners

### Database Issues
1. Pastikan Trip dan User models ter-associate
2. Cek foreign key constraints
3. Verify nahkodaId di Trip table