const dateFormatter = require('../../utils/dateFormatter');

module.exports = function generateSuratTugasHTML(recipientName, tripData) {
    const nomorSurat = `ST-${tripData.tripId || Date.now()}/${new Date().getFullYear()}`;
    const tanggalSurat = dateFormatter.formatTanggalSurat(new Date());
    const namaKapal = tripData.vesselName || '-';
    const nomorRegistrasi = tripData.vesselRegistration || '-';
    const tanggalBerangkat = dateFormatter.formatTanggalIndonesia(tripData.departureDate);
    const tanggalKembali = dateFormatter.formatTanggalIndonesia(tripData.estimatedReturn);
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