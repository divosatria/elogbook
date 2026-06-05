const dateFormatter = require('../../utils/dateFormatter');

module.exports = function generatePasswordResetConfirmationHTML(recipientName) {
    const nomorSurat = `CNF-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = dateFormatter.formatTanggalSurat(new Date());
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