import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class UploadFuelScreen extends StatefulWidget {
  final int tripId;

  const UploadFuelScreen({Key? key, required this.tripId}) : super(key: key);

  @override
  State<UploadFuelScreen> createState() => _UploadFuelScreenState();
}

class _UploadFuelScreenState extends State<UploadFuelScreen> {
  final _fuelAmountController = TextEditingController();
  final _fuelPriceController = TextEditingController();
  final _fuelLocationController = TextEditingController();
  final _fuelNotesController = TextEditingController();
  String? _fuelFilePath;
  bool _isLoading = false;
  String _selectedFuelType = 'Solar';
  DateTime _selectedDate = DateTime.now();
  double _totalHarga = 0.0;
  
  final List<String> _fuelTypes = [
    'Solar',
    'Bensin',
    'Pertamax',
  ];

  @override
  void initState() {
    super.initState();
    _fuelAmountController.addListener(_calculateTotal);
    _fuelPriceController.addListener(_calculateTotal);
  }

  void _calculateTotal() {
    final amount = double.tryParse(_fuelAmountController.text) ?? 0;
    final price = double.tryParse(_fuelPriceController.text) ?? 0;
    setState(() {
      _totalHarga = amount * price;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text('Upload Data BBM', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        iconTheme: IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)]),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            _buildInfoCard(),
            SizedBox(height: 16),
            _buildFormCard(),
            SizedBox(height: 16),
            _buildUploadButton(),
            SizedBox(height: 16),
            _buildSubmitButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Colors.blue, size: 24),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              'Isi data pengisian bahan bakar dan upload bukti foto',
              style: TextStyle(fontSize: 13, color: Colors.blue[800]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Data Bahan Bakar', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 20),
          DropdownButtonFormField<String>(
            value: _selectedFuelType,
            decoration: InputDecoration(
              labelText: 'Jenis Bahan Bakar *',
              prefixIcon: ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ).createShader(bounds),
                child: Icon(Icons.local_gas_station, size: 20, color: Colors.white),
              ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            items: _fuelTypes.map((type) {
              return DropdownMenuItem(
                value: type,
                child: Text(type),
              );
            }).toList(),
            onChanged: (value) {
              setState(() => _selectedFuelType = value!);
            },
          ),
          SizedBox(height: 16),
          TextField(
            controller: _fuelAmountController,
            decoration: InputDecoration(
              labelText: 'Jumlah (Liter) *',
              prefixIcon: ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ).createShader(bounds),
                child: Icon(Icons.opacity, size: 20, color: Colors.white),
              ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            keyboardType: TextInputType.number,
          ),
          SizedBox(height: 16),
          TextField(
            controller: _fuelPriceController,
            decoration: InputDecoration(
              labelText: 'Harga/Liter (Rp) *',
              prefixIcon: ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ).createShader(bounds),
                child: Icon(Icons.payments, size: 20, color: Colors.white),
              ),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            keyboardType: TextInputType.number,
          ),
          SizedBox(height: 16),
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Harga:',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blue[800]),
                ),
                Text(
                  'Rp ${_totalHarga.toStringAsFixed(0)}',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue[900]),
                ),
              ],
            ),
          ),
          SizedBox(height: 16),
          InkWell(
            onTap: () => _selectDate(context),
            child: InputDecorator(
              decoration: InputDecoration(
                labelText: 'Tanggal Pengisian *',
                prefixIcon: ShaderMask(
                  shaderCallback: (bounds) => LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  ).createShader(bounds),
                  child: Icon(Icons.event, size: 20, color: Colors.white),
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                style: TextStyle(fontSize: 16),
              ),
            ),
          ),
          SizedBox(height: 16),
          TextField(
            controller: _fuelLocationController,
            decoration: InputDecoration(
              labelText: 'Lokasi Pengisian',
              prefixIcon: ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ).createShader(bounds),
                child: Icon(Icons.place, size: 20, color: Colors.white),
              ),
              hintText: 'SPBU Pelabuhan...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          SizedBox(height: 16),
          TextField(
            controller: _fuelNotesController,
            decoration: InputDecoration(
              labelText: 'Keterangan',
              alignLabelWithHint: true,
              prefixIcon: Padding(
                padding: EdgeInsets.only(bottom: 40),
                child: ShaderMask(
                  shaderCallback: (bounds) => LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  ).createShader(bounds),
                  child: Icon(Icons.notes, size: 20, color: Colors.white),
                ),
              ),
              hintText: 'Catatan tambahan...',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildUploadButton() {
    return Container(
      padding: EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Bukti Pengisian', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          if (_fuelFilePath != null) ...[
            InkWell(
              onTap: () => _showImagePreview(context, _fuelFilePath!),
              child: Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _fuelFilePath!.split('/').last,
                        style: TextStyle(fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(Icons.visibility, color: Colors.blue, size: 20),
                  ],
                ),
              ),
            ),
            SizedBox(height: 12),
          ],
          Row(
            children: [
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton.icon(
                    onPressed: _pickFromCamera,
                    icon: Icon(Icons.camera_alt, color: Colors.white),
                    label: Text('Ambil Foto', style: TextStyle(color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ElevatedButton.icon(
                    onPressed: _pickFromGallery,
                    icon: Icon(Icons.photo_library, color: Colors.white),
                    label: Text('Pilih Dari Galeri', style: TextStyle(color: Colors.white, fontSize: 12)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    bool canLock = _fuelAmountController.text.isNotEmpty &&
        _fuelPriceController.text.isNotEmpty &&
        _fuelFilePath != null;

    return Container(
      width: double.infinity,
      child: Container(
        decoration: BoxDecoration(
          gradient: canLock 
              ? LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: canLock ? null : Colors.grey,
          borderRadius: BorderRadius.circular(12),
          boxShadow: canLock
              ? [
                  BoxShadow(
                    color: Color(0xFF1B4F9C).withOpacity(0.3),
                    blurRadius: 8,
                    offset: Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: ElevatedButton(
          onPressed: canLock && !_isLoading ? _lockData : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            padding: EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isLoading
              ? SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock, size: 24, color: Colors.white),
                    SizedBox(width: 12),
                    Text('LOCK DATA BBM', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ],
                ),
        ),
      ),
    );
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickFromCamera() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
      );
      if (image != null) {
        setState(() => _fuelFilePath = image.path);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengambil foto'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );
      if (image != null) {
        setState(() => _fuelFilePath = image.path);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memilih foto'), backgroundColor: Colors.red),
      );
    }
  }

  void _showImagePreview(BuildContext context, String imagePath) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              title: Text('Preview Foto'),
              automaticallyImplyLeading: false,
              actions: [
                IconButton(
                  icon: Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            InteractiveViewer(
              child: Image.file(File(imagePath)),
            ),
          ],
        ),
      ),
    );
  }


  Future<void> _lockData() async {
    if (_fuelAmountController.text.isEmpty || _fuelPriceController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Jumlah dan harga wajib diisi'), backgroundColor: Colors.red),
      );
      return;
    }

    if (_fuelFilePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Bukti foto wajib diupload'), backgroundColor: Colors.red),
      );
      return;
    }

    // Simpan data sementara dan kembali dengan status locked
    final fuelData = {
      'jenisBahanBakar': _selectedFuelType,
      'jumlahLiter': double.parse(_fuelAmountController.text),
      'hargaPerLiter': double.parse(_fuelPriceController.text),
      'totalHarga': double.parse(_fuelAmountController.text) * double.parse(_fuelPriceController.text),
      'tanggalPengisian': _selectedDate.toIso8601String(),
      'buktiFilePath': _fuelFilePath,
      'lokasiPengisian': _fuelLocationController.text.isNotEmpty ? _fuelLocationController.text : null,
      'keterangan': _fuelNotesController.text.isNotEmpty ? _fuelNotesController.text : null,
      'locked': true,
    };

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Data BBM berhasil di-lock!'), backgroundColor: Colors.green),
    );

    Navigator.pop(context, fuelData);
  }

  @override
  void dispose() {
    _fuelAmountController.removeListener(_calculateTotal);
    _fuelPriceController.removeListener(_calculateTotal);
    _fuelAmountController.dispose();
    _fuelPriceController.dispose();
    _fuelLocationController.dispose();
    _fuelNotesController.dispose();
    super.dispose();
  }
}
