# Email Configuration untuk E-Logbook Maritime
# Tambahkan ke file .env di backend

# Gmail SMTP Configuration (Recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Alternative SMTP Configuration
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_SECURE=false

# Email Templates
EMAIL_FROM_NAME=E-Logbook Maritime
EMAIL_FROM_ADDRESS=noreply@e-logbook.com

# Email Features
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_DEBUG=false

# Setup Instructions:
# 1. Buat Gmail App Password:
#    - Buka Google Account Settings
#    - Security > 2-Step Verification > App passwords
#    - Generate password untuk "Mail"
#    - Gunakan password tersebut di EMAIL_PASS
#
# 2. Atau gunakan SMTP provider lain:
#    - Mailgun, SendGrid, AWS SES, dll
#    - Update konfigurasi sesuai provider
#
# 3. Test email dengan endpoint:
#    GET /api/test-email

## Fitur Email Otomatis

### 1. Email Jadwal Trip ke Nahkoda
Saat admin membuat jadwal trip dengan taskType 'departure' di TripScheduleManagement, sistem otomatis mengirim email ke nahkoda dengan detail:
- Nama kapal
- Tanggal dan waktu berangkat
- Deskripsi tugas
- Lokasi/area tangkap
- Prioritas tugas

**Trigger**: Ketika operational task dibuat dengan `taskType: 'departure'` dan `nahkodaId` terisi.

### 2. Email Status Update Trip
Saat status trip diubah (disetujui/ditolak/selesai), email dikirim ke nahkoda dan ABK.

### 3. Email Notifikasi Tugas
Saat operational task dibuat, email dikirim ke crew yang terkait berdasarkan assignedTo.

## Testing Email

Test email dengan endpoint:
```
GET /api/test-email?email=your-email@gmail.com
```

## Troubleshooting

1. **Email tidak terkirim**
   - Pastikan EMAIL_USER dan EMAIL_PASS benar
   - Cek log server untuk error
   - Pastikan Gmail "Less secure app access" aktif atau gunakan App Password

2. **Email masuk ke spam**
   - Konfigurasi SPF/DKIM di domain
   - Gunakan email dari domain resmi

3. **Template email tidak muncul**
   - Pastikan HTML template valid
   - Cek console untuk error rendering