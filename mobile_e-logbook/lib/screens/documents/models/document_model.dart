// lib/screens/document_upload/models/document_model.dart

class DocumentModel {
  final String? id;
  final String jenisDokumen;
  final String? nomorDokumen;
  final String? tanggalBerlaku;
  final String? keterangan;
  final String? fileName;
  final String? fileUrl;
  final String status; // pending, approved, rejected
  final String? uploadedAt;
  final String? verifiedAt;
  final int? verifiedBy;
  final String? rejectionReason;

  DocumentModel({
    this.id,
    required this.jenisDokumen,
    this.nomorDokumen,
    this.tanggalBerlaku,
    this.keterangan,
    this.fileName,
    this.fileUrl,
    this.status = 'pending',
    this.uploadedAt,
    this.verifiedAt,
    this.verifiedBy,
    this.rejectionReason,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    return DocumentModel(
      id: json['id']?.toString(),
      jenisDokumen: json['jenisDokumen'] ?? '',
      nomorDokumen: json['nomorDokumen'],
      tanggalBerlaku: json['tanggalBerlaku'],
      keterangan: json['keterangan'],
      fileName: json['fileName'],
      fileUrl: json['fileUrl'],
      status: json['status'] ?? 'pending',
      uploadedAt: json['uploadedAt'],
      verifiedAt: json['verifiedAt'],
      verifiedBy: json['verifiedBy'],
      rejectionReason: json['rejectionReason'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'jenisDokumen': jenisDokumen,
      'nomorDokumen': nomorDokumen,
      'tanggalBerlaku': tanggalBerlaku,
      'keterangan': keterangan,
      'fileName': fileName,
      'fileUrl': fileUrl,
      'status': status,
      'uploadedAt': uploadedAt,
      'verifiedAt': verifiedAt,
      'verifiedBy': verifiedBy,
      'rejectionReason': rejectionReason,
    };
  }
}

// Document Types Constants
class DocTypes {
  static const String ktp = 'KTP';
  static const String pasFoto = 'Pas Foto';
  static const String npwp = 'NPWP';
  static const String bukuPelaut = 'Buku Pelaut';
  static const String sertifikatNahkoda = 'Sertifikat Nahkoda';
  static const String bst = 'BST';
  static const String suratSehat = 'Surat Keterangan Sehat';
  static const String skck = 'SKCK';

  static List<String> getAllTypes() {
    return [ktp, pasFoto, npwp, bukuPelaut, sertifikatNahkoda, bst, suratSehat, skck];
  }

  // Category 1: File only
  static bool isCategory1(String type) {
    return [ktp, pasFoto].contains(type);
  }

  // Category 2: File + Number
  static bool isCategory2(String type) {
    return [npwp].contains(type);
  }

  // Category 3: File + Number + Date
  static bool isCategory3(String type) {
    return [bukuPelaut, sertifikatNahkoda, bst, suratSehat, skck].contains(type);
  }
}