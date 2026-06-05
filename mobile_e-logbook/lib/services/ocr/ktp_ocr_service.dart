import 'package:e_logbook/screens/documents/models/ktp_ocr_result.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class KTPOCRService {
  static final TextRecognizer _textRecognizer = TextRecognizer();

  // Dispose the recognizer when not needed
  static void dispose() {
    _textRecognizer.close();
  }

  /// Extract KTP data from image file
  static Future<KTPOCRResult> extractKTPData(String imagePath) async {
    try {
      final inputImage = InputImage.fromFilePath(imagePath);
      final recognizedText = await _textRecognizer.processImage(inputImage);

      return _parseKTPText(recognizedText.text);
    } catch (e) {
      throw Exception('Gagal memproses gambar: $e');
    }
  }

  /// Parse recognized text to extract KTP fields
  static KTPOCRResult _parseKTPText(String text) {
    final lines = text.split('\n').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    
    // Debug: Print all recognized lines
    print('🔍 OCR Recognized Lines:');
    for (int i = 0; i < lines.length; i++) {
      print('  [$i] ${lines[i]}');
    }
    
    String? nik;
    String? nama;
    String? tempatLahir;
    String? tanggalLahir;
    String? jenisKelamin;
    String? golonganDarah;
    String? alamat;
    String? rtRw;
    String? kelDesa;
    String? kecamatan;
    String? agama;
    String? statusPerkawinan;
    String? pekerjaan;
    String? kewarganegaraan;
    String? berlakuHingga;

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i].toUpperCase();
      final originalLine = lines[i];

      // NIK - 16 digit number (bisa ada spasi atau tanpa ":")
      if (nik == null) {
        final cleanLine = originalLine.replaceAll(RegExp(r'[^0-9]'), '');
        if (cleanLine.length == 16) {
          nik = cleanLine;
          print('  ✅ NIK found: $nik');
          continue;
        }
      }

      // Nama - setelah NIK, huruf kapital, bukan label
      if (nama == null && nik != null && !line.contains('PROVINSI') && !line.contains('KABUPATEN') && !line.contains('KOTA')) {
        final value = originalLine.replaceAll(':', '').trim();
        if (value.length > 3 && !_isNIK(value) && !value.contains(',') && !_isDatePattern(value) && 
            !line.contains('TEMPAT') && !line.contains('LAHIR') && !line.contains('NIK')) {
          nama = value;
          print('  ✅ Nama found: $nama');
          continue;
        }
      }

      // Tempat/Tgl Lahir - ada koma atau kata LAHIR
      if ((tempatLahir == null || tanggalLahir == null) && nama != null) {
        if (line.contains('TEMPAT') && line.contains('LAHIR')) {
          // Ambil baris berikutnya
          if (i + 1 < lines.length) {
            final nextLine = lines[i + 1].replaceAll(':', '').trim();
            if (nextLine.contains(',')) {
              final parts = nextLine.split(',').map((e) => e.trim()).toList();
              tempatLahir = parts[0];
              if (parts.length > 1) tanggalLahir = parts[1];
              print('  ✅ Tempat/Tanggal found: $tempatLahir, $tanggalLahir');
            }
          }
        } else if (originalLine.contains(',')) {
          final value = originalLine.replaceAll(':', '').trim();
          final parts = value.split(',').map((e) => e.trim()).toList();
          if (parts.length >= 2 && !_isNIK(parts[0])) {
            tempatLahir = parts[0];
            tanggalLahir = parts[1];
            print('  ✅ Tempat/Tanggal found: $tempatLahir, $tanggalLahir');
            continue;
          }
        }
      }

      // Jenis Kelamin
      if (jenisKelamin == null) {
        final value = originalLine.replaceAll(':', '').trim().toUpperCase();
        if (value.contains('LAKI-LAKI') || value == 'LAKI LAKI') {
          jenisKelamin = 'LAKI-LAKI';
          print('  ✅ Jenis Kelamin found: $jenisKelamin');
          continue;
        } else if (value.contains('PEREMPUAN')) {
          jenisKelamin = 'PEREMPUAN';
          print('  ✅ Jenis Kelamin found: $jenisKelamin');
          continue;
        }
      }

      // Golongan Darah
      if (golonganDarah == null && (line.contains('GOL') || line.contains('DARAH'))) {
        final value = originalLine.replaceAll(':', '').replaceAll('Gol. Darah', '').replaceAll('GOL DARAH', '').trim();
        if (value.length <= 3 && (value == 'A' || value == 'B' || value == 'AB' || value == 'O' || value == '-')) {
          golonganDarah = value;
          print('  ✅ Gol. Darah found: $golonganDarah');
          continue;
        }
      }

      // Alamat - setelah jenis kelamin, biasanya panjang
      if (alamat == null && jenisKelamin != null && !line.contains('RT') && !line.contains('RW')) {
        final value = originalLine.replaceAll(':', '').trim();
        if (value.length > 10 && !value.contains('/') && !_isNIK(value)) {
          alamat = value;
          print('  ✅ Alamat found: $alamat');
          continue;
        }
      }

      // RT/RW - format 001/002 atau 1/2
      if (rtRw == null && originalLine.contains('/')) {
        final value = originalLine.replaceAll(':', '').trim();
        final parts = value.split('/');
        if (parts.length == 2 && parts[0].replaceAll(RegExp(r'[^0-9]'), '').isNotEmpty) {
          rtRw = value;
          print('  ✅ RT/RW found: $rtRw');
          continue;
        }
      }

      // Kel/Desa
      if (kelDesa == null && rtRw != null && !line.contains('KECAMATAN')) {
        final value = originalLine.replaceAll(':', '').trim();
        if (value.length > 3 && value.length < 30 && !value.contains('/')) {
          kelDesa = value;
          print('  ✅ Kel/Desa found: $kelDesa');
          continue;
        }
      }

      // Kecamatan
      if (kecamatan == null && kelDesa != null) {
        final value = originalLine.replaceAll(':', '').trim();
        if (value.length > 3 && value.length < 30 && value != kelDesa && 
            !line.contains('AGAMA') && !line.contains('STATUS') && !line.contains('PEKERJAAN')) {
          kecamatan = value;
          print('  ✅ Kecamatan found: $kecamatan');
          continue;
        }
      }

      // Agama
      if (agama == null) {
        final value = originalLine.replaceAll(':', '').trim().toUpperCase();
        if (value == 'ISLAM' || value == 'KRISTEN' || value == 'KATOLIK' || 
            value == 'HINDU' || value == 'BUDDHA' || value == 'KONGHUCU' || value == 'KHONGHUCU') {
          agama = value;
          print('  ✅ Agama found: $agama');
          continue;
        }
      }

      // Status Perkawinan
      if (statusPerkawinan == null) {
        final value = originalLine.replaceAll(':', '').trim().toUpperCase();
        if (value.contains('KAWIN') || value.contains('BELUM') || value.contains('CERAI')) {
          statusPerkawinan = value;
          print('  ✅ Status Perkawinan found: $statusPerkawinan');
          continue;
        }
      }

      // Pekerjaan
      if (pekerjaan == null && (line.contains('PEGAWAI') || line.contains('WIRASWASTA') || 
          line.contains('PNS') || line.contains('KARYAWAN') || line.contains('BURUH'))) {
        final value = originalLine.replaceAll(':', '').trim();
        pekerjaan = value;
        print('  ✅ Pekerjaan found: $pekerjaan');
        continue;
      }

      // Kewarganegaraan
      if (kewarganegaraan == null && line.contains('WNI')) {
        kewarganegaraan = 'WNI';
        print('  ✅ Kewarganegaraan found: $kewarganegaraan');
        continue;
      }

      // Berlaku Hingga
      if (berlakuHingga == null && line.contains('BERLAKU')) {
        final value = originalLine.replaceAll(':', '').replaceAll('BERLAKU HINGGA', '').trim();
        berlakuHingga = value;
        print('  ✅ Berlaku Hingga found: $berlakuHingga');
        continue;
      }
    }

    // Calculate confidence based on how many fields were extracted
    int fieldsFound = 0;
    if (nik != null) fieldsFound++;
    if (nama != null) fieldsFound++;
    if (tanggalLahir != null) fieldsFound++;
    if (alamat != null) fieldsFound++;
    if (jenisKelamin != null) fieldsFound++;
    
    double confidence = fieldsFound / 5 * 100; // Based on 5 most important fields

    // Debug: Print extracted data
    print('🎯 Extracted Data:');
    print('  NIK: $nik');
    print('  Nama: $nama');
    print('  Tempat Lahir: $tempatLahir');
    print('  Tanggal Lahir: $tanggalLahir');
    print('  Jenis Kelamin: $jenisKelamin');
    print('  Confidence: ${confidence.toStringAsFixed(1)}%');

    // Post-processing: Validasi dan bersihkan data dari label
    print('🔍 Post-processing validation...');
    
    // Filter nama: tidak boleh mengandung kata kunci label
    if (nama != null) {
      final namaUpper = nama.toUpperCase();
      if (namaUpper.contains('TEMPAT') || namaUpper.contains('LAHIR') || 
          namaUpper.contains('TGL') || namaUpper == 'NAMA') {
        print('⚠️ Warning: Nama mengandung label, di-reset');
        nama = null;
      }
    }
    
    // Validasi nama tidak mengandung koma (kemungkinan tercampur dengan tempat lahir)
    if (nama != null && nama.contains(',')) {
      print('⚠️ Warning: Nama mengandung koma, kemungkinan tercampur dengan tempat lahir');
      final parts = nama.split(',').map((e) => e.trim()).toList();
      // Jika tempat lahir masih kosong, pindahkan ke tempat lahir
      if (tempatLahir == null && parts.length >= 2) {
        nama = parts[0]; // Ambil bagian pertama sebagai nama
        tempatLahir = parts[1]; // Bagian kedua sebagai tempat
        if (parts.length > 2 && tanggalLahir == null) {
          tanggalLahir = parts[2]; // Bagian ketiga sebagai tanggal
        }
        print('  ✅ Fixed - Nama: $nama, Tempat: $tempatLahir, Tanggal: $tanggalLahir');
      }
    }
    
    // Filter tempat lahir: tidak boleh mengandung kata kunci label atau sama dengan nama
    if (tempatLahir != null) {
      final tempatUpper = tempatLahir.toUpperCase();
      if (tempatUpper.contains('TEMPAT') || tempatUpper.contains('LAHIR') || 
          tempatUpper.contains('TGL') || tempatLahir == nama) {
        print('⚠️ Warning: Tempat lahir tidak valid (label atau sama dengan nama), di-reset');
        tempatLahir = null;
      }
    }
    
    // Jika tempat lahir sama dengan nama, reset tempat lahir
    if (tempatLahir != null && nama != null && tempatLahir.toUpperCase() == nama.toUpperCase()) {
      print('⚠️ Warning: Tempat lahir sama dengan nama, di-reset');
      tempatLahir = null;
    }

    return KTPOCRResult(
      nik: nik,
      nama: nama,
      tempatLahir: tempatLahir,
      tanggalLahir: tanggalLahir,
      jenisKelamin: jenisKelamin,
      golonganDarah: golonganDarah,
      alamat: alamat,
      rtRw: rtRw,
      kelDesa: kelDesa,
      kecamatan: kecamatan,
      agama: agama,
      statusPerkawinan: statusPerkawinan,
      pekerjaan: pekerjaan,
      kewarganegaraan: kewarganegaraan,
      berlakuHingga: berlakuHingga,
      confidence: confidence,
    );
  }

  /// Check if line is a NIK (16 digits)
  static bool _isNIK(String line) {
    final nikPattern = RegExp(r'\b\d{16}\b');
    return nikPattern.hasMatch(line);
  }

  /// Check if string matches date pattern (DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY)
  static bool _isDatePattern(String text) {
    final datePatterns = [
      RegExp(r'\d{1,2}[-/.]\d{1,2}[-/.]\d{4}'), // DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
      RegExp(r'\d{1,2}\s+[A-Z]+\s+\d{4}'), // DD MONTH YYYY (e.g., 01 JANUARI 1990)
    ];
    
    for (final pattern in datePatterns) {
      if (pattern.hasMatch(text.toUpperCase())) {
        return true;
      }
    }
    return false;
  }
}