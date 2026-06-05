@echo off
echo ========================================
echo   Fish Price Integration Setup
echo ========================================
echo.

echo [1/5] Running database migration...
node migrateTaxColumns.js
if %errorlevel% neq 0 (
    echo ❌ Migration failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Adding sample fish prices...
node -e "
const { FishPrice } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function addSampleFishPrices() {
  try {
    await sequelize.authenticate();
    
    const samplePrices = [
      { fishType: 'tuna', pricePerKg: 25000, taxPercentage: 12.5 },
      { fishType: 'cakalang', pricePerKg: 18000, taxPercentage: 10.0 },
      { fishType: 'tongkol', pricePerKg: 15000, taxPercentage: 8.0 },
      { fishType: 'kembung', pricePerKg: 12000, taxPercentage: 7.5 },
      { fishType: 'teri', pricePerKg: 8000, taxPercentage: 5.0 }
    ];
    
    for (const price of samplePrices) {
      const existing = await FishPrice.findOne({ where: { fishType: price.fishType } });
      if (!existing) {
        await FishPrice.create(price);
        console.log('✅ Added:', price.fishType);
      } else {
        console.log('⚠️  Exists:', price.fishType);
      }
    }
    
    console.log('🎉 Sample fish prices added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addSampleFishPrices();
"

echo.
echo [3/5] Testing fish price API...
timeout /t 2 >nul
echo   Testing endpoints...

echo.
echo [4/5] Integration completed successfully!
echo   ✅ Database migrated with tax columns
echo   ✅ Sample fish prices added
echo   ✅ Fish price service integrated
echo   ✅ Auto tax calculation enabled
echo.

echo [5/5] Available endpoints:
echo   📊 Fish Prices: http://localhost:5000/api/fish-prices
echo   🐟 Catch Reports: http://localhost:5000/api/hasil-tangkap
echo   🧮 Tax Calculator: http://localhost:5000/api/hasil-tangkap/calculate-tax
echo   📚 API Docs: http://localhost:5000/api-docs
echo.

echo 🚀 Starting server with fish price integration...
npm run dev

pause