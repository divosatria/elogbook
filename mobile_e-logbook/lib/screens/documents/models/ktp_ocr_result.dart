class KTPOCRResult {
  final String? nik;
  final String? nama;
  final String? tempatLahir;
  final String? tanggalLahir;
  final String? jenisKelamin;
  final String? golonganDarah;
  final String? alamat;
  final String? rtRw;
  final String? kelDesa;
  final String? kecamatan;
  final String? agama;
  final String? statusPerkawinan;
  final String? pekerjaan;
  final String? kewarganegaraan;
  final String? berlakuHingga;
  final double confidence;

  KTPOCRResult({
    this.nik,
    this.nama,
    this.tempatLahir,
    this.tanggalLahir,
    this.jenisKelamin,
    this.golonganDarah,
    this.alamat,
    this.rtRw,
    this.kelDesa,
    this.kecamatan,
    this.agama,
    this.statusPerkawinan,
    this.pekerjaan,
    this.kewarganegaraan,
    this.berlakuHingga,
    this.confidence = 0.0,
  });

  factory KTPOCRResult.fromJson(Map<String, dynamic> json) {
    return KTPOCRResult(
      nik: json['nik'] as String?,
      nama: json['nama'] as String?,
      tempatLahir: json['tempatLahir'] as String?,
      tanggalLahir: json['tanggalLahir'] as String?,
      jenisKelamin: json['jenisKelamin'] as String?,
      golonganDarah: json['golonganDarah'] as String?,
      alamat: json['alamat'] as String?,
      rtRw: json['rtRw'] as String?,
      kelDesa: json['kelDesa'] as String?,
      kecamatan: json['kecamatan'] as String?,
      agama: json['agama'] as String?,
      statusPerkawinan: json['statusPerkawinan'] as String?,
      pekerjaan: json['pekerjaan'] as String?,
      kewarganegaraan: json['kewarganegaraan'] as String?,
      berlakuHingga: json['berlakuHingga'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'nik': nik,
      'nama': nama,
      'tempatLahir': tempatLahir,
      'tanggalLahir': tanggalLahir,
      'jenisKelamin': jenisKelamin,
      'golonganDarah': golonganDarah,
      'alamat': alamat,
      'rtRw': rtRw,
      'kelDesa': kelDesa,
      'kecamatan': kecamatan,
      'agama': agama,
      'statusPerkawinan': statusPerkawinan,
      'pekerjaan': pekerjaan,
      'kewarganegaraan': kewarganegaraan,
      'berlakuHingga': berlakuHingga,
      'confidence': confidence,
    };
  }

  bool get isComplete {
    return nik != null && 
           nama != null && 
           tanggalLahir != null &&
           alamat != null;
  }

  // Validasi data wajib terisi (tidak boleh kosong atau placeholder)
  bool get isValid {
    return _isValidField(nik) && 
           _isValidField(nama) && 
           _isValidField(tempatLahir) &&
           _isValidField(tanggalLahir) &&
           _isValidField(alamat);
  }

  bool _isValidField(String? value) {
    if (value == null || value.isEmpty) return false;
    if (value == '-') return false;
    if (value.trim().isEmpty) return false;
    return true;
  }

  // Get missing required fields
  List<String> get missingFields {
    List<String> missing = [];
    if (!_isValidField(nik)) missing.add('NIK');
    if (!_isValidField(nama)) missing.add('Nama');
    if (!_isValidField(tempatLahir)) missing.add('Tempat Lahir');
    if (!_isValidField(tanggalLahir)) missing.add('Tanggal Lahir');
    if (!_isValidField(alamat)) missing.add('Alamat');
    return missing;
  }

  int get completedFieldsCount {
    int count = 0;
    if (nik != null && nik!.isNotEmpty) count++;
    if (nama != null && nama!.isNotEmpty) count++;
    if (tempatLahir != null && tempatLahir!.isNotEmpty) count++;
    if (tanggalLahir != null && tanggalLahir!.isNotEmpty) count++;
    if (jenisKelamin != null && jenisKelamin!.isNotEmpty) count++;
    if (alamat != null && alamat!.isNotEmpty) count++;
    if (agama != null && agama!.isNotEmpty) count++;
    if (statusPerkawinan != null && statusPerkawinan!.isNotEmpty) count++;
    if (pekerjaan != null && pekerjaan!.isNotEmpty) count++;
    return count;
  }

  int get totalFields => 9;

  double get completionPercentage => (completedFieldsCount / totalFields * 100);
}