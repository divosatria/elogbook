@echo off
setlocal enabledelayedexpansion

echo 🚀 E-Logbook Mobile Development Setup
echo =====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo ✅ Node.js found: 
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found: 
npm --version

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo ℹ️  Installing dependencies...
    npm install
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

REM Copy mobile environment configuration
if not exist ".env" (
    if exist ".env.mobile.example" (
        copy ".env.mobile.example" ".env" >nul
        echo ✅ Mobile environment configuration copied to .env
    ) else (
        echo ⚠️  .env.mobile.example not found, using default .env.example
        if exist ".env.example" (
            copy ".env.example" ".env" >nul
        )
    )
) else (
    echo ℹ️  .env file already exists
)

echo.
echo ℹ️  Detecting network interfaces...

REM Get local IP addresses (Windows)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "ip=%%a"
    set "ip=!ip: =!"
    if not "!ip!"=="127.0.0.1" (
        echo   📍 http://!ip!:5000/api (Public WiFi Access)
    )
)

echo.
echo ℹ️  📱 Mobile App Configuration
echo ==========================
echo Use the public IP addresses above in your Flutter app:
echo.
echo ℹ️  🔧 Update your Flutter app configuration:
echo class ApiConfig {
echo   static const String baseUrl = 'http://YOUR_PUBLIC_WIFI_IP:5000/api';
echo   static const String mobileBaseUrl = '$baseUrl/mobile';
echo }
echo.

echo ℹ️  📚 Documentation URLs:
echo   🌐 Swagger UI: http://localhost:5000/api-docs
echo   📄 Mobile API Guide: ./MOBILE_API_GUIDE.md
echo   🏥 Health Check: http://localhost:5000/health
echo.

echo ℹ️  👥 Default Mobile Test Users:
echo   📧 Email: nahkoda@test.com ^| Password: password123 ^| Role: nahkoda
echo   📧 Email: abk@test.com ^| Password: password123 ^| Role: abk
echo.

echo ⚠️  🔐 Security Notes for Mobile Development:
echo   • CORS is configured for development (allows all origins)
echo   • Rate limiting is relaxed for mobile endpoints
echo   • JWT tokens are valid for 7 days
echo   • Only 'nahkoda' and 'abk' roles can access mobile endpoints
echo.

echo ℹ️  🚀 Starting development server...
echo Run: npm run dev
echo.

echo ✅ Mobile development setup complete!
echo ℹ️  Next steps:
echo   1. Start the server: npm run dev
echo   2. Open Swagger UI: http://localhost:5000/api-docs
echo   3. Test mobile endpoints with your Flutter app
echo   4. Check MOBILE_API_GUIDE.md for detailed integration guide
echo.

pause