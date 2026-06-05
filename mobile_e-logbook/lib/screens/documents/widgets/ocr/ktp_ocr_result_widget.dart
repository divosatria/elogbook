import 'package:e_logbook/screens/documents/models/ktp_ocr_result.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class KTPOCRResultWidget extends StatelessWidget {
  final KTPOCRResult result;
  final VoidCallback? onEdit;
  final VoidCallback? onRetry;

  const KTPOCRResultWidget({
    Key? key,
    required this.result,
    this.onEdit,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // OCR Results Card - KTP Style
        _buildKTPStyleCard(context),
        
        const SizedBox(height: 16),
        
        // Action Buttons
        _buildActionButtons(context),
      ],
    );
  }

  Widget _buildKTPStyleCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.blue[50]!,
            Colors.blue[100]!.withOpacity(0.5),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue[200]!, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF1B4F9C).withOpacity(0.9),
                  const Color(0xFF2563EB).withOpacity(0.8),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.credit_card,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Data KTP Terdeteksi',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
                Icon(
                  Icons.verified,
                  color: Colors.white.withOpacity(0.8),
                  size: 20,
                ),
              ],
            ),
          ),
          
          // Card Body - KTP Format Style
          Container(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // NIK - Paling atas, prominent
                _buildKTPRow(
                  context,
                  label: 'NIK',
                  value: result.nik,
                  isNIK: true,
                ),
                
                const SizedBox(height: 10),
                
                // Nama
                _buildKTPRow(
                  context,
                  label: 'Nama',
                  value: result.nama,
                  isImportant: true,
                ),
                
                const SizedBox(height: 10),
                
                // Tempat/Tgl Lahir
                _buildKTPRow(
                  context,
                  label: 'Tempat/Tgl Lahir',
                  value: _combineTempatTanggal(),
                  isImportant: true,
                ),
                
                const SizedBox(height: 10),
                
                // Jenis Kelamin dengan Gol. Darah di sebelah kanan
                _buildKTPRowWithExtra(
                  context,
                  label: 'Jenis Kelamin',
                  value: result.jenisKelamin,
                  extraLabel: 'Gol. Darah',
                  extraValue: result.golonganDarah,
                ),
                
                const SizedBox(height: 10),
                
                // Alamat
                _buildKTPRow(
                  context,
                  label: 'Alamat',
                  value: result.alamat,
                  isImportant: true,
                ),
                
                const SizedBox(height: 10),
                
                // RT/RW
                _buildKTPRow(
                  context,
                  label: 'RT/RW',
                  value: result.rtRw,
                  indent: true,
                ),
                
                const SizedBox(height: 10),
                
                // Kel/Desa
                _buildKTPRow(
                  context,
                  label: 'Kel/Desa',
                  value: result.kelDesa,
                  indent: true,
                ),
                
                const SizedBox(height: 10),
                
                // Kecamatan
                _buildKTPRow(
                  context,
                  label: 'Kecamatan',
                  value: result.kecamatan,
                  indent: true,
                ),
                
                const SizedBox(height: 10),
                
                // Agama
                _buildKTPRow(
                  context,
                  label: 'Agama',
                  value: result.agama,
                ),
                
                const SizedBox(height: 10),
                
                // Status Perkawinan
                _buildKTPRow(
                  context,
                  label: 'Status Perkawinan',
                  value: result.statusPerkawinan,
                ),
                
                const SizedBox(height: 10),
                
                // Pekerjaan
                _buildKTPRow(
                  context,
                  label: 'Pekerjaan',
                  value: result.pekerjaan,
                ),
                
                const SizedBox(height: 10),
                
                // Kewarganegaraan
                _buildKTPRow(
                  context,
                  label: 'Kewarganegaraan',
                  value: result.kewarganegaraan,
                ),
                
                const SizedBox(height: 10),
                
                // Berlaku Hingga
                _buildKTPRow(
                  context,
                  label: 'Berlaku Hingga',
                  value: result.berlakuHingga,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _combineTempatTanggal() {
    final tempat = result.tempatLahir ?? '';
    final tanggal = result.tanggalLahir ?? '';
    
    // Jika keduanya kosong
    if (tempat.isEmpty && tanggal.isEmpty) {
      return '';
    }
    
    // Jika salah satu kosong, tampilkan yang ada saja
    if (tempat.isEmpty) {
      return tanggal;
    }
    if (tanggal.isEmpty) {
      return tempat;
    }
    
    // Keduanya ada
    return '$tempat, $tanggal';
  }

  // KTP Row format: "Label  : Value"
  Widget _buildKTPRow(
    BuildContext context, {
    required String label,
    String? value,
    bool isNIK = false,
    bool isImportant = false,
    bool indent = false,
  }) {
    final hasValue = value != null && value.isNotEmpty;
    final labelWidth = indent ? 120.0 : 145.0;
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label
        SizedBox(
          width: labelWidth,
          child: Row(
            children: [
              if (indent) const SizedBox(width: 20),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: isNIK ? 14 : 13,
                    fontWeight: isNIK ? FontWeight.bold : FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Colon (:)
        const Text(
          ':',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        
        const SizedBox(width: 8),
        
        // Value
        Expanded(
          child: hasValue
              ? Row(
                  children: [
                    Expanded(
                      child: Text(
                        value,
                        style: TextStyle(
                          fontSize: isNIK ? 15 : 13,
                          fontWeight: isNIK ? FontWeight.bold : FontWeight.w600,
                          color: isNIK 
                              ? const Color(0xFF1B4F9C) 
                              : Colors.black87,
                          letterSpacing: isNIK ? 0.5 : 0,
                        ),
                      ),
                    ),
                    if (isNIK)
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            Clipboard.setData(ClipboardData(text: value));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Row(
                                  children: const [
                                    Icon(Icons.check_circle, 
                                      color: Colors.white, 
                                      size: 18
                                    ),
                                    SizedBox(width: 8),
                                    Text('NIK disalin'),
                                  ],
                                ),
                                backgroundColor: Colors.green[600],
                                duration: const Duration(seconds: 1),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(
                              Icons.copy,
                              size: 16,
                              color: const Color(0xFF1B4F9C).withOpacity(0.7),
                            ),
                          ),
                        ),
                      ),
                  ],
                )
              : Text(
                  '-',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[400],
                  ),
                ),
        ),
      ],
    );
  }

  // KTP Row with extra value on the right (for Gol. Darah)
  Widget _buildKTPRowWithExtra(
    BuildContext context, {
    required String label,
    String? value,
    required String extraLabel,
    String? extraValue,
  }) {
    final hasValue = value != null && value.isNotEmpty;
    final hasExtraValue = extraValue != null && extraValue.isNotEmpty;
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label
        SizedBox(
          width: 145,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Colors.black87,
            ),
          ),
        ),
        
        // Colon (:)
        const Text(
          ':',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        
        const SizedBox(width: 8),
        
        // Value
        Expanded(
          flex: 3,
          child: Text(
            hasValue ? value : '-',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: hasValue ? Colors.black87 : Colors.grey[400],
            ),
          ),
        ),
        
        const SizedBox(width: 12),
        
        // Extra Label (Gol. Darah)
        Text(
          extraLabel,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        
        const SizedBox(width: 4),
        
        const Text(
          ':',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        
        const SizedBox(width: 8),
        
        // Extra Value
        Expanded(
          flex: 1,
          child: Text(
            hasExtraValue ? extraValue : '-',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: hasExtraValue ? Colors.black87 : Colors.grey[400],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    return Column(
      children: [
        // Warning jika ada data yang belum lengkap
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange[50],
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: Colors.orange[200]!),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.orange[700], size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Cek kembali data Anda sebelum melanjutkan',
                  style: TextStyle(
                    color: Colors.orange[900],
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Edit button only
        if (onEdit != null)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onEdit,
              icon: const Icon(Icons.edit, size: 18),
              label: const Text('Edit Manual'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B4F9C),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 2,
              ),
            ),
          ),
      ],
    );
  }
}