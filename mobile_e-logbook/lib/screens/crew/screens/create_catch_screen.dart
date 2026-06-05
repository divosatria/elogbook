import 'dart:async';
import 'dart:io';
import 'package:e_logbook/models/catch_model.dart';
import 'package:e_logbook/provider/catch_provider.dart';
import 'package:e_logbook/provider/user_provider.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';
import 'package:e_logbook/services/local/catch_submission_service.dart';
import 'package:e_logbook/services/ai/backend_fish_detection_service.dart';
import 'package:e_logbook/services/api/trip_service.dart';
import 'package:e_logbook/services/api/iot_service.dart';
import 'package:e_logbook/services/cuaca/weather_service.dart';
import 'package:e_logbook/widgets/ai_detection_loading_widget.dart';
import 'package:e_logbook/widgets/ai_detection_result_widget.dart';
import 'package:e_logbook/widgets/image_picker.dart';
import 'package:e_logbook/widgets/section_title.dart';
import 'package:e_logbook/widgets/sync_status_widget.dart';
import 'package:e_logbook/widgets/tracking_minimized_overlay.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';

class CreateCatchScreen extends StatefulWidget {
  final int tripId;
  final bool isNetRetrieval;
  
  const CreateCatchScreen({
    super.key, 
    required this.tripId,
    this.isNetRetrieval = false,
  });

  @override
  State<CreateCatchScreen> createState() => _CreateCatchScreenState();
}

class _CreateCatchScreenState extends State<CreateCatchScreen> {
  final _formKey = GlobalKey<FormState>();
  final _picker = ImagePicker();

  // Controllers
  final _fishNameController = TextEditingController();
  final _weightController = TextEditingController();
  final _quantityController = TextEditingController();
  final _notesController = TextEditingController();
  
  // IoT Data Controller - hanya kilogram dari sensor
  final _iotWeightController = TextEditingController();
  final _estimatedLengthController = TextEditingController();
  final _estimatedHeightController = TextEditingController();
  final _unitWeightController = TextEditingController();

  // State variables
  final List<XFile> _catchImages = [];
  DateTime _catchDate = DateTime.now(); // Tanggal pengambilan
  TimeOfDay _catchTime = TimeOfDay.now(); // Waktu pengambilan
  DateTime _departureDate = DateTime.now();
  TimeOfDay _departureTime = TimeOfDay.now();
  DateTime _arrivalDate = DateTime.now();
  TimeOfDay _arrivalTime = TimeOfDay.now();
  int _calculatedHours = 0;
  int _calculatedMinutes = 0;

  String _selectedCondition = '';
  String _selectedFishType = '';
  String _selectedWeatherCondition = '';
  bool _isLoadingWeather = false;

  // AI Detection
  bool _isDetectingFish = false;
  FishDetectionResult? _detectionResult;
  bool _showDetectionResult = false;

  // Trip Data
  Map<String, dynamic>? _tripData;
  bool _isLoadingTrip = true;

  @override
  void initState() {
    super.initState();
    _loadTripData();
    _loadWeatherData();
  }

  Future<void> _loadTripData() async {
    try {
      debugPrint('\n🔄 ========== LOAD TRIP DATA START ==========');
      debugPrint('🆔 Trip ID: ${widget.tripId}');
      
      // Langsung load trip berdasarkan tripId yang dikirim
      final detailResult = await TripService.getTripDetail(widget.tripId);
      
      if (detailResult['success'] == true && detailResult['data'] != null) {
        final tripDetail = detailResult['data'];
        
        debugPrint('\n✅ Trip data loaded successfully:');
        debugPrint('📦 Trip ID: ${tripDetail['id']}');
        debugPrint('⚓ Kapal Object: ${tripDetail['kapal']}');
        debugPrint('👨✈️ Nahkoda Object: ${tripDetail['nahkoda']}');
        debugPrint('👥 Awak Kapal: ${tripDetail['awakKapal']}');
        debugPrint('🎯 Area Tangkap: ${tripDetail['areaTangkap']}');
        debugPrint('⚓ Harbor Zone: ${tripDetail['harborZone']}');
        
        // Validasi data kapal
        final kapal = tripDetail['kapal'];
        if (kapal == null) {
          debugPrint('❌ Kapal data is null!');
        } else {
          debugPrint('✅ Kapal fields:');
          debugPrint('   - namaKapal: ${kapal['namaKapal']}');
          debugPrint('   - nama: ${kapal['nama']}');
          debugPrint('   - nomorRegistrasi: ${kapal['nomorRegistrasi']}');
          debugPrint('   - nomorKapal: ${kapal['nomorKapal']}');
          debugPrint('   - id: ${kapal['id']}');
        }
        
        safeSetState(() {
          _tripData = tripDetail;
          _isLoadingTrip = false;
          
          if (tripDetail['tanggalBerangkat'] != null) {
            try {
              final departureDateTime = DateTime.parse(tripDetail['tanggalBerangkat']);
              _departureDate = departureDateTime;
              _departureTime = TimeOfDay(hour: departureDateTime.hour, minute: departureDateTime.minute);
            } catch (e) {
              debugPrint('⚠️ Error parsing tanggalBerangkat: $e');
            }
          }
          
          if (tripDetail['estimasiPulang'] != null) {
            try {
              final returnDateTime = DateTime.parse(tripDetail['estimasiPulang']);
              _arrivalDate = returnDateTime;
              _arrivalTime = TimeOfDay(hour: returnDateTime.hour, minute: returnDateTime.minute);
            } catch (e) {
              debugPrint('⚠️ Error parsing estimasiPulang: $e');
            }
          }
          
          _calculateDuration();
        });
        
        debugPrint('✅ ========== LOAD TRIP DATA SUCCESS ==========\n');
      } else {
        debugPrint('❌ Trip data not found or invalid');
        debugPrint('❌ Response: $detailResult');
        safeSetState(() => _isLoadingTrip = false);
        debugPrint('❌ ========== LOAD TRIP DATA FAILED ==========\n');
      }
    } catch (e) {
      debugPrint('❌ Error loading trip data: $e');
      debugPrint('❌ Stack trace: ${StackTrace.current}');
      safeSetState(() => _isLoadingTrip = false);
      debugPrint('❌ ========== LOAD TRIP DATA ERROR ==========\n');
    }
  }

  @override
  void dispose() {
    _fishNameController.dispose();
    _weightController.dispose();
    _quantityController.dispose();
    _notesController.dispose();
    _iotWeightController.dispose();
    _estimatedLengthController.dispose();
    _estimatedHeightController.dispose();
    _unitWeightController.dispose();
    super.dispose();
  }

