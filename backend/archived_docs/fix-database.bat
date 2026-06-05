@echo off
echo 🔄 Fixing invalid datetime values in database...
echo.

REM Run the fix script
node fix-invalid-dates.js

echo.
echo ✅ Database fix completed!
echo 🚀 You can now restart the server
echo.
pause