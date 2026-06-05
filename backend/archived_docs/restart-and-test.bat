@echo off
echo 🔄 Restarting E-Logbook Backend Server...
echo.

REM Kill any existing Node.js processes on port 5000
echo 📋 Stopping existing server...
taskkill /F /IM node.exe 2>nul
netstat -ano | findstr :5000 | for /f "tokens=5" %%a in ('more') do taskkill /F /PID %%a 2>nul

echo ⏳ Waiting 3 seconds...
timeout /t 3 /nobreak >nul

echo 🚀 Starting server with updated code...
cd /d "%~dp0"
start "E-Logbook Server" cmd /k "npm start"

echo ⏳ Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo 🧪 Testing upload endpoint...
node test-simple-upload.js

echo.
echo ✅ Server restart completed!
echo 🌐 Swagger UI: http://localhost:5000/api-docs
echo 📱 Mobile Profile Upload: POST /api/mobile/profile/documents
echo.
pause