  void safeSetState(VoidCallback fn) {
    if (!mounted) return;
    setState(fn);
  }

  Future<void> _loadWeatherData() async {
    debugPrint('\n🌤️ ========== WEATHER LOADING START ==========');
    safeSetState(() => _isLoadingWeather = true);
    
    try {
      debugPrint('📍 Getting current position...');
      final position = await Geolocator.getCurrentPosition();
      debugPrint('✅ Position: ${position.latitude}, ${position.longitude}');
      
      debugPrint('🌐 Fetching weather data...');
      final weather = await WeatherService.getWeatherByPosition(position);
      
      if (weather != null && mounted) {
        debugPrint('✅ Weather data received:');
        debugPrint('   Condition: ${weather.condition}');
        debugPrint('   Temperature: ${weather.temperature}°C');
        debugPrint('   Wind: ${weather.windSpeed} km/h');
        debugPrint('   Humidity: ${weather.humidity}%');
        
        String condition = 'Cerah';
        final desc = weather.condition.toLowerCase();
        
        if (desc.contains('hujan') || desc.contains('rain')) {
          condition = 'Hujan';
        } else if (desc.contains('badai') || desc.contains('storm') || desc.contains('thunder')) {
          condition = 'Badai';
        } else if (desc.contains('awan') || desc.contains('cloud')) {
          condition = 'Berawan';
        }
        
        debugPrint('🎯 Mapped condition: $condition');
        
        safeSetState(() {
          _selectedWeatherCondition = condition;
          _isLoadingWeather = false;
        });
        
        debugPrint('✅ Weather loaded successfully: $condition');
        debugPrint('========== WEATHER LOADING SUCCESS ==========\n');
      } else {
        debugPrint('⚠️ Weather data is null');
        throw Exception('Weather data is null');
      }
    } catch (e) {
      debugPrint('❌ Weather load failed: $e');
      debugPrint('📋 Stack trace: ${StackTrace.current}');
      safeSetState(() {
        _selectedWeatherCondition = 'Cerah';
        _isLoadingWeather = false;
      });
      debugPrint('🔄 Fallback to default: Cerah');
      debugPrint('========== WEATHER LOADING FAILED ==========\n');
    }
  }

