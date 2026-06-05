import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../models/catch_report_model.dart';

class CatchReportDialog extends StatefulWidget {
  const CatchReportDialog({Key? key}) : super(key: key);

  @override
  State<CatchReportDialog> createState() => _CatchReportDialogState();
}

class _CatchReportDialogState extends State<CatchReportDialog> {
  final _formKey = GlobalKey<FormState>();
  
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _depthController = TextEditingController();
  final _totalCatchController = TextEditingController();
  final _fishTypesController = TextEditingController();
  
  String _selectedGearStatus = 'Sedang Diturunkan';
  String _selectedGearType = 'Pancing Ulur';
  
  final List<String> _gearStatusOptions = ['Standby', 'Sedang Diturunkan'];
  final List<String> _gearTypeOptions = ['Pancing Ulur', 'Rawai', 'Jaring Insang', 'Lainnya'];
  
  bool _isLoadingGps = true;

  @override
  void initState() {
    super.initState();
    _fetchCurrentLocation();
  }

  Future<void> _fetchCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      if (mounted) {
        setState(() {
          _latController.text = position.latitude.toString();
          _lngController.text = position.longitude.toString();
          _isLoadingGps = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoadingGps = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mendapatkan lokasi: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _latController.dispose();
    _lngController.dispose();
    _depthController.dispose();
    _totalCatchController.dispose();
    _fishTypesController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      final report = CatchReportModel(
        latitude: double.tryParse(_latController.text) ?? 0.0,
        longitude: double.tryParse(_lngController.text) ?? 0.0,
        depth: double.tryParse(_depthController.text) ?? 0.0,
        gearStatus: _selectedGearStatus,
        gearType: _selectedGearType,
        totalCatch: int.tryParse(_totalCatchController.text) ?? 0,
        fishTypes: _fishTypesController.text,
        timestamp: DateTime.now(),
      );
      
      Navigator.of(context).pop(report);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 20,
        right: 20,
        top: 20,
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Row(
                  children: [
                    Icon(Icons.phishing, color: Color(0xFF1B4F9C)),
                    SizedBox(width: 10),
                    Text(
                      'Pin Lokasi Penangkapan',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B4F9C),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // KOORDINAT GPS
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _latController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Latitude',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          prefixIcon: _isLoadingGps 
                              ? const SizedBox(
                                  width: 16, height: 16, 
                                  child: Padding(
                                    padding: EdgeInsets.all(12.0),
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ))
                              : const Icon(Icons.location_on),
                        ),
                        validator: (value) => value!.isEmpty ? 'Wajib diisi' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _lngController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: InputDecoration(
                          labelText: 'Longitude',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          prefixIcon: _isLoadingGps 
                              ? const SizedBox(
                                  width: 16, height: 16, 
                                  child: Padding(
                                    padding: EdgeInsets.all(12.0),
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  ))
                              : const Icon(Icons.location_on),
                        ),
                        validator: (value) => value!.isEmpty ? 'Wajib diisi' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                // KEDALAMAN
                TextFormField(
                  controller: _depthController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Kedalaman Laut (meter)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    prefixIcon: const Icon(Icons.water),
                  ),
                  validator: (value) => value!.isEmpty ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 16),
                
                // STATUS ALAT PANCING
                DropdownButtonFormField<String>(
                  value: _selectedGearStatus,
                  decoration: InputDecoration(
                    labelText: 'Status Pancing',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    prefixIcon: const Icon(Icons.settings),
                  ),
                  items: _gearStatusOptions.map((status) {
                    return DropdownMenuItem(value: status, child: Text(status));
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedGearStatus = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                
                // JENIS PANCING
                DropdownButtonFormField<String>(
                  value: _selectedGearType,
                  decoration: InputDecoration(
                    labelText: 'Jenis Alat Pancing',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    prefixIcon: const Icon(Icons.build),
                  ),
                  items: _gearTypeOptions.map((type) {
                    return DropdownMenuItem(value: type, child: Text(type));
                  }).toList(),
                  onChanged: (value) {
                    setState(() {
                      _selectedGearType = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                
                // TOTAL TANGKAPAN
                TextFormField(
                  controller: _totalCatchController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: 'Jumlah Tangkapan (Ekor/Kg)',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    prefixIcon: const Icon(Icons.catching_pokemon),
                  ),
                  validator: (value) => value!.isEmpty ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 16),
                
                // JENIS IKAN
                TextFormField(
                  controller: _fishTypesController,
                  decoration: InputDecoration(
                    labelText: 'Jenis Ikan yang Ditangkap',
                    hintText: 'Contoh: Tuna, Cakalang, Tongkol',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    prefixIcon: const Icon(Icons.set_meal),
                  ),
                  validator: (value) => value!.isEmpty ? 'Wajib diisi' : null,
                ),
                const SizedBox(height: 24),
                
                // SUBMIT BUTTON
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B4F9C),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text(
                      'Simpan Lokasi',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


//Animasi untuk FAB Catch Report Pin
class PremiumFAB extends StatefulWidget {
  final VoidCallback onPressed;

  const PremiumFAB({super.key, required this.onPressed});

  @override
  State<PremiumFAB> createState() => _PremiumFABState();
}

class _PremiumFABState extends State<PremiumFAB>
    with TickerProviderStateMixin {

  late AnimationController _floatController;
  late AnimationController _tapController;

  @override
  void initState() {
    super.initState();

    // Floating + glow animation
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    // Tap animation
    _tapController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.9,
      upperBound: 1.0,
      value: 1.0,
    );
  }

  @override
  void dispose() {
    _floatController.dispose();
    _tapController.dispose();
    super.dispose();
  }

  void _onTap() async {
    await _tapController.reverse();
    await _tapController.forward();
    widget.onPressed();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_floatController, _tapController]),
      builder: (context, child) {

        // Floating movement
        double floatY = (_floatController.value * 10) - 5;

        // Glow effect
        double glow = 4 + (_floatController.value * 10);

        return Transform.translate(
          offset: Offset(0, floatY),
          child: Transform.scale(
            scale: _tapController.value,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withOpacity(0.4),
                    blurRadius: glow,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: child,
            ),
          ),
        );
      },
      child: GestureDetector(
        onTap: _onTap,
        child: FloatingActionButton(
          heroTag: 'catchReportPin',
          elevation: 0,
          backgroundColor: const Color(0xFF1B4F9C),
          shape: const CircleBorder(), // 🔥 paksa benar-benar bulat
          onPressed: _onTap, // langsung di sini
          child: const Icon(Icons.phishing, color: Colors.white),
        ),
      ),
    );
  }
}