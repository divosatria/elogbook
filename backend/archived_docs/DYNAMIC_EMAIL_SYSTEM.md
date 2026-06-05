# 📧 Dynamic Email Settings System

## Overview

Sistem email dinamis memungkinkan admin untuk mengatur konfigurasi email melalui interface tanpa perlu mengubah environment variables atau restart server.

## Fitur Utama

### 1. **Database-Driven Configuration**
- Pengaturan email disimpan di database
- Fallback ke environment variables jika tidak ada pengaturan
- Multiple email configurations dengan status active/inactive

### 2. **Admin Management Interface**
- CRUD operations untuk email settings
- Test email functionality
- Template management
- Real-time configuration updates

### 3. **Security Features**
- CSRF protection untuk semua operasi
- Role-based access (admin only)
- Password encryption (production ready)
- Input validation dan sanitization

## Database Schema

### Tabel `email_settings`
```sql
CREATE TABLE email_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  smtp_host VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
  email_user VARCHAR(255) NOT NULL,
  email_pass VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL DEFAULT 'E-Logbook Maritime System',
  from_address VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  test_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Email Settings Management
```
GET    /api/email-settings              # Get current email settings (admin only)
PUT    /api/email-settings              # Update email settings (admin only + CSRF)
POST   /api/email-settings/test         # Test email configuration (admin only + CSRF)
GET    /api/email-settings/templates    # Get email templates (admin only)
```

## Usage Examples

### 1. Get Current Email Settings
```javascript
const response = await fetch('/api/email-settings', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const { data: settings } = await response.json();
console.log('Current settings:', settings);
```

### 2. Update Email Settings
```javascript
// Get CSRF token first
const csrfResponse = await fetch('/api/csrf-token', {
  credentials: 'include'
});
const { csrfToken } = await csrfResponse.json();

// Update settings
const response = await fetch('/api/email-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    emailUser: 'admin@elogbook-maritime.com',
    emailPass: 'your-app-password',
    fromName: 'E-Logbook Maritime System',
    fromAddress: 'noreply@elogbook-maritime.com',
    testEmail: 'test@example.com'
  })
});

const result = await response.json();
console.log('Settings updated:', result);
```

### 3. Test Email Configuration
```javascript
const response = await fetch('/api/email-settings/test', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({
    testEmailAddress: 'test@example.com'
  })
});

const result = await response.json();
console.log('Test result:', result);
```

## Email Service Integration

### Dynamic Email Service
```javascript
const dynamicEmailService = require('./services/dynamicEmailService');

// Send trip assignment email
await dynamicEmailService.sendTripAssignmentEmail(
  'nahkoda@example.com',
  'Nahkoda Name',
  {
    vesselName: 'KM Bahari',
    departureDate: '2024-01-15',
    fishingArea: 'Zona Utara Jakarta'
  }
);

// Send emergency alert
await dynamicEmailService.sendEmergencyAlertEmail(
  'admin@example.com',
  'Admin',
  {
    vesselName: 'KM Bahari',
    alertType: 'Engine Failure',
    location: 'Lat: -6.1, Lng: 106.8',
    timestamp: new Date(),
    message: 'Mesin kapal mengalami kerusakan'
  }
);
```

### Fallback Mechanism
```javascript
// Service automatically falls back to environment variables
// if no database settings are found:

// 1. Check database for active settings
// 2. If not found, use environment variables:
//    - SMTP_HOST
//    - SMTP_PORT
//    - SMTP_SECURE
//    - EMAIL_USER
//    - EMAIL_PASS
//    - EMAIL_FROM_NAME
//    - EMAIL_FROM_ADDRESS
```

## Email Templates

### Available Templates
1. **Trip Assignment** - Notifikasi penugasan trip baru
2. **Emergency Alert** - Alert darurat dari kapal
3. **Trip Status Update** - Update status trip
4. **Task Notification** - Notifikasi tugas operasional

### Template Variables
```javascript
// Trip Assignment Template
{
  recipientName: 'Nama Penerima',
  vesselName: 'Nama Kapal',
  departureDate: 'Tanggal Berangkat',
  fishingArea: 'Area Tangkap',
  targetFish: 'Target Ikan'
}

// Emergency Alert Template
{
  vesselName: 'Nama Kapal',
  alertType: 'Jenis Alert',
  location: 'Lokasi GPS',
  timestamp: 'Waktu Kejadian',
  message: 'Pesan Tambahan'
}
```

## Configuration Examples

### Gmail Configuration
```json
{
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "emailUser": "your-email@gmail.com",
  "emailPass": "your-app-password",
  "fromName": "E-Logbook Maritime System",
  "fromAddress": "noreply@your-domain.com"
}
```

### Outlook/Hotmail Configuration
```json
{
  "smtpHost": "smtp-mail.outlook.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "emailUser": "your-email@outlook.com",
  "emailPass": "your-password",
  "fromName": "E-Logbook Maritime System",
  "fromAddress": "noreply@your-domain.com"
}
```

### Custom SMTP Configuration
```json
{
  "smtpHost": "mail.your-domain.com",
  "smtpPort": 465,
  "smtpSecure": true,
  "emailUser": "admin@your-domain.com",
  "emailPass": "your-password",
  "fromName": "E-Logbook Maritime System",
  "fromAddress": "noreply@your-domain.com"
}
```

## Migration & Setup

### 1. Run Migration
```bash
cd backend
node migrateEmailSettings.js
```

### 2. Setup with Script
```bash
cd backend
setup-dynamic-email.bat
```

### 3. Manual Setup
```javascript
// Add email settings via API
const settings = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  emailUser: 'admin@elogbook-maritime.com',
  emailPass: 'your-app-password',
  fromName: 'E-Logbook Maritime System',
  fromAddress: 'noreply@elogbook-maritime.com'
};

// Use API endpoint to save settings
```

## Security Considerations

### 1. Password Storage
- Passwords stored in plain text (development)
- Use encryption for production deployment
- Consider using app passwords for Gmail

### 2. Access Control
- Only admin users can manage email settings
- CSRF protection for all state-changing operations
- Input validation and sanitization

### 3. Environment Fallback
- System gracefully falls back to environment variables
- No service interruption during configuration changes
- Secure default values

## Testing

### 1. Test Email Configuration
```bash
# Via API
curl -X POST http://localhost:5000/api/email-settings/test \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmailAddress":"test@example.com"}'
```

### 2. Test Email Service
```javascript
const dynamicEmailService = require('./services/dynamicEmailService');

// Test trip assignment email
await dynamicEmailService.sendTripAssignmentEmail(
  'test@example.com',
  'Test User',
  {
    vesselName: 'Test Vessel',
    departureDate: new Date(),
    fishingArea: 'Test Area'
  }
);
```

## Benefits

1. **No Server Restart Required** - Configuration changes apply immediately
2. **Multiple Configurations** - Support for different email providers
3. **Admin Friendly** - Easy configuration through web interface
4. **Secure** - Role-based access and CSRF protection
5. **Reliable** - Fallback mechanism ensures service continuity
6. **Flexible** - Support for various SMTP providers

## Troubleshooting

### Common Issues
1. **Gmail App Password** - Use app-specific password, not regular password
2. **SMTP Port** - Use 587 for TLS, 465 for SSL
3. **Firewall** - Ensure SMTP ports are not blocked
4. **Authentication** - Verify email credentials are correct

### Debug Mode
```javascript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Check email settings
const settings = await EmailSetting.findOne({ where: { isActive: true } });
console.log('Current settings:', settings);
```