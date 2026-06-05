const dateFormatter = require('../../utils/dateFormatter');

module.exports = function generatePasswordResetHTML(recipientName, resetLink, expiryHours) {
    const nomorSurat = `RST-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = dateFormatter.formatTanggalSurat(new Date());

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