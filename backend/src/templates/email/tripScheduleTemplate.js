const dateFormatter = require('../../utils/dateFormatter');

module.exports = function generateTripScheduleHTML(recipientName, scheduleData) {
    const nomorSurat = `JDW-${Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = dateFormatter.formatTanggalSurat(new Date());
    const namaKapal = scheduleData.vesselName || '-';
    const tanggalBerangkat = dateFormatter.formatTanggalIndonesia(scheduleData.scheduledDate);
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