  // ==================== AI DETECTION ====================
  Future<void> _detectFishFromImage(XFile imageFile) async {
    debugPrint('🔍 Starting AI detection for: ${imageFile.path}');

    safeSetState(() {
      _isDetectingFish = true;
      _showDetectionResult = false;
      _detectionResult = null;
    });

    try {
      debugPrint('📡 Calling Backend AI...');
      final result = await BackendFishDetectionService.detectFish(
        File(imageFile.path),
      ).timeout(const Duration(seconds: 90));

      debugPrint('✅ AI detection successful: ${result.fishName}');

      if (mounted) {
        safeSetState(() {
          _detectionResult = result;
          _isDetectingFish = false;
          _showDetectionResult = true;
        });

        // Show success message
        _showSnackBar('🎉 AI berhasil mendeteksi ikan! Periksa hasil deteksi.');
      }
    } catch (e) {
      debugPrint('❌ AI detection failed: $e');

      if (mounted) {
        safeSetState(() => _isDetectingFish = false);
        
        // Tampilkan error yang lebih detail
        String errorMessage = '⚠️ Deteksi AI gagal.';
        
        if (e.toString().contains('API Key')) {
          errorMessage = '❌ API Key Gemini tidak valid. Hubungi admin.';
        } else if (e.toString().contains('suspended') || e.toString().contains('CONSUMER_SUSPENDED')) {
          errorMessage = '🚫 API Key telah di-suspend oleh Google. Generate API Key baru!';
        } else if (e.toString().contains('Quota')) {
          errorMessage = '⚠️ Quota API habis. Coba lagi nanti.';
        } else if (e.toString().contains('Model tidak ditemukan')) {
          errorMessage = '❌ Model AI tidak ditemukan. Hubungi admin.';
        } else if (e.toString().contains('timeout')) {
          errorMessage = '⏱️ Koneksi timeout. Periksa internet Anda.';
        } else if (e.toString().contains('SocketException')) {
          errorMessage = '🚫 Tidak ada koneksi internet.';
        }
        
        _showSnackBar(errorMessage);
        
        // Tampilkan dialog dengan opsi retry
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.orange),
                SizedBox(width: 8),
                Text('AI Detection Gagal'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(errorMessage),
                SizedBox(height: 12),
                Text(
                  'Anda bisa:\n1. Coba lagi deteksi AI\n2. Isi data manual',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('Isi Manual'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  if (_catchImages.isNotEmpty) {
                    _detectFishFromImage(_catchImages.first);
                  }
                },
                child: Text('Coba Lagi'),
              ),
            ],
          ),
        );
      }
    }
  }

  void _acceptDetectionResult() {
    if (_detectionResult == null) return;

    safeSetState(() {
      // Auto fill form dengan hasil AI
      _fishNameController.text = _detectionResult!.fishName;
      _selectedFishType = _detectionResult!.fishType;
      _selectedCondition = _detectionResult!.condition;
      _unitWeightController.text = _detectionResult!.unitWeight.toStringAsFixed(2);
      _weightController.text = _detectionResult!.estimatedWeight.toString();
      _quantityController.text = _detectionResult!.estimatedQuantity.toString();
      _estimatedLengthController.text = _detectionResult!.estimatedLength
          .toString();
      _estimatedHeightController.text = _detectionResult!.estimatedHeight
          .toString();

      _showDetectionResult = false;
    });

    _showSnackBar('✅ Data AI berhasil diterapkan!');
  }

  void _retryDetection() {
    if (_catchImages.isNotEmpty) {
      _detectFishFromImage(_catchImages.first);
    }
  }

  Future<void> _pickImage(ImageSource source) async {
    // OPTIMAL settings untuk AI detection
    final XFile? pickedFile = await _picker.pickImage(
      source: source,
      imageQuality: 85, // ✅ OPTIMAL: Balance quality & size
      maxWidth: 1920, // ✅ OPTIMAL: Full HD sufficient
      maxHeight: 1920, // ✅ OPTIMAL: Full HD sufficient
      preferredCameraDevice: CameraDevice.rear,
    );

    if (pickedFile != null) {
      // Optional: Show file size for debugging
      final file = File(pickedFile.path);
      final fileSize = await file.length();
      final fileSizeMB = (fileSize / (1024 * 1024)).toStringAsFixed(2);

      debugPrint('📸 Image captured: ${fileSizeMB}MB');

      safeSetState(() => _catchImages.add(pickedFile));

      _showSnackBar('📸 Foto berhasil diambil! Tekan tombol AI untuk deteksi ikan.');
    }
  }

  void _removeImage(int index) {
    safeSetState(() => _catchImages.removeAt(index));
  }

  void _showSnackBar(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ==================== VALIDATION ====================
  bool _validateForm() {
    if (!_formKey.currentState!.validate()) {
      _showSnackBar('⚠️ Mohon lengkapi semua field yang wajib diisi!');
      return false;
    }

    if (_fishNameController.text.trim().isEmpty) {
      _showSnackBar('⚠️ Nama ikan harus diisi!');
      return false;
    }

    if (_weightController.text.trim().isEmpty ||
        (double.tryParse(_weightController.text) ?? 0) <= 0) {
      _showSnackBar('⚠️ Berat ikan harus diisi dan lebih dari 0!');
      return false;
    }

    if (_catchImages.isEmpty) {
      _showSnackBar('⚠️ Minimal upload 1 foto tangkapan ikan!');
      return false;
    }
    
    // Validasi: AI detection OPTIONAL - User bisa input manual
    // Uncomment jika AI sudah tersedia
    // if (_detectionResult == null) {
    //   _showSnackBar('⚠️ Silakan lakukan deteksi AI terlebih dahulu!');
    //   return false;
    // }

    if (_calculatedHours == 0 && _calculatedMinutes == 0) {
      _showSnackBar('⚠️ Silakan atur waktu keberangkatan & kedatangan!');
      return false;
    }

    return true;
  }

  // ==================== SAVE CATCH ====================
  void _saveCatch() async {
    debugPrint('\n📦 ========== SAVE CATCH START ==========');
    
    if (!_validateForm()) {
      debugPrint('❌ Validation failed');
      return;
    }

    // CRITICAL: Trip data HARUS ada, tidak boleh fallback
    if (_tripData == null) {
      debugPrint('❌ [CATCH] No trip data available');
      _showSnackBar('⚠️ Data trip tidak ditemukan. Tidak dapat menyimpan tangkapan.');
      return;
    }

    debugPrint('\n📦 [CATCH] Using trip data');
    final kapal = _tripData!['kapal'];
    final nahkoda = _tripData!['nahkoda'];
    final awakKapal = _tripData!['awakKapal'] as List?;
    
    debugPrint('⚓ [CATCH] kapal object: $kapal');
    debugPrint('👨✈️ [CATCH] nahkoda object: $nahkoda');
    debugPrint('👥 [CATCH] awakKapal: $awakKapal');
    
    // Validasi kapal object
    if (kapal == null) {
      debugPrint('❌ [CATCH] kapal is NULL!');
      _showSnackBar('⚠️ Data kapal tidak ditemukan. Hubungi admin.');
      return;
    }
    
    // Mapping field yang konsisten dengan _buildVesselInfoCard
    final vesselName = kapal['namaKapal'] ?? kapal['nama'] ?? kapal['name'] ?? 'Unknown';
    final vesselNumber = kapal['nomorRegistrasi'] ?? kapal['nomorKapal'] ?? kapal['registrationNumber'] ?? 'Unknown';
    final captainName = nahkoda != null ? (nahkoda['nama'] ?? nahkoda['username'] ?? nahkoda['name'] ?? 'Unknown') : 'Unknown';
    final crewCount = awakKapal?.length ?? 0;
    final kapalId = _tripData!['kapalId'] ?? kapal['id'] ?? 0;
    
    // Validasi kapalId
    if (kapalId == 0) {
      debugPrint('❌ [CATCH] Invalid kapalId');
      _showSnackBar('⚠️ ID kapal tidak valid. Hubungi admin.');
      return;
    }
    
    debugPrint('⚓ [CATCH] Vessel: $vesselName');
    debugPrint('🆔 [CATCH] Vessel Number: $vesselNumber');
    debugPrint('👨✈️ [CATCH] Captain: $captainName');
    debugPrint('👥 [CATCH] Crew: $crewCount');
    debugPrint('🆔 [CATCH] Kapal ID: $kapalId');
    
    // Validasi semua field penting
    if (vesselName == 'Unknown') {
      debugPrint('⚠️ [CATCH] WARNING: Vessel name is Unknown!');
    }
    if (vesselNumber == 'Unknown') {
      debugPrint('⚠️ [CATCH] WARNING: Vessel number is Unknown!');
    }
    if (captainName == 'Unknown') {
      debugPrint('⚠️ [CATCH] WARNING: Captain name is Unknown!');
    }
    
    debugPrint('\n📦 [CATCH] Final vessel info:');
    debugPrint('⚓ Vessel: $vesselName');
    debugPrint('🆔 Kapal ID: $kapalId');
    debugPrint('👥 Crew: $crewCount');

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Center(
        child: Card(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Mengirim data ke IoT...'),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      // Data mentah tangkapan (perhitungan di backend)
      final weight = double.tryParse(_weightController.text) ?? 0;

      // Ambil data dari trip - field yang benar adalah areaTangkap
      final areaTangkap = _tripData?['areaTangkap'];
      final zonaTangkap = areaTangkap != null 
          ? (areaTangkap['nama'] ?? areaTangkap['zona'] ?? 'WPP-NRI')
          : 'WPP-NRI';
      
      // Pelabuhan bisa dari harborZone atau field lain
      final harborZone = _tripData?['harborZone'];
      final pelabuhan = harborZone != null
          ? (harborZone['nama'] ?? harborZone['name'] ?? 'Tidak diketahui')
          : (_tripData?['pelabuhan'] ?? 'Tidak diketahui');
      
      debugPrint('\n📍 [CATCH] Trip location data:');
      debugPrint('🎯 Area tangkap object: $areaTangkap');
      debugPrint('🎯 Zona tangkap: $zonaTangkap');
      debugPrint('⚓ Harbor zone object: $harborZone');
      debugPrint('⚓ Pelabuhan: $pelabuhan');

      // Get current GPS location
      Position? currentPosition;
      try {
        currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        );
        debugPrint('📍 [CATCH] GPS: ${currentPosition.latitude}, ${currentPosition.longitude}');
      } catch (e) {
        debugPrint('⚠️ [CATCH] GPS error: $e, using 0,0');
      }

      // Buat data catch untuk submission (data mentah, perhitungan di backend)
      final catchId = DateTime.now().millisecondsSinceEpoch.toString();
      
      // Gabungkan tanggal dan waktu pengambilan
      final catchDateTime = DateTime(
        _catchDate.year,
        _catchDate.month,
        _catchDate.day,
        _catchTime.hour,
        _catchTime.minute,
      );
      
      final catchData = {
        'id': catchId,
        'fish_name': _fishNameController.text,
        'fish_type': _selectedFishType,
        'weight': weight,
        'quantity': int.tryParse(_quantityController.text) ?? 0,
        'condition': _selectedCondition,
        'crew_count': crewCount,
        'catch_date': catchDateTime.toIso8601String(), // Tanggal & waktu pengambilan
        'departure_date': _departureDate.toIso8601String().split('T')[0],
        'departure_time': _departureTime.format(context),
        'arrival_date': _arrivalDate.toIso8601String().split('T')[0],
        'arrival_time': _arrivalTime.format(context),
        'trip_duration_hours': _calculatedHours,
        'trip_duration_minutes': _calculatedMinutes,
        'fishing_zone': zonaTangkap,
        'location_name': pelabuhan,
        'latitude': currentPosition?.latitude ?? 0.0,
        'longitude': currentPosition?.longitude ?? 0.0,
        'water_depth': 0.0,
        'weather_condition': _selectedWeatherCondition,
        'notes': _notesController.text.isEmpty ? null : _notesController.text,
        'kapalId': kapalId,
        'tripId': _tripData?['id'],
        // ✅ TAMBAHAN: Data IoT dari sensor (jika ada)
        'iot_weight': _iotWeightController.text.isNotEmpty 
            ? double.tryParse(_iotWeightController.text) ?? 0.0 
            : null,
        // Extra fields for local storage
        'vesselName': vesselName,
        'vesselNumber': vesselNumber,
        'captainName': captainName,
        'createdAt': DateTime.now().toIso8601String(),
      };
      
      debugPrint('📦 Catch data to submit:');
      debugPrint('  fish_name: ${catchData['fish_name']}');
      debugPrint('  catch_date: ${catchData['catch_date']}');
      debugPrint('  weight: ${catchData['weight']}');
      debugPrint('  iot_weight: ${catchData['iot_weight']}');  // ✅ Log IoT weight
      debugPrint('  kapalId: ${catchData['kapalId']}');
      debugPrint('  tripId: ${catchData['tripId']}');
      debugPrint('  fishing_zone: ${catchData['fishing_zone']}');
      debugPrint('  location_name: ${catchData['location_name']}');
      debugPrint('  weather_condition: ${catchData['weather_condition']}');

      // STEP 1: Kirim data IoT dari sensor (jika ada)
      debugPrint('\n📡 [STEP 1] Sending IoT sensor data...');
      if (_iotWeightController.text.isNotEmpty) {
        try {
          final iotData = {
            ...catchData,
            'iot_data': double.tryParse(_iotWeightController.text) ?? 0.0,
          };
          
          final iotResult = await IoTService.sendToIoT(catchData: iotData);
          
          if (iotResult['success']) {
            debugPrint('✅ [STEP 1] IoT sensor data sent successfully');
          } else {
            debugPrint('⚠️ [STEP 1] IoT failed (continuing anyway): ${iotResult['message']}');
          }
        } catch (e) {
          debugPrint('⚠️ [STEP 1] IoT error (continuing anyway): $e');
        }
      } else {
        debugPrint('ℹ️ [STEP 1] No IoT sensor data to send');
      }
      
      // Update loading message
      if (mounted) {
        Navigator.pop(context);
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => Center(
            child: Card(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Mengirim data tangkapan...'),
                  ],
                ),
              ),
            ),
          ),
        );
      }

      // STEP 2: Submit catch dengan offline fallback
      debugPrint('\n📤 [STEP 2] Submitting catch data...');
      debugPrint('📷 [CATCH] Image path: ${_catchImages[0].path}');
      
      final result = await CatchSubmissionService.submitCatch(
        catchData: catchData,
        imageFile: File(_catchImages[0].path),  // Foto hasil deteksi AI
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      // Show result
      if (mounted) {
        final bgColor = result.success 
            ? (result.isOffline ? Colors.orange : Colors.green)
            : Colors.red;
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: bgColor,
            duration: Duration(seconds: result.success ? 3 : 5),
            action: !result.success && result.error != null
                ? SnackBarAction(
                    label: 'Detail',
                    textColor: Colors.white,
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: Text('❌ Error Detail'),
                          content: Text(result.error!),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(context),
                              child: Text('OK'),
                            ),
                          ],
                        ),
                      );
                    },
                  )
                : null,
          ),
        );
      }

      // Update provider dengan status sync
      if (result.success && mounted) {
        final newCatch = CatchModel(
          id: int.tryParse(catchId),
          fishName: _fishNameController.text,
          fishType: _selectedFishType,
          weight: weight,
          quantity: int.tryParse(_quantityController.text) ?? 0,
          condition: _selectedCondition,
          photoPath: _catchImages[0].path,
          vesselName: vesselName,
          vesselNumber: vesselNumber,
          captainName: captainName,
          crewCount: crewCount,
          pricePerKg: 0, // Dihitung di backend
          totalRevenue: 0, // Dihitung di backend
          departureDate: _departureDate,
          departureTime: _departureTime.format(context),
          arrivalDate: _arrivalDate,
          arrivalTime: _arrivalTime.format(context),
          tripDurationHours: _calculatedHours,
          tripDurationMinutes: _calculatedMinutes,
          fishingZone: zonaTangkap,
          locationName: pelabuhan,
          latitude: currentPosition?.latitude ?? 0.0,
          longitude: currentPosition?.longitude ?? 0.0,
          waterDepth: 0.0,
          weatherCondition: _selectedWeatherCondition,
          fuelCost: 0, // Dihitung di backend
          operationalCost: 0, // Dihitung di backend
          tax: 0, // Dihitung di backend
          totalCost: 0, // Dihitung di backend
          netProfit: 0, // Dihitung di backend
          notes: _notesController.text.isEmpty ? null : _notesController.text,
          syncStatus: result.isOffline ? 'pending' : 'synced',
          lastSyncAttempt: DateTime.now(),
        );

        Provider.of<CatchProvider>(context, listen: false).addCatch(newCatch);
        Navigator.pop(context, {
          'success': true,
          'catchData': catchData,
        });
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Gagal menyimpan: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        // Allow both Nahkoda and Crew to access catch management
        return Stack(
          children: [
            _buildCreateCatchScreen(context),
            // Tampilkan overlay minimized jika tracking aktif
            Consumer<TrackingMinimizeProvider>(
              builder: (context, trackingProvider, child) {
                if (trackingProvider.isTrackingActive && trackingProvider.isMinimized) {
                  return TrackingMinimizedOverlay();
                }
                return SizedBox.shrink();
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildCreateCatchScreen(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final width = size.width;
    final isTablet = width >= 600;

    // Responsive scaling dengan batasan untuk tablet
    double fs(double size) {
      if (isTablet) {
        // Untuk tablet, gunakan scaling yang lebih konservatif
        return (size * (width / 768)).clamp(size * 0.9, size * 1.3);
      }
      // Untuk mobile
      return (size * (width / 390)).clamp(size * 0.8, size * 1.2);
    }
    
    double sp(double size) {
      if (isTablet) {
        // Untuk tablet, spacing lebih besar
        return (size * (width / 768)).clamp(size, size * 1.5);
      }
      // Untuk mobile
      return (size * (width / 390)).clamp(size * 0.8, size * 1.2);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Catat Tangkapan Baru',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: fs(18),
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(sp(16)),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // SYNC STATUS WIDGET
              SyncStatusWidget(),

              // INFORMASI KAPAL DARI PROFIL
              SectionTitle(
                title: 'Informasi Kapal',
                icon: Icons.directions_boat,
              ),
              SizedBox(height: sp(12)),
              _buildVesselInfoCard(sp, fs),

              SizedBox(height: sp(24)),

              // TANGGAL & WAKTU PENGAMBILAN
              SectionTitle(
                title: 'Tanggal & Waktu Pengambilan',
                icon: Icons.event,
              ),
              SizedBox(height: sp(12)),
              _buildCatchDateTimeSection(sp, fs),

              SizedBox(height: sp(24)),

              // WAKTU KEBERANGKATAN & KEDATANGAN
              SectionTitle(
                title: 'Waktu Perjalanan',
                icon: Icons.schedule,
              ),
              SizedBox(height: sp(12)),
              _buildTripTimeSection(sp, fs),

              SizedBox(height: sp(24)),

              // INFORMASI HASIL TANGKAPAN (AI DETECTION)
              Row(
                children: [
                  Image.asset(
                    'assets/icons/icon_ai.png',
                    width: fs(22),
                    height: fs(22),
                    color: Color(0xFF1B4F9C),
                  ),
                  SizedBox(width: sp(8)),
                  Expanded(
                    child: Text(
                      'Hasil Tangkapan Dengan AI Detection',
                      style: TextStyle(
                        fontSize: fs(18),
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B4F9C),
                      ),
                    ),
                  ),
                ],
              ),
              SizedBox(height: sp(12)),

              _buildFishInfoSection(sp),

              SizedBox(height: sp(24)),

              // FOTO TANGKAPAN & AI DETECTION
              Row(
                children: [
                  Icon(
                    Icons.camera_enhance,
                    color: Color(0xFF1B4F9C),
                    size: fs(22),
                  ),
                  SizedBox(width: sp(6)),
                  Expanded(
                    child: Text(
                      'Upload Foto Hasil Tangkapan',
                      style: TextStyle(
                        fontSize: fs(18),
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B4F9C),
                      ),
                    ),
                  ),
                  SizedBox(width: sp(4)),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: sp(6),
                      vertical: sp(3),
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade100,
                      borderRadius: BorderRadius.circular(sp(10)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.asset(
                          'assets/icons/icon_ai.png',
                          width: 12,
                          height: 12,
                          color: Colors.blue.shade700,
                        ),
                        SizedBox(width: sp(3)),
                        Text(
                          'AI',
                          style: TextStyle(
                            fontSize: fs(9),
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: sp(12)),

              // AI Detection Loading
              if (_isDetectingFish) const AIDetectionLoadingWidget(),

              // AI Detection Result
              if (_showDetectionResult && _detectionResult != null)
                AIDetectionResultWidget(
                  result: _detectionResult!,
                  onAccept: _acceptDetectionResult,
                  onRetry: _retryDetection,
                ),

              // Image Picker
              ImagePickerWidget(
                images: _catchImages,
                onPickImage: _pickImage,
                onRemoveImage: _removeImage,
              ),

              // Manual AI Detection Button
              if (_catchImages.isNotEmpty &&
                  !_isDetectingFish &&
                  !_showDetectionResult)
                Padding(
                  padding: EdgeInsets.only(top: sp(12)),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _detectFishFromImage(_catchImages.first),
                      icon: Image.asset(
                        'assets/icons/icon_ai.png',
                        width: 16,
                        height: 16,
                      ),
                      label: const Text('Deteksi Ikan dengan AI'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.blue.shade700,
                        side: BorderSide(color: Colors.blue.shade300),
                        padding: EdgeInsets.symmetric(vertical: sp(12)),
                      ),
                    ),
                  ),
                ),

              SizedBox(height: sp(24)),

              // LOKASI & CUACA (AUTO DARI TRIP)
              SectionTitle(
                title: 'Lokasi & Kondisi',
                icon: Icons.location_on,
              ),
              SizedBox(height: sp(12)),
              _buildLocationWeatherSection(sp, fs),

              SizedBox(height: sp(24)),

              // DATA IoT DARI SENSOR
              SectionTitle(
                title: 'Data Sensor IoT (Opsional)',
                icon: Icons.sensors,
              ),
              SizedBox(height: sp(12)),
              _buildIoTSensorSection(sp, fs),

              SizedBox(height: sp(24)),

              // TOMBOL KIRIM
              SizedBox(
                width: double.infinity,
                height: sp(56),
                child: ElevatedButton.icon(
                  onPressed: _saveCatch,
                  icon: Icon(Icons.send_rounded, size: fs(20)),
                  label: Text(
                    'Kirim Data Tangkapan',
                    style: TextStyle(
                      fontSize: fs(16),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1B4F9C),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(sp(16)),
                    ),
                    elevation: 3,
                  ),
                ),
              ),
              SizedBox(height: sp(20)),
            ],
          ),
        ),
      ),
    );
  }

  // ==================== BUILD WIDGETS ====================

  Widget _buildVesselInfoCard(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    if (_isLoadingTrip) {
      return Container(
        padding: EdgeInsets.all(sp(16)),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(sp(12)),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: Center(
          child: Column(
            children: [
              CircularProgressIndicator(),
              SizedBox(height: sp(12)),
              Text('Memuat data trip...', style: TextStyle(color: Colors.grey[600])),
            ],
          ),
        ),
      );
    }

    // CRITICAL: Harus ada trip data, tidak boleh fallback ke UserProvider
    if (_tripData == null) {
      debugPrint('❌ [VESSEL_INFO] _tripData is NULL!');
      return Container(
        padding: EdgeInsets.all(sp(16)),
        decoration: BoxDecoration(
          color: Colors.red[50],
          borderRadius: BorderRadius.circular(sp(12)),
          border: Border.all(color: Colors.red[300]!),
        ),
        child: Column(
          children: [
            Icon(Icons.error_outline, color: Colors.red[700], size: fs(40)),
            SizedBox(height: sp(12)),
            Text(
              'Data Trip Tidak Ditemukan',
              style: TextStyle(
                color: Colors.red[700],
                fontWeight: FontWeight.bold,
                fontSize: fs(16),
              ),
            ),
            SizedBox(height: sp(8)),
            Text(
              'Tidak dapat memuat informasi kapal dari trip yang ditugaskan',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.red[600], fontSize: fs(12)),
            ),
            SizedBox(height: sp(12)),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: Icon(Icons.arrow_back, size: fs(16)),
              label: Text('Kembali'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red[700],
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      );
    }

    debugPrint('\n📋 [VESSEL_INFO] Building vessel card...');
    debugPrint('📦 _tripData keys: ${_tripData!.keys.toList()}');
    
    // Ambil data kapal dari trip dengan mapping yang konsisten
    final kapal = _tripData!['kapal'];
    final nahkoda = _tripData!['nahkoda'];
    final awakKapal = _tripData!['awakKapal'] as List?;

    debugPrint('⚓ kapal object: $kapal');
    debugPrint('👨✈️ nahkoda object: $nahkoda');
    debugPrint('👥 awakKapal: $awakKapal');

    // Validasi kapal object
    if (kapal == null) {
      debugPrint('❌ [VESSEL_INFO] kapal is NULL!');
      return Container(
        padding: EdgeInsets.all(sp(16)),
        decoration: BoxDecoration(
          color: Colors.orange[50],
          borderRadius: BorderRadius.circular(sp(12)),
          border: Border.all(color: Colors.orange[300]!),
        ),
        child: Column(
          children: [
            Icon(Icons.warning_amber, color: Colors.orange[700], size: fs(40)),
            SizedBox(height: sp(12)),
            Text(
              'Data Kapal Tidak Lengkap',
              style: TextStyle(
                color: Colors.orange[700],
                fontWeight: FontWeight.bold,
                fontSize: fs(16),
              ),
            ),
            SizedBox(height: sp(8)),
            Text(
              'Informasi kapal tidak tersedia dalam trip ini',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.orange[600], fontSize: fs(12)),
            ),
          ],
        ),
      );
    }

    // Mapping field yang konsisten - coba semua kemungkinan field
    final vesselName = kapal['namaKapal'] ?? kapal['nama'] ?? kapal['name'] ?? 'Unknown';
    final vesselNumber = kapal['nomorRegistrasi'] ?? kapal['nomorKapal'] ?? kapal['registrationNumber'] ?? 'Unknown';
    final captainName = nahkoda != null ? (nahkoda['nama'] ?? nahkoda['username'] ?? nahkoda['name'] ?? 'Unknown') : 'Unknown';
    final crewCount = awakKapal?.length ?? 0;

    debugPrint('\n📋 [VESSEL_INFO] Extracted data:');
    debugPrint('⚓ Vessel Name: $vesselName');
    debugPrint('🆔 Vessel Number: $vesselNumber');
    debugPrint('👨✈️ Captain: $captainName');
    debugPrint('👥 Crew Count: $crewCount');

    return _buildVesselCardContent(sp, fs,
      vesselName: vesselName,
      vesselNumber: vesselNumber,
      captainName: captainName,
      crewCount: crewCount,
    );
  }

  Widget _buildVesselCardContent(
    double Function(double) sp,
    double Function(double) fs, {
    required String vesselName,
    required String vesselNumber,
    required String captainName,
    required int crewCount,
  }) {
    // Get user info from provider
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final userId = userProvider.user?.id ?? 0;
    final userRole = userProvider.user?.role ?? 'ABK';
    
    debugPrint('\n📋 [VESSEL_INFO_CARD]');
    debugPrint('⚓ Vessel Name: $vesselName');
    debugPrint('🆔 Vessel Number: $vesselNumber');
    debugPrint('👨✈️ Captain: $captainName');
    debugPrint('👥 Crew Count: $crewCount');
    debugPrint('🆔 User ID: $userId');
    debugPrint('👤 User Role: $userRole');
    
    return Container(
          padding: EdgeInsets.all(sp(16)),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Color(0xFF1B4F9C).withOpacity(0.1),
                Color(0xFF2563EB).withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(sp(12)),
            border: Border.all(color: Color(0xFF1B4F9C).withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(sp(8)),
                    decoration: BoxDecoration(
                      color: Color(0xFF1B4F9C),
                      borderRadius: BorderRadius.circular(sp(8)),
                    ),
                    child: Icon(
                      Icons.directions_boat,
                      color: Colors.white,
                      size: fs(20),
                    ),
                  ),
                  SizedBox(width: sp(12)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          vesselName,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: fs(16),
                            color: Color(0xFF1B4F9C),
                          ),
                        ),
                        Text(
                          'No. $vesselNumber',
                          style: TextStyle(
                            fontSize: fs(12),
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: sp(8),
                      vertical: sp(4),
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(sp(12)),
                      border: Border.all(color: Colors.green.withOpacity(0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: Colors.green[700],
                          size: fs(14),
                        ),
                        SizedBox(width: sp(4)),
                        Text(
                          'Aktif',
                          style: TextStyle(
                            fontSize: fs(11),
                            fontWeight: FontWeight.bold,
                            color: Colors.green[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              SizedBox(height: sp(16)),
              Divider(height: 1, color: Colors.grey[300]),
              SizedBox(height: sp(16)),

              // Info Grid
              Row(
                children: [
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.person_outline,
                      label: 'Nahkoda',
                      value: captainName,
                      sp: sp,
                      fs: fs,
                    ),
                  ),
                  SizedBox(width: sp(16)),
                  Expanded(
                    child: _buildInfoItem(
                      icon: Icons.groups_outlined,
                      label: 'Jumlah ABK',
                      value: '$crewCount orang',
                      sp: sp,
                      fs: fs,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
    required double Function(double) sp,
    required double Function(double) fs,
  }) {
    return Container(
      padding: EdgeInsets.all(sp(12)),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.7),
        borderRadius: BorderRadius.circular(sp(8)),
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: fs(16), color: Color(0xFF1B4F9C)),
              SizedBox(width: sp(6)),
              Text(
                label,
                style: TextStyle(
                  fontSize: fs(11),
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          SizedBox(height: sp(6)),
          Text(
            value,
            style: TextStyle(
              fontSize: fs(13),
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildFishInfoSection(double Function(double) sp) {
    return Column(
      children: [
        // Special Fish Name Field
        TextFormField(
          controller: _fishNameController,
          readOnly: _detectionResult != null,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: _fishNameController.text.isNotEmpty
                ? Colors.blue[800]
                : Colors.grey[600],
          ),
          decoration: InputDecoration(
            labelText: 'Nama Ikan (AI)',
            hintText: _fishNameController.text.isEmpty ? 'Nama Ikan' : null,
            prefixIcon: Icon(Icons.set_meal, color: Colors.blue[600]),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(
                width: 2,
                color: _fishNameController.text.isNotEmpty
                    ? Colors.blue[600]!
                    : Colors.blue.withOpacity(0.3),
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(
                width: 2,
                color: _fishNameController.text.isNotEmpty
                    ? Colors.blue[600]!
                    : Colors.blue.withOpacity(0.3),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.blue[600]!, width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        SizedBox(height: sp(16)),

        // Jenis Ikan Field - Format seperti TextFormField
        TextFormField(
          readOnly: true,
          decoration: InputDecoration(
            labelText: _selectedFishType.isNotEmpty ? 'Jenis Ikan' : null,
            hintText: _selectedFishType.isEmpty ? 'Jenis Ikan' : null,
            prefixIcon: Icon(Icons.category, color: Color(0xFF1B4F9C)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
          controller: TextEditingController(text: _selectedFishType),
        ),

        SizedBox(height: sp(16)),

        // Kondisi Kesegaran Field - Format seperti TextFormField
        TextFormField(
          readOnly: true,
          decoration: InputDecoration(
            labelText: _selectedCondition.isNotEmpty
                ? 'Kondisi Kesegaran'
                : null,
            hintText: _selectedCondition.isEmpty ? 'Kondisi Kesegaran' : null,
            prefixIcon: Icon(Icons.health_and_safety, color: Color(0xFF1B4F9C)),
            suffixIcon: _selectedCondition.isNotEmpty
                ? Container(
                    margin: EdgeInsets.all(sp(12)),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _getConditionColor(),
                      shape: BoxShape.circle,
                    ),
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
          controller: TextEditingController(text: _selectedCondition),
        ),

        SizedBox(height: sp(16)),

        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _unitWeightController,
                readOnly: true,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Berat/Ikan',
                  hintText: '0.0',
                  prefixIcon: Icon(Icons.scale_rounded, color: Color(0xFF1B4F9C)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: EdgeInsets.symmetric(horizontal: sp(12), vertical: sp(14)),
                ),
              ),
            ),
            SizedBox(width: sp(8)),
            Expanded(
              child: TextFormField(
                controller: _weightController,
                readOnly: _detectionResult != null, // Lock jika sudah ada hasil AI
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Total (kg)',
                  hintText: '0.0',
                  prefixIcon: Icon(Icons.scale_rounded, color: Color(0xFF1B4F9C)),
                  suffixIcon: _detectionResult != null 
                      ? Icon(Icons.lock, size: 16, color: Colors.grey)
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                  ),
                  filled: true,
                  fillColor: _detectionResult != null ? Colors.grey[100] : Colors.white,
                  contentPadding: EdgeInsets.symmetric(horizontal: sp(12), vertical: sp(14)),
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: sp(16)),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _estimatedHeightController,
                readOnly: true,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Tinggi (cm)',
                  hintText: '0.0',
                  prefixIcon: Icon(Icons.height, color: Color(0xFF1B4F9C)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: EdgeInsets.symmetric(horizontal: sp(12), vertical: sp(14)),
                ),
              ),
            ),
            SizedBox(width: sp(8)),
            Expanded(
              child: TextFormField(
                controller: _estimatedLengthController,
                readOnly: true,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Panjang (cm)',
                  hintText: '0.0',
                  prefixIcon: Icon(Icons.straighten, color: Color(0xFF1B4F9C)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(sp(12)),
                    borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                  contentPadding: EdgeInsets.symmetric(horizontal: sp(12), vertical: sp(14)),
                ),
              ),
            ),
          ],
        ),
        SizedBox(height: sp(16)),
        TextFormField(
          controller: _quantityController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: 'Jumlah Ikan',
            hintText: '0',
            prefixIcon: Icon(Icons.format_list_numbered, color: Color(0xFF1B4F9C)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
      ],
    );
  }

  Color _getConditionColor() {
    switch (_selectedCondition) {
      case 'Segar':
        return Colors.green;
      case 'Cukup Segar':
        return Colors.orange;
      case 'Kurang Segar':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildCatchDateTimeSection(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Kapan ikan ini ditangkap?',
            style: TextStyle(
              fontSize: fs(13),
              color: Colors.grey[700],
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(height: sp(12)),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: _catchDate,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (date != null) {
                      setState(() => _catchDate = date);
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Tanggal Tangkap',
                      prefixIcon: Icon(Icons.calendar_today, color: Color(0xFF1B4F9C)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(sp(12)),
                      ),
                    ),
                    child: Text(
                      '${_catchDate.day}/${_catchDate.month}/${_catchDate.year}',
                      style: TextStyle(fontSize: fs(14)),
                    ),
                  ),
                ),
              ),
              SizedBox(width: sp(8)),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: _catchTime,
                    );
                    if (time != null) {
                      setState(() => _catchTime = time);
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Jam Tangkap',
                      prefixIcon: Icon(Icons.access_time, color: Color(0xFF1B4F9C)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(sp(12)),
                      ),
                    ),
                    child: Text(
                      _catchTime.format(context),
                      style: TextStyle(fontSize: fs(14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: sp(12)),
          Container(
            padding: EdgeInsets.all(sp(10)),
            decoration: BoxDecoration(
              color: Colors.blue[50],
              borderRadius: BorderRadius.circular(sp(8)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue[700], size: fs(16)),
                SizedBox(width: sp(8)),
                Expanded(
                  child: Text(
                    'Pilih tanggal dan waktu saat ikan ditangkap',
                    style: TextStyle(
                      fontSize: fs(11),
                      color: Colors.blue[700],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripTimeSection(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Tanggal Berangkat',
                    prefixIcon: Icon(Icons.calendar_today, color: Colors.grey),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(sp(12)),
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  child: Text(
                    '${_departureDate.day}/${_departureDate.month}/${_departureDate.year}',
                    style: TextStyle(fontSize: fs(14), color: Colors.grey[700]),
                  ),
                ),
              ),
              SizedBox(width: sp(8)),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: _departureTime,
                    );
                    if (time != null) {
                      setState(() => _departureTime = time);
                      _calculateDuration();
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Jam Berangkat',
                      prefixIcon: Icon(Icons.access_time, color: Color(0xFF1B4F9C)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(sp(12)),
                      ),
                    ),
                    child: Text(
                      _departureTime.format(context),
                      style: TextStyle(fontSize: fs(14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: sp(12)),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: _arrivalDate,
                      firstDate: _departureDate,
                      lastDate: DateTime.now().add(Duration(days: 365)),
                    );
                    if (date != null) {
                      setState(() => _arrivalDate = date);
                      _calculateDuration();
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Tanggal Kembali',
                      prefixIcon: Icon(Icons.calendar_today, color: Color(0xFF1B4F9C)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(sp(12)),
                      ),
                    ),
                    child: Text(
                      '${_arrivalDate.day}/${_arrivalDate.month}/${_arrivalDate.year}',
                      style: TextStyle(fontSize: fs(14)),
                    ),
                  ),
                ),
              ),
              SizedBox(width: sp(8)),
              Expanded(
                child: InkWell(
                  onTap: () async {
                    final time = await showTimePicker(
                      context: context,
                      initialTime: _arrivalTime,
                    );
                    if (time != null) {
                      setState(() => _arrivalTime = time);
                      _calculateDuration();
                    }
                  },
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Jam Kembali',
                      prefixIcon: Icon(Icons.access_time, color: Color(0xFF1B4F9C)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(sp(12)),
                      ),
                    ),
                    child: Text(
                      _arrivalTime.format(context),
                      style: TextStyle(fontSize: fs(14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_calculatedHours > 0 || _calculatedMinutes > 0) ...[
            SizedBox(height: sp(12)),
            Container(
              padding: EdgeInsets.all(sp(12)),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(sp(8)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.timer, color: Colors.blue[700], size: fs(18)),
                  SizedBox(width: sp(8)),
                  Text(
                    _calculatedHours >= 24
                        ? 'Durasi: ${(_calculatedHours / 24).floor()} hari ${_calculatedHours % 24} jam ${_calculatedMinutes} menit'
                        : 'Durasi: $_calculatedHours jam $_calculatedMinutes menit',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.blue[700],
                      fontSize: fs(14),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _calculateDuration() {
    final departure = DateTime(
      _departureDate.year,
      _departureDate.month,
      _departureDate.day,
      _departureTime.hour,
      _departureTime.minute,
    );
    final arrival = DateTime(
      _arrivalDate.year,
      _arrivalDate.month,
      _arrivalDate.day,
      _arrivalTime.hour,
      _arrivalTime.minute,
    );
    final duration = arrival.difference(departure);
    setState(() {
      _calculatedHours = duration.inHours;
      _calculatedMinutes = duration.inMinutes.remainder(60);
    });
  }

  Widget _buildLocationWeatherSection(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    // Ambil dari areaTangkap object
    final areaTangkap = _tripData?['areaTangkap'];
    final zonaTangkap = areaTangkap != null 
        ? (areaTangkap['nama'] ?? areaTangkap['zona'] ?? 'WPP-NRI')
        : 'WPP-NRI';
    
    // Ambil dari harborZone object
    final harborZone = _tripData?['harborZone'];
    final pelabuhan = harborZone != null
        ? (harborZone['nama'] ?? harborZone['name'] ?? 'Tidak diketahui')
        : (_tripData?['pelabuhan'] ?? 'Tidak diketahui');
    
    debugPrint('\n📍 [UI] Displaying location:');
    debugPrint('   Zona: $zonaTangkap');
    debugPrint('   Pelabuhan: $pelabuhan');
    
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        children: [
          // Zona Tangkap (dari trip)
          InputDecorator(
            decoration: InputDecoration(
              labelText: 'Zona Penangkapan',
              prefixIcon: Icon(Icons.waves, color: Color(0xFF1B4F9C)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            child: Text(
              zonaTangkap,
              style: TextStyle(fontSize: fs(14), color: Colors.black87),
            ),
          ),
          SizedBox(height: sp(12)),
          
          // Pelabuhan (dari trip)
          InputDecorator(
            decoration: InputDecoration(
              labelText: 'Pelabuhan',
              prefixIcon: Icon(Icons.anchor, color: Color(0xFF1B4F9C)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            child: Text(
              pelabuhan,
              style: TextStyle(fontSize: fs(14), color: Colors.black87),
            ),
          ),
          SizedBox(height: sp(12)),
          
          // Kondisi Cuaca (realtime)
          InputDecorator(
            decoration: InputDecoration(
              labelText: 'Kondisi Cuaca (Realtime)',
              prefixIcon: _isLoadingWeather
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: Padding(
                        padding: EdgeInsets.all(sp(12)),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : Icon(Icons.wb_sunny, color: Color(0xFF1B4F9C)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
              filled: true,
              fillColor: Colors.blue[50],
            ),
            child: Text(
              _selectedWeatherCondition.isEmpty ? 'Memuat...' : _selectedWeatherCondition,
              style: TextStyle(
                fontSize: fs(14),
                color: Colors.black87,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          SizedBox(height: sp(12)),
          
          // Catatan
          TextFormField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              labelText: 'Catatan (Opsional)',
              hintText: 'Tambahkan catatan...',
              prefixIcon: Icon(Icons.note, color: Color(0xFF1B4F9C)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIoTSensorSection(
    double Function(double) sp,
    double Function(double) fs,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue[700], size: fs(16)),
              SizedBox(width: sp(8)),
              Expanded(
                child: Text(
                  'Isi berat dari sensor IoT (jika ada)',
                  style: TextStyle(fontSize: fs(12), color: Colors.blue[700]),
                ),
              ),
            ],
          ),
          SizedBox(height: sp(16)),
          TextFormField(
            controller: _iotWeightController,
            keyboardType: TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Berat dari Sensor IoT (kg)',
              hintText: '0.0',
              prefixIcon: Icon(Icons.scale, color: Color(0xFF1B4F9C)),
              suffixText: 'kg',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
              helperText: 'Input berat hasil timbangan sensor IoT',
            ),
          ),
        ],
      ),
    );
  }
}
