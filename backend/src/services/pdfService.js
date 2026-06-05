const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    // Ensure uploads directory exists
    this.uploadsDir = path.join(__dirname, '../../uploads/surat-tugas');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Generate trip assignment letter PDF - Format Surat Tugas Resmi
  async generateTripAssignmentPDF(tripData) {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      const fileName = `surat-tugas-${tripData.tripId}-${Date.now()}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);
      
      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filePath));

      // ==================== KOP SURAT DENGAN LOGO ====================
      
      // Logo Kementerian (kiri) - mencoba beberapa path
      const possibleLeftLogoPaths = [
        path.join(__dirname, '../../assets/logokementrian.png'),
        path.join(process.cwd(), 'assets/logokementrian.png'),
        path.join(process.cwd(), 'backend/assets/logokementrian.png')
      ];
      
      let leftLogoPath = null;
      for (const p of possibleLeftLogoPaths) {
        if (fs.existsSync(p)) {
          leftLogoPath = p;
          break;
        }
      }
      
      if (leftLogoPath) {
        console.log('Logo Kementerian ditemukan:', leftLogoPath);
        doc.image(leftLogoPath, 50, 35, { fit: [65, 65] });
      } else {
        console.log('Logo Kementerian TIDAK ditemukan. Paths yang dicoba:', possibleLeftLogoPaths);
      }

      // Logo IPB (kanan) - mencoba beberapa path
      const possibleRightLogoPaths = [
        path.join(__dirname, '../../assets/logoipb.png'),
        path.join(process.cwd(), 'assets/logoipb.png'),
        path.join(process.cwd(), 'backend/assets/logoipb.png')
      ];
      
      let rightLogoPath = null;
      for (const p of possibleRightLogoPaths) {
        if (fs.existsSync(p)) {
          rightLogoPath = p;
          break;
        }
      }
      
      if (rightLogoPath) {
        console.log('Logo IPB ditemukan:', rightLogoPath);
        doc.image(rightLogoPath, 480, 35, { fit: [65, 65] });
      } else {
        console.log('Logo IPB TIDAK ditemukan. Paths yang dicoba:', possibleRightLogoPaths);
      }

      // Header Instansi (tengah)
      doc.fontSize(11).font('Helvetica-Bold')
         .text('KEMENTERIAN KELAUTAN DAN PERIKANAN', 120, 40, { width: 355, align: 'center' })
         .fontSize(12)
         .text('DIREKTORAT JENDERAL PERIKANAN TANGKAP', 120, 55, { width: 355, align: 'center' })
         .fontSize(10).font('Helvetica')
         .text('UNIT PELAKSANA TEKNIS E-LOGBOOK MARITIME', 120, 70, { width: 355, align: 'center' })
         .fontSize(8)
         .text('Jl. Medan Merdeka Timur No. 16, Jakarta Pusat 10110', 120, 85, { width: 355, align: 'center' })
         .text('Telp: (021) 3519070 | Email: kkp@kkp.go.id', 120, 95, { width: 355, align: 'center' });

      // Garis horizontal ganda
      doc.moveTo(50, 115).lineTo(545, 115).lineWidth(2).stroke();
      doc.moveTo(50, 118).lineTo(545, 118).lineWidth(0.5).stroke();

      // ==================== JUDUL SURAT ====================
      
      doc.fontSize(14).font('Helvetica-Bold')
         .text('SURAT TUGAS', 0, 140, { align: 'center' })
         .fontSize(11).font('Helvetica')
         .text(`Nomor: ST-${tripData.tripId}/${this.getRomanMonth(new Date().getMonth())}/${new Date().getFullYear()}`, 0, 158, { align: 'center' });

      // ==================== KONSIDERAN ====================
      
      let yPos = 190;
      
      doc.fontSize(11).font('Helvetica')
         .text('Yang bertanda tangan di bawah ini:', 50, yPos);
      
      yPos += 25;
      
      // Info Pejabat
      const pejabatInfo = [
        ['Nama', 'Kepala Unit Pelaksana Teknis'],
        ['Jabatan', 'Administrator E-Logbook Maritime'],
        ['Instansi', 'Direktorat Jenderal Perikanan Tangkap']
      ];

      pejabatInfo.forEach(([label, value]) => {
        doc.font('Helvetica').text(label, 70, yPos, { width: 80 });
        doc.text(':', 150, yPos);
        doc.text(value, 165, yPos);
        yPos += 15;
      });

      yPos += 10;
      doc.text('dengan ini memberikan tugas kepada:', 50, yPos);
      
      yPos += 25;

      // ==================== IDENTITAS NAHKODA ====================
      
      const nahkodaInfo = [
        ['Nama', tripData.nahkoda?.nama || '-'],
        ['Jabatan', 'Nahkoda'],
        ['Nama Kapal', tripData.vesselName],
        ['No. Registrasi', tripData.vesselRegistration || '-']
      ];

      nahkodaInfo.forEach(([label, value]) => {
        doc.font('Helvetica').text(label, 70, yPos, { width: 80 });
        doc.text(':', 150, yPos);
        doc.font('Helvetica-Bold').text(value, 165, yPos);
        yPos += 15;
      });

      yPos += 10;

      // ==================== DAFTAR ABK (JIKA ADA) ====================
      
      if (tripData.abkList && tripData.abkList.length > 0) {
        doc.font('Helvetica').text('beserta Anak Buah Kapal (ABK) sebagai berikut:', 50, yPos);
        yPos += 20;

        // Header tabel
        const tableStartX = 70;
        const colWidths = [30, 200, 150];
        
        doc.rect(tableStartX, yPos, 380, 20).fillAndStroke('#e5e7eb', '#374151');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
        doc.text('No.', tableStartX + 5, yPos + 6, { width: 25, align: 'center' });
        doc.text('Nama', tableStartX + 35, yPos + 6, { width: 195, align: 'left' });
        doc.text('Telepon', tableStartX + 235, yPos + 6, { width: 145, align: 'left' });
        
        yPos += 20;

        // Data ABK
        doc.font('Helvetica').fontSize(10);
        tripData.abkList.forEach((abk, index) => {
          const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
          doc.rect(tableStartX, yPos, 380, 18).fillAndStroke(rowColor, '#d1d5db');
          doc.fillColor('#000000');
          doc.text((index + 1).toString(), tableStartX + 5, yPos + 5, { width: 25, align: 'center' });
          doc.text(abk.nama || '-', tableStartX + 35, yPos + 5, { width: 195, align: 'left' });
          doc.text(abk.noTelepon || '-', tableStartX + 235, yPos + 5, { width: 145, align: 'left' });
          yPos += 18;
        });
        
        yPos += 15;
      }

      // ==================== TUGAS YANG DIBERIKAN ====================
      
      doc.font('Helvetica').fontSize(11)
         .text('untuk melaksanakan tugas sebagai berikut:', 50, yPos);
      
      yPos += 20;

      const tugasItems = [
        `Melaksanakan perjalanan laut dengan Kapal ${tripData.vesselName}`,
        `Berangkat pada tanggal ${new Date(tripData.departureDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        `Estimasi kembali tanggal ${new Date(tripData.estimatedReturn).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        `Wilayah penangkapan: ${tripData.fishingArea || 'Sesuai zonasi yang berlaku'}`,
        tripData.targetFish ? `Target tangkapan: ${tripData.targetFish}` : null,
        'Mematuhi seluruh ketentuan keselamatan pelayaran',
        'Melaporkan posisi kapal secara berkala melalui aplikasi E-Logbook',
        'Mengisi logbook hasil tangkapan dengan benar dan lengkap'
      ].filter(Boolean);

      tugasItems.forEach((item, index) => {
        doc.text(`${index + 1}. ${item}`, 70, yPos, { width: 450 });
        yPos += 18;
      });

      yPos += 15;

      // ==================== PENUTUP ====================
      
      doc.text('Demikian Surat Tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', 50, yPos, {
        width: 495,
        align: 'justify'
      });

      // ==================== TANDA TANGAN ====================
      
      yPos += 40;
      const today = new Date();
      const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      doc.fontSize(11)
         .text(`Jakarta, ${dateStr}`, 350, yPos, { width: 180, align: 'left' });
      
      yPos += 15;
      doc.font('Helvetica-Bold')
         .text('Kepala Unit Pelaksana Teknis', 350, yPos, { width: 180, align: 'left' });

      // Placeholder tanda tangan
      yPos += 20;
      const signaturePath = path.join(__dirname, '../../assets/signature.png');
      if (fs.existsSync(signaturePath)) {
        doc.image(signaturePath, 370, yPos, { fit: [100, 50] });
      }

      // Placeholder stempel
      const stempelPath = path.join(__dirname, '../../assets/stempel.png');
      if (fs.existsSync(stempelPath)) {
        doc.image(stempelPath, 320, yPos - 10, { fit: [80, 80], opacity: 0.7 });
      }

      yPos += 55;
      doc.font('Helvetica-Bold')
         .text('_______________________', 350, yPos, { width: 180, align: 'left' });
      
      yPos += 15;
      doc.font('Helvetica').fontSize(9)
         .text('NIP. ........................', 350, yPos, { width: 180, align: 'left' });

      // ==================== FOOTER ====================
      
      doc.fontSize(8).font('Helvetica')
         .fillColor('#666666')
         .text('Dokumen ini dicetak secara otomatis oleh Sistem E-Logbook Maritime', 50, doc.page.height - 50, { 
           align: 'center',
           width: 495
         })
         .text('Surat Tugas ini sah tanpa tanda tangan basah', 50, doc.page.height - 40, {
           align: 'center',
           width: 495
         });

      // Finalize PDF
      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve) => {
        doc.on('end', resolve);
      });

      console.log('PDF surat tugas berhasil dibuat:', fileName);
      return {
        fileName,
        filePath,
        fileUrl: `/uploads/surat-tugas/${fileName}`
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  // Helper function untuk mengkonversi bulan ke Romawi
  getRomanMonth(month) {
    const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    return romans[month];
  }

  // Clean up old PDF files (older than 7 days)
  async cleanupOldPDFs() {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Deleted old PDF:', file);
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up PDFs:', error);
    }
  }

  // Generate formal catch report PDF with logo and signature
  async generateCatchReportPDF(reportData) {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      const fileName = `laporan-tangkapan-${Date.now()}.pdf`;
      const filePath = path.join(this.uploadsDir, fileName);
      
      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add left logo if exists
      const leftLogoPath = path.join(__dirname, '../../uploads/logo/dinas-logo.png');      // Dinas Perikanan
      const rightLogoPath = path.join(__dirname, '../../uploads/logo/official-logo.png');  // IPB Logo
      
      if (fs.existsSync(leftLogoPath)) {
        doc.image(leftLogoPath, 50, 40, {
          fit: [100, 50]
        });
      }

      // Add right logo if exists
      if (fs.existsSync(rightLogoPath)) {
        doc.image(rightLogoPath, 495, 40, {
          fit: [100, 50]
        });
      }

      // Header - Organization Details (CENTERED)
      doc.fontSize(12).font('Helvetica-Bold')
         .text('PEMERINTAH DAERAH', 0, 45, { align: 'center' })
         .fontSize(14)
         .text('DINAS KELAUTAN DAN PERIKANAN', 0, 62, { align: 'center' })
         .fontSize(9).font('Helvetica')
         .text('Jl. Dramaga, Bogor 16680', 0, 82, { align: 'center' })
         .text('Telp: (0251) 8622642 | Email: dkp@ipb.ac.id', 0, 95, { align: 'center' });

      // Horizontal line
      doc.moveTo(50, 120).lineTo(545, 120).stroke();

      // Report Title (Centered)
      doc.moveDown(2);
      doc.fontSize(16).font('Helvetica-Bold')
         .text('LAPORAN HASIL TANGKAPAN IKAN', 0, 140, { align: 'center' })
         .moveDown(0.5);
      
      // Period info (Centered)
      doc.fontSize(11).font('Helvetica')
         .text(`Periode: ${reportData.periodText}`, 0, 165, { align: 'center' })
         .moveDown(0.3)
         .fontSize(9)
         .text(`Nomor: ${reportData.reportNumber || 'LT/' + new Date().getFullYear() + '/' + Date.now()}`, 0, 180, { align: 'center' });

      // Horizontal line
      doc.moveTo(50, 200).lineTo(545, 200).stroke();

      // Introduction paragraph
      doc.moveDown(2);
      doc.fontSize(11).font('Helvetica')
         .text('Berdasarkan data yang tercatat dalam sistem E-Logbook, dengan ini dilaporkan hasil tangkapan ikan sebagai berikut:', 50, 220, {
           align: 'justify',
           width: 495
         });

      // Table Data
      let tableY = 260;
      
      // Table headers
      const headers = ['No', 'Tanggal', 'Kapal', 'Jenis Ikan', 'Berat (Kg)', 'Nilai (Rp)'];
      const colWidths = [30, 70, 120, 100, 80, 95];
      let startX = 50;

      // Header row
      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((header, i) => {
        const x = colWidths.slice(0, i).reduce((a, b) => a + b, startX);
        doc.rect(x, tableY, colWidths[i], 20).fillAndStroke('#1e293b', '#1e293b');
        doc.fillColor('white').text(header, x + 5, tableY + 6, {
          width: colWidths[i] - 10,
          align: i === 0 || i === 4 || i === 5 ? 'center' : 'left'
        });
      });

      // Reset fill color
      doc.fillColor('black');
      tableY += 20;

      // Data rows
      doc.fontSize(8).font('Helvetica');
      reportData.reports.forEach((report, index) => {
        const rowHeight = 25;
        
        // Alternating row colors
        if (index % 2 === 0) {
          doc.rect(startX, tableY, 495, rowHeight).fill('#f8fafc');
        }

        doc.fillColor('black');
        
        // Row data
        const rowData = [
          (index + 1).toString(),
          new Date(report.date).toLocaleDateString('id-ID'),
          `${report.vesselName}\n(${report.vesselId})`,
          report.fishType,
          report.weightKg.toLocaleString('id-ID'),
          report.totalValue ? report.totalValue.toLocaleString('id-ID') : '-'
        ];

        rowData.forEach((data, i) => {
          const x = colWidths.slice(0, i).reduce((a, b) => a + b, startX);
          doc.rect(x, tableY, colWidths[i], rowHeight).stroke('#e2e8f0');
          doc.text(data, x + 5, tableY + 5, {
            width: colWidths[i] - 10,
            align: i === 0 || i === 4 || i === 5 ? 'center' : 'left'
          });
        });

        tableY += rowHeight;

        // Check if we need a new page
        if (tableY > 700) {
          doc.addPage();
          tableY = 50;
        }
      });

      // Total row
      const totalRowHeight = 25;
      doc.rect(startX, tableY, 495, totalRowHeight).fillAndStroke('#f1f5f9', '#e2e8f0');
      doc.fillColor('black').font('Helvetica-Bold');
      
      doc.text('TOTAL', startX + 5, tableY + 8, { width: 380, align: 'right' });
      doc.text(reportData.totalWeight.toLocaleString('id-ID'), startX + 390, tableY + 8, { width: 75, align: 'center' });
      doc.text(reportData.totalValue.toLocaleString('id-ID'), startX + 470, tableY + 8, { width: 70, align: 'center' });

      tableY += totalRowHeight + 20;

      // Summary box
      if (tableY > 650) {
        doc.addPage();
        tableY = 50;
      }

      doc.fontSize(9).font('Helvetica-Bold')
         .text('Ringkasan:', 50, tableY);
      
      tableY += 15;
      
      doc.fontSize(9).font('Helvetica')
         .text(`• Total Laporan: ${reportData.totalReports} transaksi`, 60, tableY)
         .text(`• Total Berat: ${reportData.totalWeight.toLocaleString('id-ID')} Kg`, 60, tableY + 15)
         .text(`• Total Nilai Ekonomi: Rp ${reportData.totalValue.toLocaleString('id-ID')}`, 60, tableY + 30)
         .text(`• Estimasi Pajak Daerah: Rp ${reportData.totalTax.toLocaleString('id-ID')}`, 60, tableY + 45);

      tableY += 80;

      // Ensure space for signature
      if (tableY > 600) {
        doc.addPage();
        tableY = 50;
      }

      // Signature section
      const signatureY = tableY + 20;
      const today = new Date();
      const location = reportData.signatureLocation || 'Jakarta';
      const dateStr = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      doc.fontSize(11).font('Helvetica')
         .text(`${location}, ${dateStr}`, 350, signatureY, { align: 'left' });

      doc.fontSize(11).font('Helvetica-Bold')
         .text(reportData.signaturePosition || 'Kepala Dinas', 350, signatureY + 20, { align: 'left' });

      // Add signature image if available
      if (reportData.signatureImagePath) {
        const signaturePath = path.join(__dirname, '../..', reportData.signatureImagePath);
        if (fs.existsSync(signaturePath)) {
          doc.image(signaturePath, 350, signatureY + 40, {
            fit: [100, 50],
            align: 'left'
          });
        }
      } else {
        // Empty space for manual signature
        doc.moveDown(3);
      }

      // Signature name with underline
      doc.fontSize(11).font('Helvetica-Bold')
         .text(reportData.signatureName || '_______________________', 350, signatureY + 100, { 
           align: 'left',
           underline: !reportData.signatureName 
         });

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica')
           .fillColor('#666666')
           .text('E-Logbook Maritime System - Dokumen Resmi', 50, 780, { align: 'left' })
           .text(`Halaman ${i + 1} dari ${pageCount}`, 50, 780, { align: 'right' })
           .text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 50, 792, { align: 'center' });
      }

      // Finalize PDF
      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve) => {
        doc.on('end', resolve);
      });

      console.log('📄 PDF laporan tangkapan berhasil dibuat:', fileName);
      return {
        fileName,
        filePath,
        fileUrl: `/uploads/surat-tugas/${fileName}`
      };
    } catch (error) {
      console.error('❌ Error generating catch report PDF:', error);
      throw error;
    }
  }
}

module.exports = new PDFService();