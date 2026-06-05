@echo off
echo 🚨 Setting up Emergency Alert System...
echo.

echo Installing Twilio dependency...
npm install twilio

echo.
echo ✅ Emergency system dependencies installed!
echo.
echo 📋 Next steps:
echo 1. Sign up for Twilio account at https://twilio.com
echo 2. Get your Account SID and Auth Token
echo 3. Buy a phone number for SMS
echo 4. Setup WhatsApp Business API (optional)
echo 5. Add these to your .env file:
echo.
echo    TWILIO_ACCOUNT_SID=your-account-sid
echo    TWILIO_AUTH_TOKEN=your-auth-token  
echo    TWILIO_PHONE_NUMBER=+1234567890
echo    TWILIO_WHATSAPP_NUMBER=+14155238886
echo.
echo 🧪 Test the system with:
echo    POST /api/emergency/test
echo.
echo 📱 Mobile endpoints:
echo    POST /api/mobile/emergency-alert
echo    POST /api/mobile/sos
echo.
pause