const { EmailSetting } = require('../../models');
const nodemailer = require('nodemailer');

const emailSettingController = {
  // Get current email settings
  async getSettings(req, res) {
    try {
      const settings = await EmailSetting.findOne({
        where: { isActive: true },
        attributes: { exclude: ['emailPass'] } // Don't expose password
      });

      if (!settings) {
        return res.json({
          success: true,
          data: null,
          message: 'No email settings configured'
        });
      }

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching email settings',
        error: error.message
      });
    }
  },

  // Update email settings
  async updateSettings(req, res) {
    try {
      const {
        smtpHost,
        smtpPort,
        smtpSecure,
        emailUser,
        emailPass,
        fromName,
        fromAddress,
        testEmail
      } = req.body;

      // Validation
      if (!emailUser || !fromAddress) {
        return res.status(400).json({
          success: false,
          message: 'Email user and from address are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailUser) || !emailRegex.test(fromAddress)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Deactivate current settings
      await EmailSetting.update(
        { isActive: false },
        { where: { isActive: true } }
      );

      // Create new settings
      const newSettings = await EmailSetting.create({
        smtpHost: smtpHost || 'smtp.gmail.com',
        smtpPort: parseInt(smtpPort) || 587,
        smtpSecure: Boolean(smtpSecure),
        emailUser,
        emailPass: emailPass || '', // Will be encrypted in production
        fromName: fromName || 'E-Logbook Maritime System',
        fromAddress,
        testEmail,
        isActive: true
      });

      // Return without password
      const responseData = { ...newSettings.toJSON() };
      delete responseData.emailPass;

      res.json({
        success: true,
        data: responseData,
        message: 'Email settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating email settings:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating email settings',
        error: error.message
      });
    }
  },

  // Test email configuration
  async testEmail(req, res) {
    try {
      const { testEmailAddress } = req.body;

      if (!testEmailAddress) {
        return res.status(400).json({
          success: false,
          message: 'Test email address is required'
        });
      }

      // Get current settings
      const settings = await EmailSetting.findOne({
        where: { isActive: true }
      });

      if (!settings) {
        return res.status(400).json({
          success: false,
          message: 'No email settings configured'
        });
      }

      // Create transporter with current settings
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        auth: {
          user: settings.emailUser,
          pass: settings.emailPass
        }
      });

      // Send test email
      const mailOptions = {
        from: `"${settings.fromName}" <${settings.fromAddress}>`,
        to: testEmailAddress,
        subject: '📧 Test Email - E-Logbook Maritime System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🚢 E-Logbook Maritime System</h2>
            <p>Ini adalah email test untuk memverifikasi konfigurasi email sistem.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>📋 Informasi Konfigurasi:</h3>
              <ul>
                <li><strong>SMTP Host:</strong> ${settings.smtpHost}</li>
                <li><strong>SMTP Port:</strong> ${settings.smtpPort}</li>
                <li><strong>From Name:</strong> ${settings.fromName}</li>
                <li><strong>From Address:</strong> ${settings.fromAddress}</li>
                <li><strong>Test Time:</strong> ${new Date().toLocaleString('id-ID')}</li>
              </ul>
            </div>
            <p style="color: #10b981;">✅ Jika Anda menerima email ini, konfigurasi email berhasil!</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Email ini dikirim secara otomatis oleh sistem E-Logbook Maritime.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: `Test email sent successfully to ${testEmailAddress}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message,
        details: error.code || 'Unknown error'
      });
    }
  },

  // Get email templates (for future use)
  async getTemplates(req, res) {
    try {
      const templates = [
        {
          id: 'trip_assignment',
          name: 'Trip Assignment',
          description: 'Email untuk notifikasi penugasan trip',
          subject: '🚢 Penugasan Trip Baru - {{vesselName}}',
          variables: ['vesselName', 'departureDate', 'fishingArea', 'targetFish']
        },
        {
          id: 'emergency_alert',
          name: 'Emergency Alert',
          description: 'Email untuk alert darurat',
          subject: '🚨 ALERT DARURAT - {{vesselName}}',
          variables: ['vesselName', 'alertType', 'location', 'timestamp']
        },
        {
          id: 'trip_completion',
          name: 'Trip Completion',
          description: 'Email untuk notifikasi selesai trip',
          subject: '✅ Trip Selesai - {{vesselName}}',
          variables: ['vesselName', 'completionDate', 'totalCatch', 'duration']
        }
      ];

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching email templates',
        error: error.message
      });
    }
  }
};

module.exports = emailSettingController;