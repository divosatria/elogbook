@echo off
echo ========================================
echo   E-Logbook Maritime - Security Update
echo ========================================
echo.

echo [1/4] Installing dependencies...
cd /d "%~dp0"
npm install

echo.
echo [2/4] Checking security vulnerabilities...
npm audit --audit-level=moderate

echo.
echo [3/4] Security fixes applied:
echo   ✅ CSRF Protection enabled
echo   ✅ Input validation enhanced  
echo   ✅ Role-based authorization added
echo   ✅ Data normalization implemented
echo   ✅ SQL injection prevention
echo.

echo [4/4] Starting secure server...
echo   📱 Mobile API: http://localhost:5000/api/mobile
echo   🌐 Web API: http://localhost:5000/api
echo   📚 Swagger: http://localhost:5000/api-docs
echo   🔒 CSRF Token: http://localhost:5000/api/csrf-token
echo.

npm run dev

pause