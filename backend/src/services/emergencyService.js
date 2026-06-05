const twilio = require('twilio');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Kapal = require('../models/Kapal');
const { emitSocketEvent } = require('./socketService');

class EmergencyService {
  constructor() {
    // Initialize Twilio client
    this.twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
      ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      : null;
    
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  }

  async sendEmergencyAlert(emergencyData) {
    try {
      const { tripId, userId, location, message, emergencyType = 'SOS' } = emergencyData;

      // Get trip and nahkoda information
      const trip = await Trip.findByPk(tripId, {
        include: [
          {
            model: User,
            as: 'nahkoda',
            attributes: ['id', 'nama', 'noTelepon', 'username']
          },
          {
            model: Kapal,
            as: 'kapal',
            attributes: ['namaKapal', 'nomorRegistrasi']
          }
        ]
      });

      if (!trip) {
        throw new Error('Trip tidak ditemukan');
      }

      // Get user who sent the alert
      const alertUser = await User.findByPk(userId, {
        attributes: ['nama', 'username', 'role']
      });

      // Prepare emergency message
      const emergencyMessage = this.formatEmergencyMessage({
        emergencyType,
        alertUser,
        trip,
        location,
        message,
        timestamp: new Date()
      });

      const results = {
        socketNotification: false,
        smsNotification: false,
        whatsappNotification: false,
        errors: []
      };

      // 1. Send real-time notification via Socket.IO
      try {
        emitSocketEvent('emergency_alert', {
          tripId,
          userId,
          nahkodaId: trip.nahkodaId,
          emergencyType,
          location,
          message,
          alertUser: alertUser.nama,
          vesselName: trip.kapal?.namaKapal,
          timestamp: new Date().toISOString()
        });
        results.socketNotification = true;
        console.log('🚨 Emergency alert sent via Socket.IO');
      } catch (error) {
        results.errors.push(`Socket notification failed: ${error.message}`);
      }

      // 2. Send SMS to nahkoda
      if (trip.nahkoda?.noTelepon && this.twilioClient) {
        try {
          await this.sendSMS(trip.nahkoda.noTelepon, emergencyMessage);
          results.smsNotification = true;
          console.log(`📱 Emergency SMS sent to nahkoda: ${trip.nahkoda.nama}`);
        } catch (error) {
          results.errors.push(`SMS failed: ${error.message}`);
          console.error('❌ SMS Error:', error);
        }
      }

      // 3. Send WhatsApp to nahkoda (if available)
      if (trip.nahkoda?.noTelepon && this.whatsappNumber && this.twilioClient) {
        try {
          await this.sendWhatsApp(trip.nahkoda.noTelepon, emergencyMessage);
          results.whatsappNotification = true;
          console.log(`💬 Emergency WhatsApp sent to nahkoda: ${trip.nahkoda.nama}`);
        } catch (error) {
          results.errors.push(`WhatsApp failed: ${error.message}`);
          console.error('❌ WhatsApp Error:', error);
        }
      }

      // Log emergency alert
      console.log('🚨 EMERGENCY ALERT PROCESSED:', {
        tripId,
        nahkoda: trip.nahkoda?.nama,
        phone: trip.nahkoda?.noTelepon,
        vessel: trip.kapal?.namaKapal,
        alertBy: alertUser?.nama,
        location: location ? `${location.lat}, ${location.lng}` : 'Unknown',
        results
      });

      return results;
    } catch (error) {
      console.error('❌ Emergency Service Error:', error);
      throw error;
    }
  }

  async sendSMS(phoneNumber, message) {
    if (!this.twilioClient || !this.twilioPhoneNumber) {
      throw new Error('Twilio SMS not configured');
    }

    // Format phone number for Indonesia
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const result = await this.twilioClient.messages.create({
      body: message,
      from: this.twilioPhoneNumber,
      to: formattedPhone
    });

    return result;
  }

  async sendWhatsApp(phoneNumber, message) {
    if (!this.twilioClient || !this.whatsappNumber) {
      throw new Error('Twilio WhatsApp not configured');
    }

    // Format phone number for WhatsApp
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const result = await this.twilioClient.messages.create({
      body: message,
      from: `whatsapp:${this.whatsappNumber}`,
      to: `whatsapp:${formattedPhone}`
    });

    return result;
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Indonesian phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    
    return '+' + cleaned;
  }

  formatEmergencyMessage({ emergencyType, alertUser, trip, location, message, timestamp }) {
    const locationText = location 
      ? `Lokasi: ${location.lat}, ${location.lng}` 
      : 'Lokasi: Tidak diketahui';

    return `🚨 DARURAT ${emergencyType}

Kapal: ${trip.kapal?.namaKapal || 'Unknown'}
Pelapor: ${alertUser?.nama || 'Unknown'} (${alertUser?.role || 'Unknown'})
${locationText}
Waktu: ${timestamp.toLocaleString('id-ID')}

Pesan: ${message || 'Tidak ada pesan tambahan'}

Segera hubungi kapal dan lakukan tindakan darurat yang diperlukan.

E-Logbook Maritime System`;
  }

  // Method to test emergency notification
  async testEmergencyNotification(nahkodaPhone, testMessage = 'Test emergency notification') {
    try {
      const results = {
        sms: false,
        whatsapp: false,
        errors: []
      };

      if (this.twilioClient && nahkodaPhone) {
        try {
          await this.sendSMS(nahkodaPhone, `🧪 TEST: ${testMessage}`);
          results.sms = true;
        } catch (error) {
          results.errors.push(`SMS test failed: ${error.message}`);
        }

        try {
          await this.sendWhatsApp(nahkodaPhone, `🧪 TEST: ${testMessage}`);
          results.whatsapp = true;
        } catch (error) {
          results.errors.push(`WhatsApp test failed: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Test Emergency Error:', error);
      throw error;
    }
  }
}

module.exports = new EmergencyService();