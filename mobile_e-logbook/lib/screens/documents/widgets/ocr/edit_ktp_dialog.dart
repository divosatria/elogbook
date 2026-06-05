import 'package:e_logbook/screens/documents/models/ktp_ocr_result.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class EditKTPDialog extends StatefulWidget {
  final KTPOCRResult initialData;

  const EditKTPDialog({
    Key? key,
    required this.initialData,
  }) : super(key: key);

  @override
  State<EditKTPDialog> createState() => _EditKTPDialogState();
}

class _EditKTPDialogState extends State<EditKTPDialog> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _nikController;
  late TextEditingController _namaController;
  late TextEditingController _tempatLahirController;
  late TextEditingController _tanggalLahirController;
  late TextEditingController _jenisKelaminController;
  late TextEditingController _golonganDarahController;
  late TextEditingController _alamatController;
  late TextEditingController _rtRwController;
  late TextEditingController _kelDesaController;
  late TextEditingController _kecamatanController;
  late TextEditingController _agamaController;
  late TextEditingController _statusPerkawinanController;
  late TextEditingController _pekerjaanController;
  late TextEditingController _kewarganegaraanController;
  late TextEditingController _berlakuHinggaController;

  @override
  void initState() {
    super.initState();
    _nikController = TextEditingController(text: widget.initialData.nik);
    _namaController = TextEditingController(text: widget.initialData.nama);
    _tempatLahirController = TextEditingController(text: widget.initialData.tempatLahir);
    _tanggalLahirController = TextEditingController(text: widget.initialData.tanggalLahir);
    _jenisKelaminController = TextEditingController(text: widget.initialData.jenisKelamin);
    _golonganDarahController = TextEditingController(text: widget.initialData.golonganDarah);
    _alamatController = TextEditingController(text: widget.initialData.alamat);
    _rtRwController = TextEditingController(text: widget.initialData.rtRw);
    _kelDesaController = TextEditingController(text: widget.initialData.kelDesa);
    _kecamatanController = TextEditingController(text: widget.initialData.kecamatan);
    _agamaController = TextEditingController(text: widget.initialData.agama);
    _statusPerkawinanController = TextEditingController(text: widget.initialData.statusPerkawinan);
    _pekerjaanController = TextEditingController(text: widget.initialData.pekerjaan);
    _kewarganegaraanController = TextEditingController(text: widget.initialData.kewarganegaraan);
    _berlakuHinggaController = TextEditingController(text: widget.initialData.berlakuHingga);
  }

  @override
  void dispose() {
    _nikController.dispose();
    _namaController.dispose();
    _tempatLahirController.dispose();
    _tanggalLahirController.dispose();
    _jenisKelaminController.dispose();
    _golonganDarahController.dispose();
    _alamatController.dispose();
    _rtRwController.dispose();
    _kelDesaController.dispose();
    _kecamatanController.dispose();
    _agamaController.dispose();
    _statusPerkawinanController.dispose();
    _pekerjaanController.dispose();
    _kewarganegaraanController.dispose();
    _berlakuHinggaController.dispose();
    super.dispose();
  }

  void _saveChanges() {
    if (_formKey.currentState!.validate()) {
      final updatedResult = KTPOCRResult(
        nik: _nikController.text.trim(),
        nama: _namaController.text.trim(),
        tempatLahir: _tempatLahirController.text.trim(),
        tanggalLahir: _tanggalLahirController.text.trim(),
        jenisKelamin: _jenisKelaminController.text.trim(),
        golonganDarah: _golonganDarahController.text.trim(),
        alamat: _alamatController.text.trim(),
        rtRw: _rtRwController.text.trim(),
        kelDesa: _kelDesaController.text.trim(),
        kecamatan: _kecamatanController.text.trim(),
        agama: _agamaController.text.trim(),
        statusPerkawinan: _statusPerkawinanController.text.trim(),
        pekerjaan: _pekerjaanController.text.trim(),
        kewarganegaraan: _kewarganegaraanController.text.trim(),
        berlakuHingga: _berlakuHinggaController.text.trim(),
        confidence: 100.0, // Manual edit = 100% confidence
      );

      Navigator.pop(context, updatedResult);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final maxDialogHeight = screenHeight * 0.85; // 85% dari tinggi layar
    
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: BoxConstraints(maxWidth: 600, maxHeight: maxDialogHeight),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            // Header - KTP Style
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
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
                    child: const Icon(Icons.edit, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Edit Data KTP',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                    padding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),

            // Form Content - KTP Style
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.blue[50]!,
                      Colors.blue[100]!.withOpacity(0.3),
                    ],
                  ),
                ),
                child: Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _buildKTPField('NIK', _nikController, required: true, isNIK: true),
                      _buildKTPField('Nama', _namaController, required: true),
                      _buildKTPField('Tempat Lahir', _tempatLahirController),
                      _buildKTPField('Tanggal Lahir', _tanggalLahirController, hint: 'DD-MM-YYYY', required: true),
                      _buildKTPDropdown('Jenis Kelamin', _jenisKelaminController, ['LAKI-LAKI', 'PEREMPUAN']),
                      _buildKTPDropdown('Gol. Darah', _golonganDarahController, ['A', 'B', 'AB', 'O', '-']),
                      _buildKTPField('Alamat', _alamatController, required: true, maxLines: 2),
                      _buildKTPField('RT/RW', _rtRwController, hint: '001/002'),
                      _buildKTPField('Kel/Desa', _kelDesaController),
                      _buildKTPField('Kecamatan', _kecamatanController),
                      _buildKTPDropdown('Agama', _agamaController, ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU']),
                      _buildKTPDropdown('Status Perkawinan', _statusPerkawinanController, ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI']),
                      _buildKTPField('Pekerjaan', _pekerjaanController),
                      _buildKTPField('Kewarganegaraan', _kewarganegaraanController),
                      _buildKTPField('Berlaku Hingga', _berlakuHinggaController, hint: 'SEUMUR HIDUP'),
                    ],
                  ),
                ),
              ),
            ),

            // Footer Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(20),
                  bottomRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('Batal'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _saveChanges,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1B4F9C),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text(
                        'Simpan',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // KTP Style Field
  Widget _buildKTPField(
    String label,
    TextEditingController controller, {
    bool required = false,
    bool isNIK = false,
    String? hint,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: maxLines > 1 ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 145,
            child: Text(
              label + (required ? ' *' : ''),
              style: TextStyle(
                fontSize: isNIK ? 14 : 13,
                fontWeight: isNIK ? FontWeight.bold : FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
          const Text(
            ':',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextFormField(
              controller: controller,
              maxLines: maxLines,
              style: TextStyle(
                fontSize: isNIK ? 15 : 13,
                fontWeight: isNIK ? FontWeight.bold : FontWeight.w600,
                color: isNIK ? const Color(0xFF1B4F9C) : Colors.black87,
              ),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.blue[200]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.blue[200]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                ),
              ),
              validator: required
                  ? (value) {
                      if (value == null || value.isEmpty) {
                        return '$label wajib diisi';
                      }
                      if (isNIK && value.length != 16) {
                        return 'NIK harus 16 digit';
                      }
                      return null;
                    }
                  : null,
              inputFormatters: isNIK
                  ? [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(16),
                    ]
                  : null,
              keyboardType: isNIK ? TextInputType.number : null,
              textCapitalization: isNIK ? TextCapitalization.none : TextCapitalization.words,
            ),
          ),
        ],
      ),
    );
  }

  // KTP Style Dropdown
  Widget _buildKTPDropdown(
    String label,
    TextEditingController controller,
    List<String> items,
  ) {
    final currentValue = controller.text.isEmpty || !items.contains(controller.text) 
        ? null 
        : controller.text;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
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
          const Text(
            ':',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonFormField<String>(
              value: currentValue,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
              decoration: InputDecoration(
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.blue[200]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: Colors.blue[200]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                ),
              ),
              items: items.map((String value) {
                return DropdownMenuItem<String>(
                  value: value,
                  child: Text(value),
                );
              }).toList(),
              onChanged: (String? newValue) {
                if (newValue != null) {
                  setState(() {
                    controller.text = newValue;
                  });
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}