const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Map of OLD relative paths to NEW relative paths
const fileMappings = {
  // 1. auth
  'controllers/authController.js': 'controllers/auth/authController.js',
  'controllers/userController.js': 'controllers/auth/userController.js',
  'controllers/passwordResetController.js': 'controllers/auth/passwordResetController.js',
  'controllers/rolePermissionController.js': 'controllers/auth/rolePermissionController.js',
  'models/User.js': 'models/auth/User.js',
  'models/PasswordResetToken.js': 'models/auth/PasswordResetToken.js',
  'routes/auth.js': 'routes/auth/auth.js',
  'routes/user.js': 'routes/auth/user.js',
  'routes/rolePermissions.js': 'routes/auth/rolePermissions.js',
  'middleware/auth.js': 'middleware/auth/auth.js',
  'middleware/simpleAuth.js': 'middleware/auth/simpleAuth.js',
  'middleware/optionalAuth.js': 'middleware/auth/optionalAuth.js',

  // 2. mobile
  'controllers/mobileCatchController.js': 'controllers/mobile/mobileCatchController.js',
  'controllers/mobileTripController.js': 'controllers/mobile/mobileTripController.js',
  'controllers/mobileVesselController.js': 'controllers/mobile/mobileVesselController.js',
  'controllers/aiController.js': 'controllers/mobile/aiController.js',
  'routes/mobile.js': 'routes/mobile/mobile.js',
  'routes/mobileCatch.js': 'routes/mobile/mobileCatch.js',
  'routes/mobileTrip.js': 'routes/mobile/mobileTrip.js',
  'routes/mobileVessel.js': 'routes/mobile/mobileVessel.js',
  'middleware/mobileCsrf.js': 'middleware/mobile/mobileCsrf.js',

  // 3. trip
  'controllers/tripController.js': 'controllers/trip/tripController.js',
  'controllers/adminTripController.js': 'controllers/trip/adminTripController.js',
  'controllers/tripTaskController.js': 'controllers/trip/tripTaskController.js',
  'controllers/tripDocumentController.js': 'controllers/trip/tripDocumentController.js',
  'controllers/hasilTangkapController.js': 'controllers/trip/hasilTangkapController.js',
  'controllers/catchPolygonController.js': 'controllers/trip/catchPolygonController.js',
  'models/Trip.js': 'models/trip/Trip.js',
  'models/TripTask.js': 'models/trip/TripTask.js',
  'models/HasilTangkap.js': 'models/trip/HasilTangkap.js',
  'models/CatchPolygon.js': 'models/trip/CatchPolygon.js',
  'routes/trip.js': 'routes/trip/trip.js',
  'routes/adminTrip.js': 'routes/trip/adminTrip.js',
  'routes/tripTask.js': 'routes/trip/tripTask.js',
  'routes/hasilTangkap.js': 'routes/trip/hasilTangkap.js',
  'routes/catchPolygon.js': 'routes/trip/catchPolygon.js',

  // 4. vessel
  'controllers/kapalController.js': 'controllers/vessel/kapalController.js',
  'controllers/crewController.js': 'controllers/vessel/crewController.js',
  'controllers/nahkodaController.js': 'controllers/vessel/nahkodaController.js',
  'controllers/profileDocumentController.js': 'controllers/vessel/profileDocumentController.js',
  'models/Kapal.js': 'models/vessel/Kapal.js',
  'models/VesselCrew.js': 'models/vessel/VesselCrew.js',
  'models/Nahkoda.js': 'models/vessel/Nahkoda.js',
  'models/Nelayan.js': 'models/vessel/Nelayan.js',
  'routes/kapal.js': 'routes/vessel/kapal.js',
  'routes/crew.js': 'routes/vessel/crew.js',
  'routes/nahkoda.js': 'routes/vessel/nahkoda.js',
  'routes/profileDocument.js': 'routes/vessel/profileDocument.js',
  'middleware/vesselValidation.js': 'middleware/vessel/vesselValidation.js',
  'middleware/sertifikatValidation.js': 'middleware/vessel/sertifikatValidation.js',

  // 5. monitoring
  'controllers/monitoringController.js': 'controllers/monitoring/monitoringController.js',
  'controllers/perangkatController.js': 'controllers/monitoring/perangkatController.js',
  'controllers/edgeController.js': 'controllers/monitoring/edgeController.js',
  'controllers/fishingPointController.js': 'controllers/monitoring/fishingPointController.js',
  'controllers/poiController.js': 'controllers/monitoring/poiController.js',
  'models/Perangkat.js': 'models/monitoring/Perangkat.js',
  'models/EdgeData.js': 'models/monitoring/EdgeData.js',
  'models/FishingPoint.js': 'models/monitoring/FishingPoint.js',
  'models/POI.js': 'models/monitoring/POI.js',
  'models/HarborZone.js': 'models/monitoring/HarborZone.js',
  'routes/monitoring.js': 'routes/monitoring/monitoring.js',
  'routes/perangkat.js': 'routes/monitoring/perangkat.js',
  'routes/edge.js': 'routes/monitoring/edge.js',
  'routes/fishingPoint.js': 'routes/monitoring/fishingPoint.js',
  'routes/harborPOIs.js': 'routes/monitoring/harborPOIs.js',
  'routes/harborZones.js': 'routes/monitoring/harborZones.js',
  'middleware/edgeAuth.js': 'middleware/monitoring/edgeAuth.js',

  // 6. notification
  'models/Notification.js': 'models/notification/Notification.js',
  'models/Emergency.js': 'models/notification/Emergency.js',
  'routes/notifications.js': 'routes/notification/notifications.js',
  'routes/emergency.js': 'routes/notification/emergency.js',
  'services/notificationService.js': 'services/notification/notificationService.js',
  'services/mobileNotificationService.js': 'services/notification/mobileNotificationService.js',
  'services/emergencyService.js': 'services/notification/emergencyService.js',

  // 7. core
  'controllers/dashboardController.js': 'controllers/core/dashboardController.js',
  'controllers/emailSettingController.js': 'controllers/core/emailSettingController.js',
  'controllers/fishPriceController.js': 'controllers/core/fishPriceController.js',
  'controllers/operationalTaskController.js': 'controllers/core/operationalTaskController.js',
  'controllers/storageDataController.js': 'controllers/core/storageDataController.js',
  'controllers/signatureController.js': 'controllers/core/signatureController.js',
  'controllers/reportController.js': 'controllers/core/reportController.js',
  'controllers/weatherController.js': 'controllers/core/weatherController.js',
  'models/EmailSetting.js': 'models/core/EmailSetting.js',
  'models/FishPrice.js': 'models/core/FishPrice.js',
  'models/OperationalTask.js': 'models/core/OperationalTask.js',
  'models/Weather.js': 'models/core/Weather.js',
  'routes/dashboard.js': 'routes/core/dashboard.js',
  'routes/emailSettings.js': 'routes/core/emailSettings.js',
  'routes/fishPrice.js': 'routes/core/fishPrice.js',
  'routes/operationalTaskRoutes.js': 'routes/core/operationalTaskRoutes.js',
  'routes/storageData.js': 'routes/core/storageData.js',
  'routes/signature.js': 'routes/core/signature.js',
  'routes/report.js': 'routes/core/report.js',
  'routes/weather.js': 'routes/core/weather.js',
  'routes/test.js': 'routes/core/test.js',
  'routes/testGPS.js': 'routes/core/testGPS.js',
  'routes/admin.js': 'routes/core/admin.js',
  'services/emailService.js': 'services/core/emailService.js',
  'services/fishPriceService.js': 'services/core/fishPriceService.js',
  'services/openWeatherService.js': 'services/core/openWeatherService.js',
  'services/documentCleanupService.js': 'services/core/documentCleanupService.js',
  'services/pdfService.js': 'services/core/pdfService.js',
  'services/socketService.js': 'services/core/socketService.js',

  // 8. remaining middleware
  'middleware/csrf.js': 'middleware/core/csrf.js',
  'middleware/dashboardUpdater.js': 'middleware/core/dashboardUpdater.js',
  'middleware/errorHandler.js': 'middleware/core/errorHandler.js',
  'middleware/flexibleUpload.js': 'middleware/core/flexibleUpload.js',
  'middleware/passwordResetRateLimiter.js': 'middleware/core/passwordResetRateLimiter.js',
  'middleware/productionSecurity.js': 'middleware/core/productionSecurity.js',
  'middleware/realtimeUpdater.js': 'middleware/core/realtimeUpdater.js'
};

