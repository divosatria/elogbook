const nodemailer = require('nodemailer');


const generateSuratTugasHTML = require('../../templates/email/suratTugasTemplate');
const generateTaskNotificationHTML = require('../../templates/email/taskNotificationTemplate');
const generateTripStatusHTML = require('../../templates/email/tripStatusTemplate');
const generateTripScheduleHTML = require('../../templates/email/tripScheduleTemplate');
const generatePasswordResetHTML = require('../../templates/email/passwordResetTemplate');
const generatePasswordResetConfirmationHTML = require('../../templates/email/passwordResetConfirmationTemplate');

class EmailService {
  constructor() {

  if (!process.env.BREVO_SMTP_LOGIN || !process.env.BREVO_SMTP_KEY) {
    console.error("❌ ENV BREVO BELUM DISET!");
  }

  this.transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 2525,
    secure: false, // STARTTLS untuk port non-SSL
    auth: {
      user: process.env.BREVO_SMTP_LOGIN.trim(),
      pass: process.env.BREVO_SMTP_KEY.trim()
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs jika diperlukan
    },
    connectionTimeout: 30000, // 30 detik timeout
    greetingTimeout: 15000
  });

  this.transporter.verify((error) => {
    if (error) {
      console.error("❌ BREVO SMTP ERROR:", {
        message: error.message,
        code: error.code,
        response: error.response
      });
    } else {
      console.log("✅ BREVO SMTP READY");
    }
  });
}

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  getBaseMailOptions(recipientEmail) {
    return {
      from: {
        name: "E-Logbook IPB",
        address: "noreply@elogbookipb.web.id"
      },

      replyTo: "admin@elogbookipb.web.id",

      headers: {
        "X-Mailer": "Elogbook System",
        "X-Priority": "1",
        "List-Unsubscribe": "<mailto:admin@elogbookipb.web.id>"
      },

      to: recipientEmail
    };
  }

  // Helper: Format tanggal Indonesia
  

  // Helper: Format tanggal singkat untuk nomor surat
  

  // Template Surat Tugas Perjalanan Laut - Format Kedinasan Formal
  

  async sendTripAssignmentEmail(recipientEmail, recipientName, tripData) {

    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const pdfService = require('./pdfService');
      const pdfResult = await pdfService.generateTripAssignmentPDF(tripData);

      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),

        subject: 'Surat Tugas Perjalanan Laut - E-Logbook Maritime',

        attachments: [{
          filename: pdfResult.fileName,
          path: pdfResult.filePath,
          contentType: 'application/pdf'
        }],

        html: generateSuratTugasHTML(recipientName, tripData)
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log("📨 RESULT BREVO:", result);

      return result;

    } catch (error) {
      console.error("❌ EMAIL ERROR DETAIL:", {
        message: error.message,
        response: error.response,
        code: error.code
      });

      throw error;
    }
  }

  // Template Notifikasi Tugas Operasional - Format Kedinasan
  

  // Send task notification email
  async sendTaskNotificationEmail(recipientEmail, recipientName, taskData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Penugasan Operasional Baru - E-Logbook Maritime',
        html: generateTaskNotificationHTML(recipientName, taskData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("📨 Task notification sent to:", recipientEmail);
      return result;

    } catch (error) {
      console.error("❌ Task notification email error:", error.message);
      throw error;
    }
  }

  // Template Status Trip - Format Kedinasan
  

  // Send trip status email
  async sendTripStatusEmail(recipientEmail, recipientName, statusData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Pemberitahuan Perubahan Status Trip - E-Logbook Maritime',
        html: generateTripStatusHTML(recipientName, statusData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("📨 Status email sent to:", recipientEmail);
      return result;

    } catch (error) {
      console.error("❌ Status email error:", error.message);
      throw error;
    }
  }

  // Template Jadwal Trip - Format Kedinasan
  

  // Send trip schedule notification email to nahkoda
  async sendTripScheduleEmail(recipientEmail, recipientName, scheduleData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Pemberitahuan Jadwal Trip Baru - E-Logbook Maritime',
        html: generateTripScheduleHTML(recipientName, scheduleData)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("📨 Schedule email sent to:", recipientEmail);
      return result;

    } catch (error) {
      console.error("❌ Schedule email error:", error.message);
      throw error;
    }
  }

  // =====================================================
  // PASSWORD RESET EMAIL TEMPLATES
  // =====================================================

  /**
   * Generate Password Reset Email HTML
   */
  

  /**
   * Generate Password Reset Confirmation Email HTML
   */
  

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(recipientEmail, recipientName, resetLink, expiryHours = 1) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: '🔐 Reset Password Akun E-Logbook Maritime',
        html: generatePasswordResetHTML(recipientName, resetLink, expiryHours)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("📨 Password reset email sent to:", recipientEmail);
      return result;

    } catch (error) {
      console.error("❌ Password reset email error:", error.message);
      throw error;
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(recipientEmail, recipientName) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: '✅ Konfirmasi Reset Password - E-Logbook Maritime',
        html: generatePasswordResetConfirmationHTML(recipientName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("📨 Password reset confirmation sent to:", recipientEmail);
      return result;

    } catch (error) {
      console.error("❌ Password reset confirmation error:", error.message);
      throw error;
    }
  }
}

module.exports = new EmailService();