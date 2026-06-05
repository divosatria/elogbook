# 🔒 QUICK START - Security Improvements

## Langkah Cepat Implementasi

### 1. Generate JWT Secret Baru
```bash
cd backend
npm run generate:secret
```
Copy output dan update di `.env`:
```
JWT_SECRET=<generated_secret_here>
```

### 2. Update Environment Variables
```bash
# Copy template
cp .env.secure.example .env

# Edit dengan values yang sesuai
# Pastikan JWT_SECRET minimal 32 karakter
```

### 3. Install Dependencies (jika belum)
```bash
npm install
```

### 4. Test Locally
```bash
# Development mode
npm run dev

# Production mode
npm run start:prod
```

### 5. Verify Security
```bash
# Check for vulnerabilities
npm run security:check

# Generate security report
npm run security:report
```

---

## ✅ Checklist Verifikasi

### File Upload
- [ ] Directory `uploads/` exists dengan permissions 755
- [ ] Test upload sertifikat via API
- [ ] Verify file tersimpan di disk (bukan base64 di DB)
- [ ] Check file URL accessible via browser

### Authentication
- [ ] Login berhasil dengan user valid
- [ ] Login gagal dengan credentials salah
- [ ] Token expired handling works
- [ ] No fallback authentication active

### Input Validation
- [ ] Test dengan invalid date format
- [ ] Test dengan negative numbers
- [ ] Test dengan oversized strings
- [ ] Verify error messages informatif

### Rate Limiting
- [ ] Test multiple rapid requests
- [ ] Verify 429 response setelah limit
- [ ] Check different endpoints have different limits

### Database
- [ ] Connection successful
- [ ] Retry mechanism works (stop MySQL, start server)
- [ ] Transaction rollback works on error

---

## 🧪 Testing Commands

### Test File Upload
```bash
curl -X POST http://localhost:5000/api/mobile/vessel/1/sertifikat-jalan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "sertifikat=@test.pdf" \
  -F "nama=Test Sertifikat" \
  -F "nomorSertifikat=TEST-001" \
  -F "tanggalBerlaku=2025-12-31"
```

### Test Rate Limiting
```bash
# Run 10 times quickly
for i in {1..10}; do
  curl http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
done
```

### Test Input Validation
```bash
# Invalid date
curl -X POST http://localhost:5000/api/mobile/vessel/1/bahan-bakar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jenisBahanBakar": "Solar",
    "jumlahLiter": -100,
    "hargaPerLiter": 5000,
    "totalHarga": -500000,
    "tanggalPengisian": "invalid-date"
  }'
```

---

## 🚨 Common Issues & Solutions

### Issue: File upload fails
**Solution:**
```bash
# Check directory exists
mkdir -p uploads
chmod 755 uploads

# Check disk space
df -h
```

### Issue: Database connection fails
**Solution:**
```bash
# Check MySQL running
systemctl status mysql

# Test connection
mysql -u e_logbook_user -p e_logbook

# Check credentials in .env
cat .env | grep DB_
```

### Issue: JWT token invalid
**Solution:**
```bash
# Verify JWT_SECRET is set
cat .env | grep JWT_SECRET

# Generate new secret
npm run generate:secret

# Update .env and restart server
```

### Issue: CORS error
**Solution:**
```bash
# Check ALLOWED_ORIGINS in .env
cat .env | grep ALLOWED_ORIGINS

# Add your frontend URL
ALLOWED_ORIGINS=http://localhost:5173,http://your-frontend-url
```

---

## 📊 Monitoring

### Check Logs
```bash
# Real-time logs
tail -f logs/app.log

# Error logs only
tail -f logs/error.log

# PM2 logs (if using PM2)
pm2 logs e-logbook-backend
```

### Check Performance
```bash
# CPU & Memory
top -p $(pgrep -f "node server.js")

# Database connections
mysql -u root -p -e "SHOW PROCESSLIST;"

# File system usage
du -sh uploads/
```

---

## 🎯 Next Steps

1. **Production Deployment**
   - Setup HTTPS/SSL
   - Configure firewall
   - Setup monitoring (Sentry, New Relic)
   - Configure automated backups

2. **Performance Optimization**
   - Implement Redis caching
   - Setup CDN for static files
   - Database query optimization
   - Load balancing

3. **Advanced Security**
   - Implement 2FA
   - Add API key authentication
   - Setup WAF (Web Application Firewall)
   - Regular penetration testing

---

## 📚 Documentation

- **Full Security Guide:** `SECURITY_IMPROVEMENTS.md`
- **API Documentation:** `swagger.yaml`
- **Mobile API Guide:** `MOBILE_API_GUIDE.md`
- **Deployment Guide:** `../docs/VPS_DEPLOYMENT_GUIDE.md`

---

## 💡 Tips

1. **Development vs Production**
   - Always use `NODE_ENV=production` di production
   - Different rate limits untuk dev/prod
   - Enable all security features di production

2. **Regular Maintenance**
   - Weekly: `npm audit`
   - Monthly: `npm update`
   - Quarterly: Security review
   - Yearly: Penetration testing

3. **Backup Strategy**
   - Database: Daily automated backup
   - Files: Sync to cloud storage
   - Config: Version control
   - Test restore procedure monthly

---

**Last Updated:** 2024
**Version:** 2.1.0
