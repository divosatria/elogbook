@echo off
REM Script to create placeholder images for perangkat testing
REM Run this script from the backend directory

set UPLOAD_DIR=uploads\perangkat-photos

REM Create directory if it doesn't exist
if not exist "%UPLOAD_DIR%" mkdir "%UPLOAD_DIR%"

echo Creating placeholder images for perangkat testing...

REM Note: This script creates simple text files as placeholders
REM For actual images, you can:
REM 1. Use online placeholder generators like https://via.placeholder.com/
REM 2. Download sample equipment images from the internet
REM 3. Use actual photos of your equipment

echo GPS Garmin GPSMAP 8612xsv > "%UPLOAD_DIR%\gps-garmin-sample.txt"
echo Radio VHF Icom IC-M506 > "%UPLOAD_DIR%\radio-icom-sample.txt"
echo Fish Finder Lowrance HDS-12 > "%UPLOAD_DIR%\fishfinder-lowrance-sample.txt"
echo Radar Furuno DRS4W > "%UPLOAD_DIR%\radar-furuno-sample.txt"
echo Kompas Gyro Sperry Marine > "%UPLOAD_DIR%\kompas-sperry-sample.txt"
echo Mesin Yamaha F150 > "%UPLOAD_DIR%\mesin-yamaha-sample.txt"
echo Jaring Trawl 40m > "%UPLOAD_DIR%\jaring-trawl-sample.txt"
echo Life Jacket 20 pcs > "%UPLOAD_DIR%\lifejacket-sample.txt"
echo EPIRB Emergency Beacon > "%UPLOAD_DIR%\epirb-sample.txt"
echo Winch Hydraulic 5 Ton > "%UPLOAD_DIR%\winch-sample.txt"

echo.
echo Placeholder files created successfully!
echo Files are located in: %UPLOAD_DIR%
echo.
echo To use real images:
echo 1. Download sample equipment images from the internet
echo 2. Rename them to match the filenames above (but with .jpg extension)
echo 3. Replace the .txt files with actual .jpg/.png/.webp images
echo 4. Supported formats: JPG, PNG, WEBP (max 5MB)
echo.
echo Example URLs for placeholder images:
echo https://via.placeholder.com/400x300/87CEEB/000000?text=GPS+Garmin
echo https://via.placeholder.com/400x300/90EE90/000000?text=Radio+VHF
echo https://via.placeholder.com/400x300/F08080/000000?text=Fish+Finder

pause