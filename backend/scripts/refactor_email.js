const fs = require('fs');
const path = require('path');

const emailServicePath = path.join(__dirname, '../src/services/core/emailService.js');
const templateDir = path.join(__dirname, '../src/templates/email');
const utilsDir = path.join(__dirname, '../src/utils');

if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });
if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir, { recursive: true });

// 1. Create dateFormatter.js
const dateFormatterContent = `
exports.formatTanggalIndonesia = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
};

exports.formatTanggalSurat = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('id-ID', options);
};
`;
fs.writeFileSync(path.join(utilsDir, 'dateFormatter.js'), dateFormatterContent.trim());

let content = fs.readFileSync(emailServicePath, 'utf8');

// 2. Remove the methods from EmailService class
content = content.replace(/formatTanggalIndonesia\s*\([^\)]*\)\s*\{[\s\S]*?\n  \}/g, '');
content = content.replace(/formatTanggalSurat\s*\([^\)]*\)\s*\{[\s\S]*?\n  \}/g, '');

const extractTemplate = (methodName, params, fileName) => {
  // Regex needs to be robust for block extraction. 
  // It's better to find the index of methodName and then count braces.
  const startIndex = content.indexOf(`${methodName}(${params}) {`);
  if (startIndex === -1) {
    console.log(`Could not find ${methodName}`);
    return;
  }
  
  let braceCount = 0;
  let endIndex = -1;
  let inString = false;
  let stringChar = '';

  for (let i = startIndex + methodName.length; i < content.length; i++) {
    const char = content[i];
    
    // Simple string toggle
    if ((char === "'" || char === '"' || char === '\`') && content[i-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex !== -1) {
    let methodBody = content.substring(startIndex, endIndex + 1);
    
    // Replace `this.format` with `dateFormatter.format`
    let newMethodBody = methodBody.replace(/this\.formatTanggal/g, 'dateFormatter.formatTanggal');
    
    const newContent = `
const dateFormatter = require('../../utils/dateFormatter');

module.exports = function ${newMethodBody.replace(`${methodName}(${params}) {`, `${methodName}(${params}) {`)}
`;
    fs.writeFileSync(path.join(templateDir, fileName), newContent.trim());
    console.log(`Extracted ${methodName} to ${fileName}`);
    
    // Remove from main content
    content = content.substring(0, startIndex) + content.substring(endIndex + 1);
  }
};

extractTemplate('generateSuratTugasHTML', 'recipientName, tripData', 'suratTugasTemplate.js');
extractTemplate('generateTaskNotificationHTML', 'recipientName, taskData', 'taskNotificationTemplate.js');
extractTemplate('generateTripStatusHTML', 'recipientName, statusData', 'tripStatusTemplate.js');
extractTemplate('generateTripScheduleHTML', 'recipientName, scheduleData', 'tripScheduleTemplate.js');
extractTemplate('generatePasswordResetHTML', 'recipientName, resetLink, expiryHours', 'passwordResetTemplate.js');
extractTemplate('generatePasswordResetConfirmationHTML', 'recipientName', 'passwordResetConfirmationTemplate.js');

// 3. Inject requires
const requires = `
const generateSuratTugasHTML = require('../../templates/email/suratTugasTemplate');
const generateTaskNotificationHTML = require('../../templates/email/taskNotificationTemplate');
const generateTripStatusHTML = require('../../templates/email/tripStatusTemplate');
const generateTripScheduleHTML = require('../../templates/email/tripScheduleTemplate');
const generatePasswordResetHTML = require('../../templates/email/passwordResetTemplate');
const generatePasswordResetConfirmationHTML = require('../../templates/email/passwordResetConfirmationTemplate');
`;

content = content.replace('class EmailService {', requires + '\nclass EmailService {');

// 4. Update the calls in emailService.js
content = content.replace(/this\.generateSuratTugasHTML/g, 'generateSuratTugasHTML');
content = content.replace(/this\.generateTaskNotificationHTML/g, 'generateTaskNotificationHTML');
content = content.replace(/this\.generateTripStatusHTML/g, 'generateTripStatusHTML');
content = content.replace(/this\.generateTripScheduleHTML/g, 'generateTripScheduleHTML');
content = content.replace(/this\.generatePasswordResetHTML/g, 'generatePasswordResetHTML');
content = content.replace(/this\.generatePasswordResetConfirmationHTML/g, 'generatePasswordResetConfirmationHTML');

fs.writeFileSync(emailServicePath, content);
console.log('Done refactoring emailService.js');
