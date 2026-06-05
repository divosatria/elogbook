import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../widgets/file_picker_widget.dart';
import '../../../services/api/document_service.dart';

class Step5SertifikatNahkoda extends StatefulWidget {
  final VoidCallback onNext;
  const Step5SertifikatNahkoda({Key? key, required this.onNext}) : super(key: key);
  @override
  State<Step5SertifikatNahkoda> createState() => _Step5SertifikatNahkodaState();
}

class _Step5SertifikatNahkodaState extends State<Step5SertifikatNahkoda> {
  File? _selectedFile;
  final TextEditingController _nomorController = TextEditingController();
  final TextEditingController _keteranganController = TextEditingController();
  DateTime? _tanggalBerlaku;
  bool _isUploading = false;

  @override
  void dispose() {
    _nomorController.dispose();
    _keteranganController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 365)),
      firstDate: DateTime.now().subtract(const Duration(days: 180)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: Colors.indigo[600]!,
              onPrimary: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) setState(() => _tanggalBerlaku = picked);
  }

  Future<void> _uploadDocument() async {
    if (_selectedFile == null) {
      _showError('Pilih file terlebih dahulu');
      return;
    }
    if (_nomorController.text.trim().isEmpty) {
      _showError('Nomor sertifikat harus diisi');
      return;
    }
    if (_nomorController.text.trim().length < 3) {
      _showError('Nomor sertifikat minimal 3 karakter');
      return;
    }
    if (_tanggalBerlaku == null) {
      _showError('Tanggal berlaku harus dipilih');
      return;
    }

    final confirmed = await _showConfirmationDialog();
    if (!confirmed) return;

    setState(() => _isUploading = true);

    try {
      final result = await DocumentService.uploadDocument(
        jenisDokumen: 'Sertifikat Nahkoda',
        filePath: _selectedFile!.path,
        nomorDokumen: _nomorController.text.trim(),
        tanggalBerlaku: DateFormat('yyyy-MM-dd').format(_tanggalBerlaku!),
        keterangan: _keteranganController.text.trim().isNotEmpty ? _keteranganController.text.trim() : null,
      );

      if (mounted) {
        if (result['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Sertifikat Nahkoda berhasil diupload!'), backgroundColor: Colors.green),
          );
          Future.delayed(const Duration(milliseconds: 500), () => widget.onNext());
        } else {
          _showError(result['message'] ?? 'Gagal upload');
        }
      }
    } catch (e) {
      _showError('Gagal upload: $e');
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  Future<bool> _showConfirmationDialog() async {
    final fileName = _selectedFile!.path.split(RegExp(r'[\\/]')).last;
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.info_outline, color: Color(0xFF2563EB)),
            SizedBox(width: 12),
            Text('Konfirmasi Upload', style: TextStyle(fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Pastikan data sudah benar:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildInfoRow('File', fileName),
            _buildInfoRow('Nomor', _nomorController.text.trim()),
            _buildInfoRow('Tanggal Berlaku', DateFormat('dd MMMM yyyy').format(_tanggalBerlaku!)),
            if (_keteranganController.text.trim().isNotEmpty)
              _buildInfoRow('Keterangan', _keteranganController.text.trim()),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
            child: const Text('Upload'),
          ),
        ],
      ),
    ) ?? false;
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ),
          const Text(': ', style: TextStyle(fontSize: 13)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                  child: const Icon(Icons.military_tech, color: Colors.white, size: 32),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Sertifikat Nahkoda', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                      SizedBox(height: 4),
                      Text('Captain Certificate', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.indigo[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.indigo[100]!),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, color: Colors.indigo[700], size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Petunjuk Sertifikat', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo[900], fontSize: 15)),
                      const SizedBox(height: 8),
                      Text('• Sertifikat masih berlaku\n• Foto harus jelas dan lengkap\n• Pastikan nomor terlihat jelas', style: TextStyle(color: Colors.indigo[800], fontSize: 13, height: 1.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilePickerWidget(label: 'Upload Sertifikat Nahkoda *', onFilePicked: (file) => setState(() => _selectedFile = file)),
          const SizedBox(height: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Nomor Sertifikat *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
              const SizedBox(height: 12),
              TextField(
                controller: _nomorController,
                decoration: InputDecoration(
                  hintText: 'Masukkan nomor sertifikat',
                  prefixIcon: Icon(Icons.numbers, color: Colors.indigo[600]),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.indigo[600]!, width: 2)),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tanggal Berlaku *', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
              const SizedBox(height: 12),
              InkWell(
                onTap: _selectDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(color: Colors.grey[50], border: Border.all(color: Colors.grey[300]!), borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today, color: Colors.indigo[600], size: 20),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_tanggalBerlaku == null ? 'Pilih tanggal berlaku' : DateFormat('dd MMMM yyyy').format(_tanggalBerlaku!), style: TextStyle(fontSize: 15, color: _tanggalBerlaku == null ? Colors.grey[600] : Colors.black87))),
                      Icon(Icons.arrow_drop_down, color: Colors.grey[600]),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Keterangan (Opsional)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87)),
              const SizedBox(height: 12),
              TextField(
                controller: _keteranganController,
                maxLines: 3,
                maxLength: 200,
                decoration: InputDecoration(
                  hintText: 'Tambahkan catatan jika diperlukan...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.indigo[600]!, width: 2)),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isUploading ? null : _uploadDocument,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 2),
              child: _isUploading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Upload & Lanjut', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}
