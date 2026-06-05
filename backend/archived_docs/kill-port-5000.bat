@echo off
echo 🔍 Checking processes using port 5000...

REM Find process using port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    echo Found process ID: %%a
    echo 🔪 Killing process %%a...
    taskkill /F /PID %%a
)

echo ✅ Port 5000 should now be free
echo 🚀 You can now run: npm start
pause