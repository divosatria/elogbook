# 🐟 E-Logbook - Electronic Logbook for Fishermen

<div align="center">

![Flutter](https://img.shields.io/badge/Flutter-3.8.1-02569B?logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-3.8.1-0175C2?logo=dart&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey)
![Status](https://img.shields.io/badge/Status-Active-success)

**Aplikasi mobile untuk manajemen logbook elektronik nelayan dengan fitur GPS tracking, AI fish detection, dan monitoring zona perairan.**

[Features](#-fitur-utama) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [API Docs](#-api-integration) • [Contributing](#-contributing)

</div>

---

## 📋 Daftar Isi

- [Tentang Aplikasi](#-tentang-aplikasi)
- [Fitur Utama](#-fitur-utama)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Struktur Project](#-struktur-project)
- [API Integration](#-api-integration)
- [Security](#-security)
- [Build & Deploy](#-build--deploy)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Tentang Aplikasi

**E-Logbook** adalah aplikasi mobile berbasis Flutter yang dirancang khusus untuk membantu nelayan dalam mencatat dan mengelola aktivitas penangkapan ikan secara digital. Aplikasi ini dilengkapi dengan teknologi GPS tracking real-time, AI fish detection menggunakan Google Gemini, dan sistem monitoring zona perairan untuk meningkatkan efisiensi dan kepatuhan regulasi perikanan.

### 🎯 Tujuan
- Digitalisasi pencatatan logbook nelayan
- Meningkatkan transparansi data perikanan
- Membantu monitoring dan compliance regulasi
- Optimasi rute dan hasil tangkapan

---

## ✨ Fitur Utama

### 🗺️ Real-time GPS Tracking
- ✅ Pelacakan posisi kapal secara real-time
- ✅ Visualisasi rute perjalanan di peta interaktif
- ✅ History tracking dengan playback feature
- ✅ Automatic position logging setiap interval
- ✅ Offline tracking dengan auto-sync

### 🐟 Manajemen Tangkapan Ikan
- ✅ Pencatatan hasil tangkapan dengan detail lengkap
- ✅ **AI Fish Detection** menggunakan Google Gemini API
- ✅ Upload foto tangkapan dengan camera/gallery
- ✅ Auto-detect jenis ikan, berat, dan kondisi
- ✅ Statistik dan analisis hasil tangkapan
- ✅ Export data ke PDF/Excel

### 📄 Manajemen Dokumen Digital
- ✅ Upload dokumen kapal & crew (KTP, SIM, Sertifikat)
- ✅ Validasi dokumen otomatis
- ✅ Status tracking (pending, approved, rejected)
- ✅ Notifikasi real-time untuk perubahan status
- ✅ Document expiry reminder

### ⚓ Manajemen Vessel (Kapal)
- ✅ Monitoring BBM dan es
- ✅ Manajemen sertifikat kapal
- ✅ Informasi crew dan nahkoda
- ✅ Riwayat maintenance dan perbaikan
- ✅ Vessel performance analytics

### 🚨 Zone Alert System
- ✅ Peringatan otomatis saat memasuki zona terlarang
- ✅ Visualisasi zona di peta (WPP-RI)
- ✅ Push notification real-time
- ✅ Geofencing technology
- ✅ Compliance monitoring

### 📴 Offline Mode
- ✅ Sinkronisasi otomatis saat koneksi tersedia
- ✅ Local database dengan SQLite
- ✅ Queue management untuk data offline
- ✅ Conflict resolution

### 🌤️ Weather Information
- ✅ Informasi cuaca real-time
- ✅ Prediksi cuaca untuk planning trip
- ✅ Wind speed & wave height
- ✅ Integrasi dengan OpenWeather API

### 📊 Statistik & Analytics
- ✅ Dashboard dengan grafik interaktif (FL Chart)
- ✅ Laporan bulanan dan tahunan
- ✅ Export data ke PDF/Excel
- ✅ Riwayat perjalanan lengkap
- ✅ Performance metrics

### 👥 Multi-Role Support
- ✅ **Nahkoda** (Captain): Full access, trip management
- ✅ **ABK** (Crew): Catch recording, document upload
- ✅ **Admin**: Monitoring, approval, analytics

---

## 📱 Screenshots

<div align="center">

### Main Features
| Splash Screen | Login | Home Dashboard |
|---------------|-------|----------------|
| <img src="screenshots/splash.png" width="250"/> | <img src="screenshots/login.png" width="250"/> | <img src="screenshots/home.png" width="250"/> |

### GPS Tracking & Mapping
| Live Tracking | Route History | Zone Alert |
|--------------|---------------|------------|
| <img src="screenshots/tracking.png" width="250"/> | <img src="screenshots/route.png" width="250"/> | <img src="screenshots/alert.png" width="250"/> |

### Catch Management
| Create Catch | AI Detection | Catch Detail |
|--------------|--------------|--------------|
| <img src="screenshots/create_catch.png" width="250"/> | <img src="screenshots/ai_detect.png" width="250"/> | <img src="screenshots/catch_detail.png" width="250"/> |

### Document & Profile
| Document Upload | Statistics | Profile |
|----------------|------------|---------|
| <img src="screenshots/document.png" width="250"/> | <img src="screenshots/stats.png" width="250"/> | <img src="screenshots/profile.png" width="250"/> |

</div>

---

## 🔧 Tech Stack

### 🎨 Framework & Language
```yaml
Flutter: 3.8.1      # Cross-platform UI framework
Dart: 3.8.1         # Programming language
Material Design 3   # Design system
```

### 🔄 State Management
```yaml
Provider: ^6.1.1    # Lightweight state management
```

### 🌐 Backend & API
```yaml
Dio: ^5.3.2                    # HTTP client
REST API                       # Backend communication
Firebase Cloud Messaging       # Push notifications
```

### 💾 Database & Storage
```yaml
sqflite: ^2.3.0               # Local SQLite database
shared_preferences: ^2.2.2    # Key-value storage
path_provider: ^2.1.1         # File system paths
```

### 🗺️ Maps & Location
```yaml
google_maps_flutter: ^2.5.0   # Google Maps integration
geolocator: ^10.1.0           # GPS & location services
geocoding: ^2.1.1             # Address geocoding
```

### 🤖 AI & Machine Learning
```yaml
Google Gemini API             # AI fish detection & identification
google_generative_ai: ^0.2.0  # Gemini SDK
```

### 🎨 UI/UX Components
```yaml
lottie: ^3.1.2                # Animations
fl_chart: ^0.66.0             # Interactive charts
flutter_screenutil: ^5.9.0    # Responsive design
cached_network_image: ^3.3.0  # Image caching
shimmer: ^3.0.0               # Loading skeleton
```

### 🛠️ Utilities
```yaml
connectivity_plus: ^4.0.2     # Network status monitoring
flutter_dotenv: ^5.1.0        # Environment variables
image_picker: ^1.0.4          # Camera & gallery access
permission_handler: ^11.0.1   # Runtime permissions
intl: ^0.18.1                 # Internationalization
url_launcher: ^6.2.1          # External URL handling
```

---

## 📦 Prerequisites

### Required Software

| Software | Version | Download Link |
|----------|---------|---------------|
| Flutter SDK | ^3.8.1 | [flutter.dev](https://flutter.dev/docs/get-started/install) |
| Dart SDK | ^3.8.1 | [dart.dev](https://dart.dev/get-dart) |
| Android Studio | Latest | [developer.android.com](https://developer.android.com/studio) |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com/) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

### Platform Requirements

**Android Development:**
- ✅ Android SDK (API level 21+)
- ✅ Android Emulator atau Physical Device
- ✅ Java JDK 11+

**iOS Development:**
- ✅ macOS (required)
- ✅ Xcode 14+
- ✅ CocoaPods
- ✅ iOS Simulator atau Physical Device

---

## 🚀 Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/e_logbook.git
cd e_logbook
```

### 2️⃣ Install Dependencies

```bash
flutter pub get
```

### 3️⃣ Setup Environment Variables

⚠️ **PENTING**: Setiap developer HARUS generate API key SENDIRI!

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Edit file `.env` dan isi dengan API keys Anda:

```env
# Backend API
API_BASE_URL=https://elogbookipb.web.id/api

# Google Gemini AI
# Generate di: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=YOUR_PERSONAL_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash

# Google Maps API
# Generate di: https://console.cloud.google.com/google/maps-apis
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY_HERE

# OpenWeather API
# Generate di: https://openweathermap.org/api
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_KEY_HERE
```

### 4️⃣ Setup Google Maps (Android)

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    ...
    <meta-data
        android:name="com.google.android.geo.API_KEY"
        android:value="YOUR_GOOGLE_MAPS_API_KEY"/>
</application>
```

### 5️⃣ Setup Firebase (Push Notifications)

**Android:**
1. Download `google-services.json` dari [Firebase Console](https://console.firebase.google.com/)
2. Letakkan di `android/app/`

**iOS:**
1. Download `GoogleService-Info.plist` dari Firebase Console
2. Letakkan di `ios/Runner/`

### 6️⃣ Verify Installation

```bash
flutter doctor -v
```

Pastikan semua checklist ✅ hijau.

### 7️⃣ Run the App

```bash
# Debug mode
flutter run

# Pilih specific device
flutter run -d <device_id>

# List available devices
flutter devices

# Release mode
flutter run --release
```

---

## 📁 Struktur Project

```
e_logbook/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── lib/
│   ├── config/              # App configuration
│   │   ├── app_initializer.dart
│   │   └── theme_config.dart
│   ├── constants/           # Constants (harbors, zones, fish types)
│   │   ├── harbors.dart
│   │   ├── zones.dart
│   │   └── fish_types.dart
│   ├── models/              # Data models
│   │   ├── catch_model.dart
│   │   ├── user_model.dart
│   │   ├── vessel_model.dart
│   │   ├── trip_model.dart
│   │   └── document_model.dart
│   ├── provider/            # State management (Provider)
│   │   ├── catch_provider.dart
│   │   ├── user_provider.dart
│   │   ├── zone_alert.dart
│   │   ├── navigation_provider.dart
│   │   ├── notification_provider.dart
│   │   └── tracking_minimize_provider.dart
│   ├── routes/              # Routing & navigation
│   │   └── route_generator.dart
│   ├── screens/             # UI screens
│   │   ├── crew/            # Crew features
│   │   │   ├── screens/
│   │   │   │   ├── create_catch_screen.dart
│   │   │   │   ├── catch_detail_screen.dart
│   │   │   │   └── catch_list_screen.dart
│   │   │   └── widgets/
│   │   ├── documents/       # Document management
│   │   │   ├── document_upload_screen.dart
│   │   │   └── document_list_screen.dart
│   │   ├── nahkoda/         # Captain features
│   │   │   ├── trip_management_screen.dart
│   │   │   └── crew_management_screen.dart
│   │   ├── tracking/        # GPS tracking
│   │   │   ├── tracking_screen.dart
│   │   │   ├── tracking_history_screen.dart
│   │   │   └── map_screen.dart
│   │   ├── vessel/          # Vessel management
│   │   │   ├── vessel_detail_screen.dart
│   │   │   └── vessel_list_screen.dart
│   │   ├── home_screen.dart
│   │   ├── main_screen.dart
│   │   ├── splash_screen.dart
│   │   ├── login_screen.dart
│   │   └── profile_screen.dart
│   ├── services/            # Business logic & API
│   │   ├── getApi/          # GET API services
│   │   │   ├── catch_service.dart
│   │   │   ├── trip_service.dart
│   │   │   └── vessel_service.dart
│   │   ├── postApi/         # POST API services
│   │   │   ├── auth_service.dart
│   │   │   └── document_service.dart
│   │   ├── local_storage/   # Local database
│   │   │   ├── database_helper.dart
│   │   │   └── sync_service.dart
│   │   ├── fcm/             # Firebase Cloud Messaging
│   │   │   └── fcm_service.dart
│   │   ├── realtime/        # Real-time updates
│   │   │   └── polling_service.dart
│   │   └── ai/              # AI services
│   │       └── gemini_service.dart
│   ├── utils/               # Helper utilities
│   │   ├── navigation_helper.dart
│   │   ├── responsive_helper.dart
│   │   ├── date_formatter.dart
│   │   └── validators.dart
│   ├── widgets/             # Reusable widgets
│   │   ├── custom_button.dart
│   │   ├── custom_appbar.dart
│   │   ├── loading_indicator.dart
│   │   ├── tracking_minimized_overlay.dart
│   │   └── initialization_error_screen.dart
│   └── main.dart            # Entry point
├── assets/                  # Static assets
│   ├── images/
│   ├── icons/
│   └── lottie/
├── test/                    # Unit tests
├── integration_test/        # Integration tests
├── .env.example             # Environment variables template
├── .gitignore
├── pubspec.yaml             # Dependencies
└── README.md
```

---

## 🔌 API Integration

### Base URL
```
https://elogbookipb.web.id/api
```

### Authentication
Token-based authentication menggunakan Bearer token:

```dart
// Headers untuk setiap request
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}
```

### 📡 Main Endpoints

#### 🔐 Authentication
```http
POST   /login              # User login
POST   /register           # User registration
POST   /logout             # User logout
POST   /refresh-token      # Refresh access token
```

#### 🐟 Catches (Tangkapan)
```http
GET    /catches            # Get all catches
GET    /catches/{id}       # Get catch detail
POST   /catches            # Create new catch
PUT    /catches/{id}       # Update catch
DELETE /catches/{id}       # Delete catch
POST   /catches/ai-detect  # AI fish detection
```

#### 🚢 Trips (Perjalanan)
```http
GET    /trips              # Get all trips
GET    /trips/{id}         # Get trip detail
POST   /trips/start        # Start new trip
PUT    /trips/{id}/end     # End trip
GET    /trips/active       # Get active trips
```

#### 📄 Documents
```http
GET    /documents          # Get user documents
POST   /documents/upload   # Upload document
GET    /documents/status   # Check document status
PUT    /documents/{id}     # Update document
DELETE /documents/{id}     # Delete document
```

#### 📍 Tracking
```http
POST   /tracking/start     # Start tracking
POST   /tracking/update    # Update position
POST   /tracking/stop      # Stop tracking
GET    /tracking/history   # Get tracking history
```

#### ⚓ Vessels (Kapal)
```http
GET    /vessels            # Get all vessels
GET    /vessels/{id}       # Get vessel detail
POST   /vessels            # Create vessel
PUT    /vessels/{id}       # Update vessel
```

#### 📊 Dashboard
```http
GET    /mobile/dashboard   # Get dashboard statistics
GET    /mobile/analytics   # Get analytics data
```

### 📝 Request/Response Examples

**Login Request:**
```json
POST /login
{
  "username": "nahkoda01",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "nahkoda01",
      "nama": "John Doe",
      "role": "nahkoda",
      "email": "john@example.com"
    }
  }
}
```

**Create Catch Request:**
```json
POST /catches
{
  "trip_id": 123,
  "fish_name": "Tuna",
  "fish_type": "Pelagis Besar",
  "weight": 25.5,
  "quantity": 3,
  "condition": "Segar",
  "catch_date": "2024-01-15 14:30:00",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "photo": "base64_encoded_image"
}
```

---

## 🔐 Security

### 🚨 API Key Security

⚠️ **CRITICAL - Jangan commit API keys ke Git!**

**Kenapa API Key Bisa Di-Block?**
1. ❌ API key di-commit ke GitHub (public/private)
2. ❌ API key di-share antar developer
3. ❌ Google bot auto-detect dan suspend key
4. ❌ Banyak IP berbeda pakai 1 key = suspicious activity

**✅ Best Practices:**
- ✅ Setiap developer generate key sendiri
- ✅ Simpan di file `.env` (sudah di `.gitignore`)
- ✅ JANGAN PERNAH commit atau share API key
- ✅ Rotate keys secara berkala (3-6 bulan)
- ✅ Set API key restrictions di console
- ✅ Monitor usage di dashboard

### 🔒 Production Security Checklist

- [ ] Implement `flutter_secure_storage` untuk token storage
- [ ] Enable SSL certificate pinning untuk API calls
- [ ] Implement biometric authentication (fingerprint/face)
- [ ] Enable code obfuscation saat build release
- [ ] Setup ProGuard rules (Android)
- [ ] Enable App Transport Security (iOS)
- [ ] Implement rate limiting
- [ ] Add request signing
- [ ] Enable crash reporting (Firebase Crashlytics)
- [ ] Implement proper error handling
- [ ] Add input validation & sanitization
- [ ] Setup security headers

---

## 📦 Build & Deploy

### 🤖 Android

#### Debug Build
```bash
flutter build apk --debug
```

#### Release Build (Optimized)
```bash
flutter build apk --release --obfuscate --split-debug-info=build/app/outputs/symbols
```

#### App Bundle (Google Play Store)
```bash
flutter build appbundle --release --obfuscate --split-debug-info=build/app/outputs/symbols
```

#### Split APK by ABI (Smaller size)
```bash
flutter build apk --split-per-abi --release
```

**Output locations:**
- APK: `build/app/outputs/flutter-apk/app-release.apk`
- AAB: `build/app/outputs/bundle/release/app-release.aab`

### 🍎 iOS

#### Debug Build
```bash
flutter build ios --debug
```

#### Release Build
```bash
flutter build ios --release
```

#### Create IPA (App Store)
```bash
flutter build ipa --release
```

### 📊 Build Size Analysis

```bash
# Analyze build size
flutter build apk --analyze-size

# Generate size report
flutter build apk --target-platform android-arm64 --analyze-size
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

Proyek ini dilengkapi dengan automated CI/CD pipeline menggunakan **GitHub Actions**:

#### 🔄 Main CI/CD Workflow
- ✅ Automated code analysis & testing
- ✅ Build Android APK & App Bundle
- ✅ Build iOS app
- ✅ Deploy ke Firebase App Distribution
- ✅ Create GitHub Releases

#### 🔍 Pull Request Checks
- ✅ Code quality checks
- ✅ Formatting validation
- ✅ Test coverage reports
- ✅ Automated PR comments

#### 📦 Release Automation
- ✅ Automated builds saat tag version
- ✅ Multi-architecture APK builds
- ✅ GitHub Release dengan changelog
- ✅ Firebase distribution ke production

### 📚 Documentation

- **[CI/CD Setup Guide](.github/CI-CD-GUIDE.md)** - Detailed setup instructions
- **[Quick Reference](.github/CI-CD-CHEATSHEET.md)** - Common commands & workflows
- **[Download APK Guide](.github/DOWNLOAD-GUIDE.md)** - How to download & install APK

### 🎯 Quick Start

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes & push
git add .
git commit -m "Add: Your feature"
git push origin feature/your-feature

# Create PR → CI checks run automatically

# After merge to main → Auto deploy to Firebase

# Create release
git tag v1.0.0
git push origin v1.0.0
# → Auto build & create GitHub Release
```

### ⚙️ Required Secrets

Setup di **GitHub Settings → Secrets**:

| Secret | Description |
|--------|-------------|
| `FIREBASE_APP_ID` | Firebase App ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Service Account JSON |

### 📊 Monitoring

- **GitHub Actions**: [View Workflows](../../actions)
- **Firebase Console**: [App Distribution](https://console.firebase.google.com/)
- **Codecov**: Coverage reports & trends

---

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
flutter test

# Run specific test file
flutter test test/services/catch_service_test.dart

# Run with coverage
flutter test --coverage

# View coverage report
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Integration Tests
```bash
# Run integration tests
flutter test integration_test/

# Run on specific device
flutter test integration_test/ -d <device_id>
```

### Widget Tests
```bash
flutter test test/widgets/
```

---

## 🐛 Known Issues & Limitations

### Current Issues
- [ ] Polling service perlu optimization untuk battery life
- [ ] Offline sync kadang delay saat network unstable
- [ ] Large image upload bisa timeout di koneksi lambat

### Limitations
- Minimum Android version: 5.0 (API 21)
- Requires GPS permission untuk tracking
- Requires camera permission untuk foto tangkapan
- Internet connection required untuk AI detection

---

## 📝 TODO & Roadmap

### High Priority
- [ ] Implement `flutter_secure_storage` untuk token
- [ ] Add Firebase Crashlytics
- [ ] Optimize background services (battery)
- [ ] Add comprehensive unit tests (target: 80% coverage)
- [x] Setup CI/CD pipeline (GitHub Actions)

### Medium Priority
- [ ] Add dark mode support
- [ ] Implement multi-language support (i18n)
- [ ] Add export to PDF/Excel feature
- [ ] Implement biometric authentication
- [ ] Add offline map caching

### Low Priority
- [ ] Add voice input untuk catch recording
- [ ] Implement AR fish measurement
- [ ] Add social features (share catch)
- [ ] Implement gamification (badges, achievements)

---

## 🤝 Contributing

Kontribusi sangat diterima! Silakan ikuti langkah berikut:

### 1️⃣ Fork & Clone
```bash
# Fork repository di GitHub
# Clone fork Anda
git clone https://github.com/your-username/e_logbook.git
cd e_logbook
```

### 2️⃣ Create Branch
```bash
git checkout -b feature/AmazingFeature
```

### 3️⃣ Make Changes
- Follow [Effective Dart](https://dart.dev/guides/language/effective-dart) guidelines
- Write clean, readable code
- Add comments untuk logic kompleks
- Write tests untuk new features

### 4️⃣ Commit
```bash
git add .
git commit -m "Add: Amazing new feature"
```

**Commit Message Convention:**
- `Add:` untuk fitur baru
- `Fix:` untuk bug fixes
- `Update:` untuk update existing feature
- `Refactor:` untuk code refactoring
- `Docs:` untuk documentation changes

### 5️⃣ Push & Pull Request
```bash
git push origin feature/AmazingFeature
```
Buat Pull Request di GitHub dengan deskripsi lengkap.

### 📋 Coding Standards

- ✅ Follow Dart style guide
- ✅ Use meaningful variable/function names
- ✅ Keep functions small and focused
- ✅ Add documentation comments
- ✅ Write tests untuk new code
- ✅ Update README jika diperlukan
- ✅ No hardcoded values (use constants)
- ✅ Handle errors properly

---

## 👥 Team

Developed with ❤️ by **Makerindo Team**

| Role | Name | Contact |
|------|------|---------|
| Project Manager | [Name] | [Email] |
| Lead Developer | [Name] | [Email] |
| Backend Developer | [Name] | [Email] |
| UI/UX Designer | [Name] | [Email] |
| QA Engineer | [Name] | [Email] |

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Makerindo Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 📞 Contact & Support

### 📧 Contact
- **Email**: support@elogbook.com
- **Website**: https://elogbookipb.web.id
- **GitHub Issues**: [Report Bug](https://github.com/your-username/e_logbook/issues)

### 💬 Community
- **Discord**: [Join Server](#)
- **Telegram**: [Join Group](#)
- **WhatsApp**: [Join Community](#)

### 📚 Documentation
- **API Docs**: https://elogbookipb.web.id/api/docs
- **User Guide**: [Wiki](https://github.com/your-username/e_logbook/wiki)
- **FAQ**: [Frequently Asked Questions](#)

---

## 🙏 Acknowledgments

Special thanks to:

- [Flutter Team](https://flutter.dev) - Amazing cross-platform framework
- [Google Gemini](https://ai.google.dev) - AI fish detection technology
- [OpenWeather](https://openweathermap.org) - Weather data API
- [Google Maps](https://developers.google.com/maps) - Maps & location services
- [Firebase](https://firebase.google.com) - Backend services
- All contributors and supporters of this project

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/your-username/e_logbook?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/e_logbook?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/your-username/e_logbook?style=social)
![GitHub issues](https://img.shields.io/github/issues/your-username/e_logbook)
![GitHub pull requests](https://img.shields.io/github/issues-pr/your-username/e_logbook)
![GitHub last commit](https://img.shields.io/github/last-commit/your-username/e_logbook)

---

<div align="center">

### ⭐ Star this repo if you find it helpful!

**Made with ❤️ and ☕ by Makerindo Team**

[⬆ Back to Top](#-e-logbook---electronic-logbook-for-fishermen)

</div>
 
 