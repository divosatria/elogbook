# 🚀 CI/CD Quick Commands

## 📦 Create & Push Release

```bash
# 1. Update version di pubspec.yaml
# version: 1.0.1+2

# 2. Commit changes
git add .
git commit -m "Release: v1.0.1"

# 3. Create tag
git tag v1.0.1

# 4. Push everything
git push origin main
git push origin v1.0.1
```

## 🔄 Update Existing Release

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Create new tag
git tag v1.0.0
git push origin v1.0.0
```

## 📥 Download APK URLs

```
https://github.com/YOUR_USERNAME/e_logbook/releases/latest/download/e-logbook-arm64-v8a.apk
https://github.com/YOUR_USERNAME/e_logbook/releases/latest/download/e-logbook-armeabi-v7a.apk
https://github.com/YOUR_USERNAME/e_logbook/releases/latest/download/e-logbook-x86_64.apk
```

## 🧪 Test Build Locally

```bash
# Build APK
flutter build apk --release --split-per-abi

# Check output
ls -lh build/app/outputs/flutter-apk/

# Install to device
adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

## 🔍 Check Workflow Status

```bash
# Via GitHub CLI
gh run list --workflow=build-apk.yml

# Watch latest run
gh run watch
```

## 📊 View Releases

```bash
# List all releases
gh release list

# View specific release
gh release view v1.0.0
```

## 🛠️ Troubleshooting

```bash
# Check Flutter version
flutter --version

# Clean build
flutter clean
flutter pub get

# Analyze code
flutter analyze

# Run tests
flutter test
```

## 🔐 Setup Secrets (GitHub CLI)

```bash
# Set secrets
gh secret set GEMINI_API_KEY
gh secret set GOOGLE_MAPS_API_KEY
gh secret set OPENWEATHER_API_KEY

# List secrets
gh secret list
```

## 📝 Version Bump Helper

```bash
# Patch (1.0.0 → 1.0.1)
git tag v1.0.1

# Minor (1.0.0 → 1.1.0)
git tag v1.1.0

# Major (1.0.0 → 2.0.0)
git tag v2.0.0
```
