const dateFormatter = require('../../utils/dateFormatter');

module.exports = function generateTripStatusHTML(recipientName, statusData) {
    const nomorSurat = `INF-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = dateFormatter.formatTanggalSurat(new Date());
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