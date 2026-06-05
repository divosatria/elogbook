@echo off
echo 🔄 Restarting E-Logbook Server...

echo 📋 Checking processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    if not "%%a"=="0" (
        echo 🛑 Killing process %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)

echo ⏳ Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo 🚀 Starting server...
npm start