// Compute absolute mappings
const absMappings = {}; // old_absolute -> new_absolute
for (const [oldRel, newRel] of Object.entries(fileMappings)) {
  const oldAbs = path.join(srcDir, oldRel).replace(/\\/g, '/');
  const newAbs = path.join(srcDir, newRel).replace(/\\/g, '/');
  absMappings[oldAbs] = newAbs;
}

// Function to recursively find all JS files
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath.replace(/\\/g, '/'));
    }
  });
  return arrayOfFiles;
}

const allJsFiles = getAllFiles(srcDir);
const rootServerJs = path.join(__dirname, '../server.js').replace(/\\/g, '/');
if (fs.existsSync(rootServerJs)) {
  allJsFiles.push(rootServerJs);
}

// In-memory cache for new file contents
const newFileContents = {};
const newFilePaths = {}; // old_absolute -> new_absolute

allJsFiles.forEach(oldAbsPath => {
  let content = fs.readFileSync(oldAbsPath, 'utf8');
  const originalContent = content;
  const newAbsPath = absMappings[oldAbsPath] || oldAbsPath; // If not moved, path stays same
  
  // Track where this file is going
  newFilePaths[oldAbsPath] = newAbsPath;

  const requireRegex = /require\(['"](.*?)['"]\)/g;
  
  content = content.replace(requireRegex, (match, requiredPath) => {
    if (!requiredPath.startsWith('.')) return match; // Skip node_modules
    
    // 1. Resolve required path relative to OLD directory
    let resolvedTarget = path.resolve(path.dirname(oldAbsPath), requiredPath).replace(/\\/g, '/');
    
    // 2. Identify target file's absolute path (including extension)
    let exactTarget = resolvedTarget;
    if (!exactTarget.endsWith('.js')) {
      if (fs.existsSync(exactTarget + '.js')) {
        exactTarget += '.js';
      } else if (fs.existsSync(path.join(exactTarget, 'index.js'))) {
        exactTarget = path.join(exactTarget, 'index.js').replace(/\\/g, '/');
      }
    }
    
    // 3. Where is the target file going?
    const targetNewAbsPath = absMappings[exactTarget] || exactTarget;
    
    // 4. Calculate relative path from THIS file's NEW dir to TARGET file's NEW dir
    let newRelPath = path.relative(path.dirname(newAbsPath), targetNewAbsPath).replace(/\\/g, '/');
    
    if (!newRelPath.startsWith('.')) {
      newRelPath = './' + newRelPath;
    }
    
    // Remove .js extension if original didn't have it
    if (!requiredPath.endsWith('.js') && newRelPath.endsWith('.js')) {
      newRelPath = newRelPath.slice(0, -3);
    }
    
    // Handle 'index.js' resolution
    if (!requiredPath.endsWith('index') && newRelPath.endsWith('/index')) {
      newRelPath = newRelPath.slice(0, -6);
    }

    return `require('${newRelPath}')`;
  });
  
  newFileContents[oldAbsPath] = content;
});

// Write to new locations and delete old files (if they moved)
console.log('--- Writing new files ---');
for (const oldAbsPath of Object.keys(newFileContents)) {
  const content = newFileContents[oldAbsPath];
  const newAbsPath = newFilePaths[oldAbsPath];
  
  // Create dir if needed
  const dir = path.dirname(newAbsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // If the file is moving, write to new and delete old
  if (oldAbsPath !== newAbsPath) {
    fs.writeFileSync(newAbsPath, content, 'utf8');
    fs.unlinkSync(oldAbsPath);
    console.log(`Moved & Updated: ${path.relative(srcDir, oldAbsPath)} -> ${path.relative(srcDir, newAbsPath)}`);
  } else {
    // Just update in place if content changed
    if (content !== fs.readFileSync(oldAbsPath, 'utf8')) {
      fs.writeFileSync(oldAbsPath, content, 'utf8');
      console.log(`Updated in place: ${path.relative(srcDir, oldAbsPath)}`);
    }
  }
}

console.log('Done!');
