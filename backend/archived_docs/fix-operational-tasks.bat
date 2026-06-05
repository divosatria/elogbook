@echo off
echo 🔧 Fixing operational tasks database issue...

cd /d "%~dp0"

echo 📊 Running migration to add catch_polygon_ids column...
node run-operational-tasks-migration.js

if %ERRORLEVEL% EQU 0 (
    echo ✅ Migration completed successfully
    echo 🚀 You can now create operational tasks
    pause
) else (
    echo ❌ Migration failed
    echo 💡 Please check your database connection and try again
    pause
)