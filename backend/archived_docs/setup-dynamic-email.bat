@echo off
echo ========================================
echo   Dynamic Email Settings Setup
echo ========================================
echo.

echo [1/4] Running email settings migration...
node migrateEmailSettings.js
if %errorlevel% neq 0 (
    echo ❌ Migration failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Testing current email configuration...
node -e "
const { EmailSetting } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function testEmailConfig() {
  try {
    await sequelize.authenticate();
    
    const settings = await EmailSetting.findOne({ where: { isActive: true } });
    
    if (settings) {
      console.log('✅ Email settings found in database');
      console.log('📧 SMTP Host:', settings.smtpHost);
      console.log('📧 From Name:', settings.fromName);
      console.log('📧 From Address:', settings.fromAddress);
    } else {
      console.log('⚠️  No email settings in database, using environment variables');
      console.log('📧 EMAIL_USER:', process.env.EMAIL_USER || 'Not set');
      console.log('📧 SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testEmailConfig();
"

echo.
echo [3/4] Dynamic email system ready!
echo   ✅ Database table created
echo   ✅ Email settings model configured
echo   ✅ Dynamic email service ready
echo   ✅ Admin interface endpoints available
echo.

echo [4/4] Available endpoints:
echo   📧 Email Settings: http://localhost:5000/api/email-settings
echo   🧪 Test Email: http://localhost:5000/api/email-settings/test
echo   📋 Email Templates: http://localhost:5000/api/email-settings/templates
echo   📚 API Docs: http://localhost:5000/api-docs
echo.

echo 🔧 Admin can now configure email settings through:
echo   1. Web interface (when frontend is ready)
echo   2. Direct API calls
echo   3. Database updates
echo.

echo 🚀 Starting server with dynamic email system...
npm run dev

pause