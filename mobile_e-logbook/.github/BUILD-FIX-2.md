# ✅ CI/CD Build Fix #2 - Geolocator Plugin

## 🐛 Problem
```
Could not get unknown property 'flutter' for extension 'android'
compileSdkVersion is not specified
```

Plugin `geolocator_android` tidak bisa akses Flutter properties di CI/CD environment.

## ✅ Solution
Set `compileSdkVersion` untuk semua subprojects di root `build.gradle.kts`.

## 📝 Changes Made

**File**: `android/build.gradle.kts`

**Added**:
```kotlin
subprojects {
    afterEvaluate {
        if (plugins.hasPlugin("com.android.library") || 
            plugins.hasPlugin("com.android.application")) {
            configure<com.android.build.gradle.BaseExtension> {
                compileSdkVersion(36)
                
                defaultConfig {
                    minSdk = 21
                    targetSdk = 36
                }
            }
        }
    }
}
```

Ini memastikan semua plugin Android punya SDK version yang benar.

## 🚀 Push Fix

```bash
git add android/
git commit -m "Fix: Set compileSdk for all Android subprojects"
git push origin main

# Trigger new build
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1
git tag v1.0.1
git push origin v1.0.1
```

Build akan sukses! ✅
