import 'dart:io';
import 'package:e_logbook/screens/documents/models/ktp_ocr_result.dart';
import 'package:e_logbook/screens/documents/widgets/ocr/edit_ktp_dialog.dart';
import 'package:e_logbook/screens/documents/widgets/ocr/ktp_file_picker.dart';
import 'package:e_logbook/screens/documents/widgets/ocr/ktp_ocr_result_widget.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:flutter/material.dart';

import '../widgets/ocr/ktp_scanner_screen.dart';
import '../../../services/api/document_service.dart';
import '../../../services/ocr/ktp_ocr_service.dart';


class Step1KTP extends StatefulWidget {
  final VoidCallback onNext;

  const Step1KTP({Key? key, required this.onNext}) : super(key: key);

  @override
  State<Step1KTP> createState() => _Step1KTPState();
}

class _Step1KTPState extends State<Step1KTP> {
  File? _selectedFile;
  bool _isUploading = false;
  bool _isProcessingOCR = false;
  KTPOCRResult? _ocrResult;

  @override
  void dispose() {
    KTPOCRService.dispose();
    super.dispose();
  }

  Future<void> _processOCR(File file) async {
    setState(() {
      _isProcessingOCR = true;
      _ocrResult = null;
    });

    try {
      final result = await KTPOCRService.extractKTPData(file.path);
      
      if (mounted) {
        setState(() {
          _ocrResult = result;
          _isProcessingOCR = false;
        });

        // Tampilkan dialog konfirmasi untuk cek data
        _showConfirmationDialog(result);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessingOCR = false);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(child: Text('❌ Gagal mendeteksi data: $e')),
              ],
            ),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showConfirmationDialog(KTPOCRResult result) {
    final isValid = result.isValid;
    final missingFields = result.missingFields;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isValid ? Icons.check_circle : Icons.warning_amber_rounded,
              color: isValid ? Colors.green : Colors.orange,
              size: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                isValid ? 'Deteksi Selesai' : 'Data Belum Lengkap',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isValid
                  ? 'Data KTP berhasil terdeteksi. Silakan cek kembali data Anda sebelum melanjutkan.'
                  : 'Beberapa data belum terdeteksi. Mohon lengkapi data berikut:',
              style: const TextStyle(fontSize: 14),
            ),
            if (!isValid) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange[200]!),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: missingFields.map((field) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Icon(Icons.circle, size: 6, color: Colors.orange[700]),
                          const SizedBox(width: 8),
                          Text(
                            field,
                            style: TextStyle(
                              color: Colors.orange[900],
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK, Saya Mengerti'),
          ),
          if (!isValid)
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                _showEditDialog();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B4F9C),
              ),
              child: const Text('Edit Sekarang'),
            ),
        ],
      ),
    );
  }

  Future<void> _showEditDialog() async {
    if (_ocrResult == null) return;

    final updatedResult = await showDialog<KTPOCRResult>(
      context: context,
      builder: (context) => EditKTPDialog(initialData: _ocrResult!),
    );

    if (updatedResult != null && mounted) {
      setState(() {
        _ocrResult = updatedResult;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 8),
              Text('✅ Data berhasil diperbarui'),
            ],
          ),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _uploadDocument() async {
    if (_selectedFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.error_outline, color: Colors.white),
              SizedBox(width: 8),
              Text('Pilih file terlebih dahulu'),
            ],
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Validasi data wajib lengkap
    if (_ocrResult == null || !_ocrResult!.isValid) {
      final missingFields = _ocrResult?.missingFields ?? ['Semua data'];
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: Colors.white),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Data tidak lengkap!',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Field yang harus diisi: ${missingFields.join(", ")}',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
          backgroundColor: Colors.orange[700],
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'Edit',
            textColor: Colors.white,
            onPressed: _showEditDialog,
          ),
        ),
      );
      return;
    }

    setState(() {
      _isUploading = true;
    });

    try {
      final result = await DocumentService.uploadDocument(
        jenisDokumen: 'KTP',
        nomorDokumen: _ocrResult!.nik,
        filePath: _selectedFile!.path,
      );

      if (mounted) {
        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 8),
                  Text('✅ KTP berhasil diupload!'),
                ],
              ),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );

          // Auto navigate to next step
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) {
              widget.onNext();
            }
          });
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(child: Text(result['message'] ?? 'Gagal upload')),
                ],
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(child: Text('Gagal upload: $e')),
              ],
            ),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF1B4F9C).withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.credit_card,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Upload KTP',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Kartu Tanda Penduduk',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Instructions
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[100]!),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700], size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Petunjuk Upload',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue[900],
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '• Pastikan foto KTP jelas dan tidak buram\n'
                        '• Semua data di KTP harus terbaca\n'
                        '• Hindari pantulan cahaya berlebih\n'
                        '• Format: JPG atau PNG\n'
                        '• Ukuran maksimal 10MB\n'
                        '• Data akan otomatis dideteksi dengan OCR',
                        style: TextStyle(
                          color: Colors.blue[800],
                          fontSize: 13,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // File Picker - Hanya tampil jika belum ada result
          if (_ocrResult == null)
            KTPFilePickerWidget(
              label: 'Upload KTP *',
              onFilePicked: (file) {
                setState(() {
                  _selectedFile = file;
                  _ocrResult = null;
                });
                _processOCR(file);
              },
              onCameraTap: () async {
                final file = await NavigationHelper.pushNoTransition<File>(
                  context,
                  const KTPScannerScreen(),
                );
                if (file != null) {
                  setState(() {
                    _selectedFile = file;
                    _ocrResult = null;
                  });
                  _processOCR(file);
                }
              },
            ),

          const SizedBox(height: 24),

          // OCR Processing Indicator
          if (_isProcessingOCR)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue[50]!, Colors.blue[100]!],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation(Colors.blue[700]),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Memproses OCR...',
                          style: TextStyle(
                            color: Colors.blue[900],
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Mendeteksi data KTP dari gambar',
                          style: TextStyle(
                            color: Colors.blue[700],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // OCR Result
          if (_ocrResult != null && !_isProcessingOCR)
            KTPOCRResultWidget(
              result: _ocrResult!,
              onEdit: _showEditDialog,
            ),

          const SizedBox(height: 24),

          // Action Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isUploading || _isProcessingOCR || _selectedFile == null) 
                  ? null 
                  : _uploadDocument,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                disabledBackgroundColor: Colors.grey[300],
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 2,
              ),
              child: _isUploading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_upload, color: Colors.white),
                        const SizedBox(width: 8),
                        Text(
                          _selectedFile == null 
                              ? 'Pilih File Terlebih Dahulu'
                              : 'Upload & Lanjut',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 12),

          // Help Text
          Center(
            child: Text(
              'Data akan otomatis diverifikasi oleh sistem',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}