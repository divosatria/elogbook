# 🚀 CI/CD Setup Guide - E-Logbook

## ✅ Setup Selesai!

Workflow GitHub Actions sudah dibuat di `.github/workflows/build-apk.yml`

## 📋 Langkah Setup

### 1️⃣ Setup GitHub Secrets

Buka **GitHub Repository → Settings → Secrets and variables → Actions**

Tambahkan secrets berikut:

| Secret Name | Value | Cara Dapat |
|-------------|-------|------------|
| `GEMINI_API_KEY` | Your Gemini API Key | https://aistudio.google.com/app/apikey |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps Key | https://console.cloud.google.com/google/maps-apis |
| `OPENWEATHER_API_KEY` | Your OpenWeather Key | https://openweathermap.org/api |

**⚠️ PENTING**: Jangan commit API keys ke repository!

### 2️⃣ Push ke GitHub

```bash
git add .
git commit -m "Add: CI/CD workflow for APK build"
git push origin main
```

### 3️⃣ Create Release Tag

```bash
# Buat tag version
git tag v1.0.0

# Push tag ke GitHub
git push origin v1.0.0
```

**Otomatis akan:**
- ✅ Build APK (3 architecture)
- ✅ Create GitHub Release
- ✅ Upload APK ke Release

### 4️⃣ Manual Trigger (Optional)

Buka **GitHub → Actions → Build & Release APK → Run workflow**

## 📥 Download APK

Setelah build selesai, APK bisa didownload di:

```
https://github.com/YOUR_USERNAME/e_logbook/releases
```

## 🏗️ Build Artifacts

Setiap build menghasilkan 3 APK:

1. **e-logbook-arm64-v8a.apk** (Recommended)
   - Device modern (2017+)
   - Samsung, Xiaomi, Oppo, Vivo terbaru
   - Size: ~50MB

2. **e-logbook-armeabi-v7a.apk**
   - Device lama (2011-2017)
   - Compatibility mode
   - Size: ~45MB

3. **e-logbook-x86_64.apk**
   - Emulator Android Studio
   - Device Intel (rare)
   - Size: ~55MB

## 🔄 Update Version

Edit `pubspec.yaml`:

```yaml
version: 1.0.1+2  # version+buildNumber
```

Lalu create tag baru:

```bash
git tag v1.0.1
git push origin v1.0.1
```

## 🐛 Troubleshooting

### Build Failed - Missing Secrets
**Error**: `GEMINI_API_KEY not found`

**Fix**: Tambahkan secrets di GitHub Settings

### Build Failed - Flutter Version
**Error**: `Flutter version mismatch`

**Fix**: Update `flutter-version` di workflow file

### APK Not Uploaded
**Error**: `No files found`

**Fix**: Check build output path di workflow

## 📊 Monitoring

- **Build Status**: GitHub Actions tab
- **Build Time**: ~5-8 menit
- **Storage**: 30 hari (artifacts)
- **Releases**: Permanent

## 🎯 Best Practices

1. ✅ Gunakan semantic versioning (v1.0.0)
2. ✅ Test di local sebelum push tag
3. ✅ Update changelog di release notes
4. ✅ Rotate API keys secara berkala
5. ✅ Monitor build failures

## 📝 Version Naming

```
v1.0.0
│ │ │
│ │ └─ Patch (bug fixes)
│ └─── Minor (new features)
└───── Major (breaking changes)
```

## 🔐 Security Notes

- ❌ JANGAN commit `.env` file
- ❌ JANGAN hardcode API keys
- ✅ Gunakan GitHub Secrets
- ✅ Enable branch protection
- ✅ Review workflow changes

## 📞 Support

Jika ada masalah:
1. Check GitHub Actions logs
2. Verify secrets configuration
3. Test build locally: `flutter build apk --release`

---

**Happy Deploying! 🚀**
