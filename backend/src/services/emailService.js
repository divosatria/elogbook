const nodemailer = require('nodemailer');

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
  formatTanggalIndonesia(dateInput) {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  }

  // Helper: Format tanggal singkat untuk nomor surat
  formatTanggalSurat(dateInput) {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('id-ID', options);
  }

  // Template Surat Tugas Perjalanan Laut - Format Kedinasan Formal
  generateSuratTugasHTML(recipientName, tripData) {
    const nomorSurat = `ST-${tripData.tripId || Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());
    const namaKapal = tripData.vesselName || '-';
    const nomorRegistrasi = tripData.vesselRegistration || '-';
    const tanggalBerangkat = this.formatTanggalIndonesia(tripData.departureDate);
    const tanggalKembali = this.formatTanggalIndonesia(tripData.estimatedReturn);
    const wilayahPenangkapan = tripData.fishingArea || '-';
    const targetTangkapan = tripData.targetFish || '-';

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surat Tugas Perjalanan Laut</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #c9a227;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
                    <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #e0e0e0; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
                    <p style="margin: 0; font-size: 12px; color: #c9a227; font-style: italic;">Sistem E-Logbook Maritime</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.3); margin: 15px 50px 0 50px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY SURAT -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0; vertical-align: top;">Nomor</td>
                  <td width="15" style="padding: 3px 0; vertical-align: top;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; vertical-align: top;">Lampiran</td>
                  <td style="padding: 3px 0; vertical-align: top;">:</td>
                  <td style="padding: 3px 0;">1 (satu) berkas</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; vertical-align: top;">Perihal</td>
                  <td style="padding: 3px 0; vertical-align: top;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Surat Tugas Perjalanan Laut</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <!-- SALAM PEMBUKA -->
              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <!-- PARAGRAF PENGANTAR -->
              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Sehubungan dengan pelaksanaan kegiatan operasional penangkapan ikan dalam wilayah pengelolaan perikanan Negara Republik Indonesia, dengan ini kami memberitahukan bahwa Saudara telah ditugaskan untuk melaksanakan perjalanan laut dengan ketentuan sebagaimana tercantum di bawah ini.
              </p>

              <!-- TABEL RINCIAN PENUGASAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 25px 0; font-size: 13px; border: 2px solid #1e3a5f;">
                <tr style="background-color: #1e3a5f;">
                  <td colspan="2" style="padding: 12px 15px; color: #ffffff; font-weight: bold; font-size: 14px; text-align: center; letter-spacing: 1px;">
                    RINCIAN PENUGASAN
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; width: 40%; color: #374151;">Nama Kapal</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${namaKapal}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Nomor Registrasi</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${nomorRegistrasi}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Tanggal Keberangkatan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${tanggalBerangkat}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Estimasi Kepulangan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${tanggalKembali}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Wilayah Penangkapan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${wilayahPenangkapan}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; color: #374151;">Target Tangkapan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; color: #1f2937;">${targetTangkapan}</td>
                </tr>
              </table>

              <!-- PARAGRAF INSTRUKSI -->
              <p style="margin: 25px 0 15px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Berkenaan dengan penugasan tersebut di atas, Saudara diwajibkan untuk memenuhi ketentuan sebagai berikut:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; font-size: 14px;">
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">1.</td>
                  <td style="padding: 8px 0; text-align: justify;">Melengkapi seluruh dokumen kapal dan dokumen pribadi awak kapal sesuai dengan ketentuan perundang-undangan yang berlaku;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">2.</td>
                  <td style="padding: 8px 0; text-align: justify;">Mengunggah data perbekalan dan kesiapan operasional melalui aplikasi mobile E-Logbook sebelum keberangkatan;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">3.</td>
                  <td style="padding: 8px 0; text-align: justify;">Memastikan kondisi teknis kapal dalam keadaan laik laut dan memenuhi standar keselamatan pelayaran;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">4.</td>
                  <td style="padding: 8px 0; text-align: justify;">Mematuhi seluruh ketentuan zona penangkapan ikan dan peraturan perikanan yang berlaku;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">5.</td>
                  <td style="padding: 8px 0; text-align: justify;">Mencatat dan melaporkan hasil tangkapan secara berkala melalui sistem E-Logbook;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">6.</td>
                  <td style="padding: 8px 0; text-align: justify;">Menunggu persetujuan dari Administrator sebelum memulai perjalanan laut.</td>
                </tr>
              </table>

              <!-- PARAGRAF PENUTUP -->
              <p style="margin: 25px 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Demikian surat tugas ini disampaikan untuk dapat dilaksanakan dengan penuh tanggung jawab. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Kepala Unit Pelaksana Teknis</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">Administrator E-Logbook</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Sistem E-Logbook Maritime</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #1e3a5f;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0;">Direktorat Jenderal Perikanan Tangkap</p>
                    <hr style="border: none; border-top: 1px solid #d1d5db; margin: 12px 50px;">
                    <p style="margin: 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime.<br>
                      Mohon tidak membalas email ini. Untuk informasi lebih lanjut, silakan hubungi Administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

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

        html: this.generateSuratTugasHTML(recipientName, tripData)
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
  generateTaskNotificationHTML(recipientName, taskData) {
    const nomorSurat = `INF-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());
    const judulTugas = taskData.taskTitle || '-';
    const deskripsiTugas = taskData.taskDescription || 'Tidak ada deskripsi tambahan';
    const tanggalTugas = this.formatTanggalIndonesia(taskData.scheduledDate);
    const waktuTugas = taskData.scheduledTime || '-';
    const namaKapal = taskData.vesselName || '-';
    const prioritas = taskData.priority || 'normal';
    
    const prioritasLabel = {
      urgent: 'MENDESAK',
      high: 'TINGGI',
      medium: 'SEDANG',
      low: 'RENDAH',
      normal: 'NORMAL'
    }[prioritas] || 'NORMAL';

    const prioritasColor = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a',
      normal: '#2563eb'
    }[prioritas] || '#2563eb';

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notifikasi Tugas Operasional</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #166534 0%, #15803d 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #c9a227;">
              <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
              <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #e0e0e0; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
              <p style="margin: 0; font-size: 12px; color: #c9a227; font-style: italic;">Sistem E-Logbook Maritime</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0;">Nomor</td>
                  <td width="15" style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Perihal</td>
                  <td style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Penugasan Operasional</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Bersama ini kami sampaikan bahwa Saudara mendapatkan tugas operasional baru yang harus dilaksanakan sesuai dengan ketentuan yang berlaku.
              </p>

              <!-- TABEL TUGAS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 25px 0; font-size: 13px; border: 2px solid #166534;">
                <tr style="background-color: #166534;">
                  <td colspan="2" style="padding: 12px 15px; color: #ffffff; font-weight: bold; font-size: 14px; text-align: center;">
                    RINCIAN TUGAS OPERASIONAL
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; width: 35%;">Judul Tugas</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: bold;">${judulTugas}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Deskripsi</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${deskripsiTugas}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Tanggal Pelaksanaan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${tanggalTugas}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Waktu</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${waktuTugas}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Nama Kapal</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${namaKapal}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Prioritas</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">
                    <span style="background-color: ${prioritasColor}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 12px;">${prioritasLabel}</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Saudara diminta untuk segera mengakses aplikasi mobile E-Logbook guna melihat detail lengkap tugas dan menyelesaikan tugas tersebut sesuai dengan batas waktu yang ditentukan.
              </p>

              <p style="margin: 20px 0; font-size: 14px; text-align: justify;">
                Demikian pemberitahuan ini disampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Kepala Unit Pelaksana Teknis</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">Administrator E-Logbook</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Sistem E-Logbook Maritime</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #166534;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime. Mohon tidak membalas email ini.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  // Send task notification email
  async sendTaskNotificationEmail(recipientEmail, recipientName, taskData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Penugasan Operasional Baru - E-Logbook Maritime',
        html: this.generateTaskNotificationHTML(recipientName, taskData)
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
  generateTripStatusHTML(recipientName, statusData) {
    const nomorSurat = `INF-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());
    const namaTripValue = statusData.tripName || '-';
    const statusValue = statusData.status || 'menunggu_izin';
    const pesanValue = statusData.message || '';

    const statusLabels = {
      disetujui: { label: 'DISETUJUI', bgColor: '#166534', description: 'Trip Saudara telah disetujui. Silakan mempersiapkan keberangkatan dan memastikan seluruh dokumen serta perbekalan telah lengkap.' },
      ditolak: { label: 'DITOLAK', bgColor: '#dc2626', description: 'Trip Saudara ditolak. Silakan periksa kembali kelengkapan dokumen dan persyaratan yang diperlukan, kemudian ajukan kembali melalui aplikasi E-Logbook.' },
      sedang_melaut: { label: 'SEDANG MELAUT', bgColor: '#2563eb', description: 'Trip Saudara tercatat dalam status sedang melaut. Pastikan untuk melaporkan posisi dan hasil tangkapan secara berkala.' },
      selesai: { label: 'SELESAI', bgColor: '#7c3aed', description: 'Trip Saudara telah selesai. Terima kasih atas kerja sama Saudara dalam menggunakan sistem E-Logbook Maritime.' },
      menunggu_izin: { label: 'MENUNGGU PERSETUJUAN', bgColor: '#ca8a04', description: 'Trip Saudara sedang dalam proses verifikasi oleh Administrator. Mohon menunggu konfirmasi lebih lanjut.' },
      menunggu_dokumen: { label: 'MENUNGGU DOKUMEN', bgColor: '#ea580c', description: 'Dokumen trip Saudara belum lengkap. Silakan lengkapi dokumen yang diperlukan melalui aplikasi E-Logbook.' }
    };

    const statusInfo = statusLabels[statusValue] || { label: statusValue.toUpperCase().replace('_', ' '), bgColor: '#6b7280', description: '' };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pemberitahuan Status Trip</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #c9a227;">
              <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
              <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #e0e0e0; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
              <p style="margin: 0; font-size: 12px; color: #c9a227; font-style: italic;">Sistem E-Logbook Maritime</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0;">Nomor</td>
                  <td width="15" style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Perihal</td>
                  <td style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Pemberitahuan Perubahan Status Trip</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Bersama ini kami sampaikan bahwa status perjalanan laut Saudara telah diperbarui. Berikut adalah informasi terkini mengenai trip tersebut:
              </p>

              <!-- BOX STATUS -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: ${statusInfo.bgColor}; border-radius: 8px; padding: 25px 50px;">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 5px 0; font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Status Terkini</p>
                          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff; letter-spacing: 3px;">${statusInfo.label}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- TABEL INFO -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 25px 0; font-size: 13px; border: 1px solid #d1d5db;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; width: 35%;">Nama Trip</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${namaTripValue}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Tanggal Pembaruan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${tanggalSurat}</td>
                </tr>
              </table>

              ${pesanValue ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8fafc; border-left: 4px solid #2563eb;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; font-weight: bold;">CATATAN:</p>
                    <p style="margin: 0; font-size: 14px; color: #374151; font-style: italic;">"${pesanValue}"</p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                ${statusInfo.description}
              </p>

              <p style="margin: 20px 0; font-size: 14px; text-align: justify;">
                Demikian pemberitahuan ini disampaikan. Untuk informasi lebih lanjut, silakan akses aplikasi mobile E-Logbook atau hubungi Administrator sistem.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Kepala Unit Pelaksana Teknis</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">Administrator E-Logbook</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Sistem E-Logbook Maritime</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #1e3a5f;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime. Mohon tidak membalas email ini.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  // Send trip status email
  async sendTripStatusEmail(recipientEmail, recipientName, statusData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Pemberitahuan Perubahan Status Trip - E-Logbook Maritime',
        html: this.generateTripStatusHTML(recipientName, statusData)
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
  generateTripScheduleHTML(recipientName, scheduleData) {
    const nomorSurat = `JDW-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());
    const namaKapal = scheduleData.vesselName || '-';
    const tanggalBerangkat = this.formatTanggalIndonesia(scheduleData.scheduledDate);
    const waktuBerangkat = scheduleData.scheduledTime || 'Belum ditentukan';
    const judulTugas = scheduleData.taskTitle || '-';
    const deskripsiTugas = scheduleData.taskDescription || '-';
    const lokasiValue = scheduleData.locationNotes || '-';
    const prioritas = scheduleData.priority || 'normal';

    const prioritasLabel = {
      urgent: 'MENDESAK',
      high: 'TINGGI',
      medium: 'SEDANG',
      low: 'RENDAH',
      normal: 'NORMAL'
    }[prioritas] || 'NORMAL';

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pemberitahuan Jadwal Trip</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #b45309 0%, #d97706 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #1e3a5f;">
              <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
              <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #fef3c7; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
              <p style="margin: 0; font-size: 12px; color: #ffffff; font-style: italic;">Sistem E-Logbook Maritime</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0;">Nomor</td>
                  <td width="15" style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Perihal</td>
                  <td style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Pemberitahuan Jadwal Trip Baru</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Bersama ini kami sampaikan bahwa jadwal trip baru telah dibuat untuk kapal yang berada di bawah tanggung jawab Saudara. Berikut adalah rincian jadwal perjalanan laut:
              </p>

              <!-- TABEL JADWAL -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 25px 0; font-size: 13px; border: 2px solid #b45309;">
                <tr style="background-color: #b45309;">
                  <td colspan="2" style="padding: 12px 15px; color: #ffffff; font-weight: bold; font-size: 14px; text-align: center;">
                    JADWAL PERJALANAN LAUT
                  </td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; width: 35%;">Nama Kapal</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${namaKapal}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Tanggal Keberangkatan</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: bold;">${tanggalBerangkat}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Waktu</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${waktuBerangkat}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Tugas</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${judulTugas}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Deskripsi</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${deskripsiTugas}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Lokasi</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${lokasiValue}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Prioritas</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: bold;">${prioritasLabel}</td>
                </tr>
              </table>

              <!-- LANGKAH SELANJUTNYA -->
              <p style="margin: 25px 0 15px 0; font-size: 14px; font-weight: bold;">Langkah Selanjutnya:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; font-size: 14px;">
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">1.</td>
                  <td style="padding: 8px 0;">Akses aplikasi mobile E-Logbook untuk melihat detail jadwal;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">2.</td>
                  <td style="padding: 8px 0;">Periksa jadwal trip pada menu "Jadwal Trip";</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">3.</td>
                  <td style="padding: 8px 0;">Siapkan dokumen dan persiapan keberangkatan;</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 8px 0; vertical-align: top; font-weight: bold;">4.</td>
                  <td style="padding: 8px 0;">Unggah dokumen yang diperlukan sebelum tanggal keberangkatan.</td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; text-align: justify;">
                Demikian pemberitahuan ini disampaikan. Atas perhatian dan kerja sama Saudara, kami ucapkan terima kasih.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Kepala Unit Pelaksana Teknis</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">Administrator E-Logbook</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Sistem E-Logbook Maritime</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #b45309;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime. Mohon tidak membalas email ini.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  // Send trip schedule notification email to nahkoda
  async sendTripScheduleEmail(recipientEmail, recipientName, scheduleData) {
    if (!this.validateEmail(recipientEmail)) {
      throw new Error(`Invalid email format: ${recipientEmail}`);
    }

    try {
      const mailOptions = {
        ...this.getBaseMailOptions(recipientEmail),
        subject: 'Pemberitahuan Jadwal Trip Baru - E-Logbook Maritime',
        html: this.generateTripScheduleHTML(recipientName, scheduleData)
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
  generatePasswordResetHTML(recipientName, resetLink, expiryHours) {
    const nomorSurat = `RST-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - E-Logbook Maritime</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #fbbf24;">
              <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
              <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #fef3c7; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
              <p style="margin: 0; font-size: 12px; color: #fbbf24; font-style: italic;">Sistem E-Logbook Maritime</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0;">Nomor</td>
                  <td width="15" style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Perihal</td>
                  <td style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Permintaan Reset Password</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <!-- PESAN UTAMA -->
              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Kami menerima permintaan untuk mereset password akun E-Logbook Maritime Saudara. Jika Saudara yang melakukan permintaan ini, silakan klik tombol di bawah untuk membuat password baru.
              </p>

              <!-- WARNING BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #92400e; font-weight: bold;">⚠️ PENTING:</p>
                    <p style="margin: 0; font-size: 13px; color: #78350f;">Link reset password ini hanya berlaku selama <strong>${expiryHours} jam</strong> dan hanya dapat digunakan satu kali.</p>
                  </td>
                </tr>
              </table>

              <!-- BUTTON RESET PASSWORD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                      🔐 RESET PASSWORD
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ALTERNATIVE LINK -->
              <p style="margin: 25px 0 20px 0; font-size: 12px; color: #6b7280; text-align: center;">
                Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:
              </p>
              <p style="margin: 0 0 25px 0; font-size: 11px; color: #2563eb; word-break: break-all; text-align: center; background-color: #f3f4f6; padding: 12px; border-radius: 6px; border: 1px solid #d1d5db;">
                ${resetLink}
              </p>

              <!-- SECURITY NOTICE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #fee2e2; border-left: 4px solid #dc2626;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #991b1b; font-weight: bold;">🔒 Keamanan Akun Anda</p>
                    <p style="margin: 0; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
                      Jika Saudara <strong>TIDAK</strong> melakukan permintaan reset password ini, harap abaikan email ini dan segera hubungi Administrator. Akun Saudara tetap aman dan tidak ada perubahan yang dilakukan.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Demikian pemberitahuan ini disampaikan. Untuk bantuan lebih lanjut, silakan hubungi Administrator sistem E-Logbook Maritime.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Sistem Keamanan</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">E-Logbook Maritime</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Automated Security System</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #dc2626;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime.<br>
                      Mohon tidak membalas email ini. Untuk bantuan, hubungi Administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate Password Reset Confirmation Email HTML
   */
  generatePasswordResetConfirmationHTML(recipientName) {
    const nomorSurat = `CNF-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = this.formatTanggalSurat(new Date());
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konfirmasi Reset Password - E-Logbook Maritime</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Times New Roman', Times, serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- KOP SURAT -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 25px 30px; text-align: center; border-bottom: 5px solid #fbbf24;">
              <p style="margin: 0; font-size: 11px; color: #ffffff; letter-spacing: 3px; text-transform: uppercase;">Republik Indonesia</p>
              <h1 style="margin: 8px 0 5px 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 2px;">KEMENTERIAN KELAUTAN DAN PERIKANAN</h1>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #dcfce7; font-weight: 600;">DIREKTORAT JENDERAL PERIKANAN TANGKAP</p>
              <p style="margin: 0; font-size: 12px; color: #fbbf24; font-style: italic;">Sistem E-Logbook Maritime</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 35px 40px; line-height: 1.8; color: #1f2937; font-size: 14px;">
              
              <!-- NOMOR SURAT -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; font-size: 13px;">
                <tr>
                  <td width="100" style="padding: 3px 0;">Nomor</td>
                  <td width="15" style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">${nomorSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Perihal</td>
                  <td style="padding: 3px 0;">:</td>
                  <td style="padding: 3px 0; font-weight: bold;">Konfirmasi Perubahan Password</td>
                </tr>
              </table>

              <!-- KEPADA -->
              <p style="margin: 0 0 25px 0; font-size: 14px;">
                Kepada Yth.<br>
                <strong style="font-size: 15px;">${recipientName}</strong><br>
                di Tempat
              </p>

              <p style="margin: 0 0 20px 0; font-size: 14px;">Dengan hormat,</p>

              <!-- SUCCESS BOX -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background-color: #16a34a; border-radius: 8px; padding: 25px 50px;">
                      <tr>
                        <td align="center">
                          <p style="margin: 0 0 10px 0; font-size: 40px;">✅</p>
                          <p style="margin: 0 0 5px 0; font-size: 11px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 2px;">Password Berhasil Direset</p>
                          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">PERUBAHAN BERHASIL</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PESAN UTAMA -->
              <p style="margin: 0 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Bersama ini kami informasikan bahwa password akun E-Logbook Maritime Saudara telah berhasil direset pada:
              </p>

              <!-- INFO TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 25px 0; font-size: 13px; border: 1px solid #d1d5db;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600; width: 35%;">Tanggal</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${tanggalSurat}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db; font-weight: 600;">Waktu</td>
                  <td style="padding: 12px 15px; border: 1px solid #d1d5db;">${waktu} WIB</td>
                </tr>
              </table>

              <p style="margin: 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Saudara sekarang dapat login ke sistem E-Logbook Maritime menggunakan password baru yang telah dibuat.
              </p>

              <!-- SECURITY NOTICE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background-color: #fee2e2; border-left: 4px solid #dc2626;">
                <tr>
                  <td style="padding: 15px 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #991b1b; font-weight: bold;">🔒 Keamanan Akun</p>
                    <p style="margin: 0; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
                      Jika Saudara <strong>TIDAK</strong> melakukan perubahan password ini, segera hubungi Administrator untuk mengamankan akun Saudara.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- TIPS KEAMANAN -->
              <p style="margin: 25px 0 10px 0; font-size: 14px; font-weight: bold;">Tips Keamanan Password:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; font-size: 13px;">
                <tr>
                  <td width="25" style="padding: 5px 0; vertical-align: top;">•</td>
                  <td style="padding: 5px 0;">Jangan bagikan password Anda kepada siapapun</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 5px 0; vertical-align: top;">•</td>
                  <td style="padding: 5px 0;">Gunakan password yang unik dan berbeda untuk setiap akun</td>
                </tr>
                <tr>
                  <td width="25" style="padding: 5px 0; vertical-align: top;">•</td>
                  <td style="padding: 5px 0;">Ubah password secara berkala untuk keamanan maksimal</td>
                </tr>
              </table>

              <p style="margin: 25px 0 20px 0; font-size: 14px; text-align: justify; line-height: 1.9;">
                Demikian pemberitahuan ini disampaikan. Terima kasih atas perhatian Saudara terhadap keamanan akun.
              </p>

              <!-- TANDA TANGAN -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 35px;">
                <tr>
                  <td width="50%"></td>
                  <td width="50%" style="text-align: center; font-size: 14px;">
                    <p style="margin: 0 0 5px 0;">Jakarta, ${tanggalSurat}</p>
                    <p style="margin: 0 0 60px 0; font-weight: bold;">Sistem Keamanan</p>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">E-Logbook Maritime</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Automated Security System</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 20px 30px; border-top: 3px solid #16a34a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="font-size: 11px; color: #6b7280; line-height: 1.6;">
                    <p style="margin: 0; font-weight: bold;">Kementerian Kelautan dan Perikanan Republik Indonesia</p>
                    <p style="margin: 5px 0 0 0; font-style: italic; font-size: 10px; color: #9ca3af;">
                      Email ini dikirim secara otomatis oleh Sistem E-Logbook Maritime.<br>
                      Mohon tidak membalas email ini.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

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
        html: this.generatePasswordResetHTML(recipientName, resetLink, expiryHours)
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
        html: this.generatePasswordResetConfirmationHTML(recipientName)
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