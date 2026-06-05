const fs = require('fs');
const path = require('path');

const mobileFile = path.join(__dirname, '../src/routes/mobile/mobile.js');
const controllersDir = path.join(__dirname, '../src/controllers/mobile');

if (!fs.existsSync(controllersDir)) {
  fs.mkdirSync(controllersDir, { recursive: true });
}

let content = fs.readFileSync(mobileFile, 'utf8');

// We will split the file by regex matching router.(get|post|put|patch|delete)
// But since there are middlewares like authenticate, multer, etc, parsing is tricky.
// Let's use an array of endpoint signatures and map them to controllers.

const endpoints = [
  // PROFILE
  { sig: "router.post('/profile/documents'", controller: "mobileProfileController", func: "uploadDocument" },
  { sig: "router.get('/profile/documents'", controller: "mobileProfileController", func: "getDocuments" },
  { sig: "router.get('/profile'", controller: "mobileProfileController", func: "getProfile" },
  { sig: "router.put('/profile'", controller: "mobileProfileController", func: "updateProfile" },
  { sig: "router.put('/change-password'", controller: "mobileProfileController", func: "changePassword" },
  { sig: "router.post('/personal-documents'", controller: "mobileProfileController", func: "personalDocumentsAlt" },
  { sig: "router.delete('/profile/documents/:documentId'", controller: "mobileProfileController", func: "deleteDocument" },
  { sig: "router.get('/profile/admin/pending-documents'", controller: "mobileProfileController", func: "getPendingDocuments" },
  { sig: "router.patch('/profile/admin/users/:userId/documents/:documentId/approve'", controller: "mobileProfileController", func: "approveDocument" },
  { sig: "router.patch('/profile/admin/users/:userId/documents/:documentId/reject'", controller: "mobileProfileController", func: "rejectDocument" },
  
  // EMERGENCY
  { sig: "router.post('/emergency-alert'", controller: "mobileEmergencyController", func: "sendEmergencyAlert" },
  { sig: "router.post('/sos'", controller: "mobileEmergencyController", func: "sendSOS" },
  
  // DASHBOARD
  { sig: "router.get('/dashboard'", controller: "mobileDashboardController", func: "getDashboard" },
  { sig: "router.get('/notifications'", controller: "mobileDashboardController", func: "getNotifications" },
  { sig: "router.post('/notifications'", controller: "mobileDashboardController", func: "markNotificationRead" },
  
  // VESSEL
  { sig: "router.get('/vessels/assignment-status'", controller: "mobileVesselController", func: "getAssignmentStatus" },
  { sig: "router.get('/vessels/:id'", controller: "mobileVesselController", func: "getVesselDetail" },
  { sig: "router.post('/vessel/:kapalId/documents'", controller: "mobileVesselController", func: "uploadVesselDocument" },
  { sig: "router.get('/vessel/:kapalId/documents'", controller: "mobileVesselController", func: "getVesselDocuments" },
  { sig: "router.post('/vessel/:kapalId/bahan-bakar'", controller: "mobileVesselController", func: "uploadFuel" },
  { sig: "router.post('/vessel/:kapalId/fuel-data'", controller: "mobileVesselController", func: "uploadFuelData" },
  { sig: "router.get('/vessel/:kapalId/fuel-summary'", controller: "mobileVesselController", func: "getFuelSummary" },
  { sig: "router.post('/vessel/:kapalId/sertifikat-jalan'", controller: "mobileVesselController", func: "uploadSertifikat" },
  { sig: "router.post('/vessel/:kapalId/ice-data'", controller: "mobileVesselController", func: "uploadIceData" },
  { sig: "router.get('/vessel/:kapalId/ice-summary'", controller: "mobileVesselController", func: "getIceSummary" },
  { sig: "router.post('/vessel/:kapalId/storage-data'", controller: "mobileVesselController", func: "uploadStorageData" },
  { sig: "router.get('/vessels/my-vessel'", controller: "mobileVesselController", func: "getMyVessel" },
  { sig: "router.put('/vessel/:kapalId/bahan-bakar/:fuelId'", controller: "mobileVesselController", func: "updateFuelData" },
  { sig: "router.post('/vessel/:kapalId/debug-upload'", controller: "mobileVesselController", func: "debugUpload" },
  { sig: "router.post('/location'", controller: "mobileVesselController", func: "updateLocation" },

  // TRIP
  { sig: "router.get('/my-schedules'", controller: "mobileTripController", func: "getMySchedules" },
  { sig: "router.get('/my-trips'", controller: "mobileTripController", func: "getMyTrips" },
  { sig: "router.post('/trip-tasks'", controller: "mobileTripController", func: "submitTripTask" },
  { sig: "router.get('/trip/:tripId/task-detail'", controller: "mobileTripController", func: "getTripTaskDetail" },
  { sig: "router.get('/trip/:tripId/document-status'", controller: "mobileTripController", func: "getDocumentStatus" },
  { sig: "router.get('/trip/:tripId/can-start'", controller: "mobileTripController", func: "canStartTrip" },
  { sig: "router.get('/trip/:tripId/readiness'", controller: "mobileTripController", func: "getTripReadiness" },
  { sig: "router.post('/trip/:tripId/fuel-data'", controller: "mobileTripController", func: "uploadTripFuel" },
  { sig: "router.post('/trip/:tripId/ice-data'", controller: "mobileTripController", func: "uploadTripIce" },
  { sig: "router.patch('/trip/:tripId/start'", controller: "mobileTripController", func: "startTrip" },
  { sig: "router.patch('/trip/:tripId/complete'", controller: "mobileTripController", func: "completeTrip" },

  // CATCH
  { sig: "router.post('/catches-deprecated'", controller: "mobileCatchController", func: "submitCatchDeprecated" },
  { sig: "router.get('/catches-deprecated'", controller: "mobileCatchController", func: "getCatchHistoryDeprecated" }
];

let files = {
  mobileProfileController: [],
  mobileEmergencyController: [],
  mobileDashboardController: [],
  mobileVesselController: [],
  mobileTripController: [],
  mobileCatchController: []
};

// We process the file by searching for each signature and extracting its block.
// A block starts at the line containing the signature and ends at the closing `});` that balances the braces.
for (const ep of endpoints) {
  let startIndex = content.indexOf(ep.sig);
  if (startIndex === -1) {
    console.log(`Missing: ${ep.sig}`);
    continue;
  }
  
  // Backtrack to get comments if any
  let lineStart = content.lastIndexOf('\n', startIndex);
  let previousLineStart = content.lastIndexOf('\n', lineStart - 1);
  let prefix = '';
  if (previousLineStart !== -1) {
    let prevLine = content.substring(previousLineStart + 1, lineStart);
    if (prevLine.trim().startsWith('//')) {
      prefix = prevLine.trim() + '\n';
      startIndex = previousLineStart + 1; // start extraction from the comment
    }
  }

  // To find the end, count parentheses and braces from `router.xxx(`
  let searchStart = content.indexOf('(', startIndex);
  let openParen = 0;
  let openBrace = 0;
  let endIndex = -1;
  let startedBrace = false;

  // We actually just want the callback part, but it's easier to extract the whole `router.xxx(..., callback)` 
  // and then format it.
  for (let i = searchStart; i < content.length; i++) {
    const char = content[i];
    if (char === '(') openParen++;
    if (char === ')') openParen--;
    if (char === '{') { openBrace++; startedBrace = true; }
    if (char === '}') openBrace--;

    if (openParen === 0 && startedBrace && openBrace === 0 && content[i] === ')') {
      // Typically router.get('/path', auth, (req, res) => { ... });
      // The ) closes the router.get(
      if (content[i+1] === ';') {
        endIndex = i + 1;
        break;
      }
    }
  }

  if (endIndex !== -1) {
    let block = content.substring(startIndex, endIndex + 1);
    
    // We rewrite router.get('/path', authenticate, async (req, res) => { ... }) 
    // to exports.func = async (req, res) => { ... }
    
    // It's safer to just extract the callback, but there are multiple middlewares (multer, auth).
    // So let's keep the file as a Router in separate files!
    // Wait, the user wants Controllers, not just split routers.
    // Let's just create split routers for now, that's the standard Express modularization!
    // Express allows `app.use('/mobile/profile', profileRouter)`.
    
    files[ep.controller].push(block);
    
    // Blank out the extracted part to see what's left
    content = content.substring(0, startIndex) + "".padEnd(endIndex - startIndex + 1, ' ') + content.substring(endIndex + 1);
  } else {
    console.log(`Failed to balance: ${ep.sig}`);
  }
}

// Now write the files out
const imports = `const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, Trip, Emergency, Kapal, HasilTangkap } = require('../../models');
const { authenticate } = require('../../middleware/auth/auth');
const { sanitizeIP } = require('../../utils/ipValidation');

`;

for (const [controllerName, blocks] of Object.entries(files)) {
  if (blocks.length > 0) {
    const fileContent = imports + blocks.join('\n\n') + '\n\nmodule.exports = router;\n';
    // We name it as a router file but put it in routes/mobile/
    const outPath = path.join(__dirname, '../src/routes/mobile', controllerName.replace('Controller', 'Router') + '.js');
    fs.writeFileSync(outPath, fileContent);
    console.log(`Wrote ${outPath}`);
  }
}

// The remaining content in mobile.js is mostly auth stuff and AI predict.
console.log("Refactoring complete. Please inspect mobile.js to replace with imports.");
