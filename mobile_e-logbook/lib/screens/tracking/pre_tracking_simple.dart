import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../../services/api/trip_service.dart';
import '../../utils/navigation_helper.dart';
import '../../provider/user_provider.dart';
import 'waiting_approval_screen.dart';
import 'waiting_schedule_screen.dart';

class PreTrackingScreenSimple extends StatefulWidget {
  final int tripId;
  final Map<String, dynamic> tripData;

  const PreTrackingScreenSimple({
    Key? key,
    required this.tripId,
    required this.tripData,
  }) : super(key: key);

  @override
  State<PreTrackingScreenSimple> createState() => _PreTrackingScreenSimpleState();
}

class _PreTrackingScreenSimpleState extends State<PreTrackingScreenSimple> {
  bool _isSubmitting = false;
  Map<String, dynamic> _tripDetail = {};
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadTripDetail();
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(Duration(seconds: 3), (timer) async {
      try {
        final response = await TripService.getTripDetail(widget.tripId);
        if (response['success'] == true) {
          final status = response['data']?['status']?.toLowerCase();
          print('🔄 [POLLING] Trip status: $status');
          
          // Crew menunggu status 'disetujui' (Admin sudah approve)
          if (status == 'disetujui' && mounted) {
            timer.cancel();
            print('➡️ [POLLING] Trip disetujui, crew can start!');
            _navigateToWaitingSchedule();
          }
        }
      } catch (e) {
        print('❌ [POLLING] Error: $e');
      }
    });
  }

  Future<void> _navigateToWaitingSchedule() async {
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final userRole = userProvider.user?.role?.toLowerCase();
    
    // Fetch trip detail untuk data lengkap
    final response = await TripService.getTripDetail(widget.tripId);
    if (response['success'] != true) return;
    
    final tripData = response['data'];
    final perizinan = tripData['perizinan'] ?? {};
    
    // Hitung total BBM dan Es
    double totalFuel = 0;
    double totalIce = 0;
    
    final fuelDataList = perizinan['fuelData'] as List? ?? [];
    for (var fuel in fuelDataList) {
      totalFuel += (fuel['jumlahLiter'] ?? 0).toDouble();
    }
    
    final iceDataList = perizinan['iceData'] as List? ?? [];
    for (var ice in iceDataList) {
      totalIce += (ice['jumlahKg'] ?? 0).toDouble();
    }
    
    // Parse waktu keberangkatan
    DateTime departureTime;
    if (tripData['waktuMulai'] != null) {
      departureTime = DateTime.parse(tripData['waktuMulai']);
    } else if (tripData['tanggalBerangkat'] != null) {
      departureTime = DateTime.parse(tripData['tanggalBerangkat']);
    } else {
      departureTime = widget.tripData['departureDate'] ?? DateTime.now();
    }
    
    DateTime? estimatedReturnDate;
    if (tripData['estimasiPulang'] != null) {
      estimatedReturnDate = DateTime.parse(tripData['estimasiPulang']);
    }
    
    final estimatedDuration = tripData['durasi'] ?? widget.tripData['estimatedDuration'] ?? 1;
    
    // Ambil data kapal dari response API
    final kapal = tripData['kapal'] ?? {};
    final nahkoda = tripData['nahkoda'] ?? {};
    final areaTangkap = tripData['areaTangkap'] ?? {};
    
    // Pelabuhan opsional - bisa kosong
    String selectedHarbor = tripData['pelabuhanAsal'] ?? 
                           tripData['pelabuhan'] ?? 
                           areaTangkap['nama'] ?? 
                           '';
    
    // Koordinat pelabuhan - gunakan koordinat area tangkap atau default
    Map<String, double>? harborCoordinates;
    if (areaTangkap['latitude'] != null && areaTangkap['longitude'] != null) {
      harborCoordinates = {
        'latitude': (areaTangkap['latitude'] as num).toDouble(),
        'longitude': (areaTangkap['longitude'] as num).toDouble(),
      };
      print('📍 [NAVIGATE] Using areaTangkap coordinates: $harborCoordinates');
    } else if (widget.tripData['harborCoordinates'] != null) {
      harborCoordinates = widget.tripData['harborCoordinates'];
      print('📍 [NAVIGATE] Using widget harborCoordinates: $harborCoordinates');
    } else {
      // Default koordinat (Jakarta Bay sebagai fallback)
      harborCoordinates = {
        'latitude': -6.1075,
        'longitude': 106.8975,
      };
      print('⚠️ [NAVIGATE] Using default coordinates (Jakarta Bay)');
    }
    
    print('🚢 [NAVIGATE] Vessel: ${kapal['namaKapal']}');
    print('⚓ [NAVIGATE] Harbor: ${selectedHarbor.isEmpty ? "(Tidak ada)" : selectedHarbor}');
    print('📊 [NAVIGATE] Area Tangkap: ${areaTangkap['nama'] ?? "(Tidak ada)"}');
    
    if (!mounted) return;
    
    NavigationHelper.pushReplacementNoTransition(
      context,
      WaitingScheduleScreen(
        scheduledDepartureTime: departureTime,
        tripData: {
          'vesselName': kapal['namaKapal'] ?? kapal['nama'] ?? '',
          'vesselNumber': kapal['nomorRegistrasi'] ?? '',
          'captainName': nahkoda['nama'] ?? nahkoda['username'] ?? '',
          'crewCount': (tripData['awakKapal'] as List?)?.length ?? 0,
          'selectedHarbor': selectedHarbor,
          'departureTime': departureTime,
          'estimatedReturnDate': estimatedReturnDate,
          'estimatedDuration': estimatedDuration,
          'emergencyContact': widget.tripData['emergencyContact'] ?? '',
          'fuelAmount': totalFuel > 0 ? totalFuel : (widget.tripData['fuelAmount'] ?? 0.0),
          'iceStorage': totalIce > 0 ? totalIce : (widget.tripData['iceStorage'] ?? 0.0),
          'notes': widget.tripData['notes'],
          'harborCoordinates': harborCoordinates,
          'zoneRadius': 50.0,
          'userRole': userRole == 'nahkoda' ? 'Nahkoda' : 'ABK',
          'userName': userProvider.user?.name ?? '',
        },
      ),
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTripDetail() async {
    try {
      print('\n🔄 [PRE-TRACKING] Loading trip detail...');
      final response = await TripService.getTripDetail(widget.tripId);
      
      if (response['success'] == true && mounted) {
        final tripData = response['data'] ?? {};
        final status = tripData['status']?.toLowerCase();
        final userProvider = Provider.of<UserProvider>(context, listen: false);
        final userRole = userProvider.user?.role?.toLowerCase();
        
        print('📊 [PRE-TRACKING] Trip status: $status, Role: $userRole');
        
        // CREW: Jika status sudah disetujui atau aktif, langsung ke waiting schedule
        if (userRole == 'crew') {
          if (status == 'disetujui' || status == 'aktif' || status == 'sedang_melaut') {
            print('➡️ [PRE-TRACKING] Crew: Status $status, navigating to WaitingSchedule...');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                _navigateToWaitingSchedule();
              }
            });
            return;
          }
        }
        
        // NAHKODA: Jika status menunggu_izin atau lebih, redirect ke WaitingApprovalScreen
        if (userRole == 'nahkoda') {
          if (status == 'menunggu_izin') {
            print('➡️ [PRE-TRACKING] Nahkoda: Status menunggu_izin, navigating to WaitingApproval...');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                NavigationHelper.pushReplacementNoTransition(
                  context,
                  WaitingApprovalScreen(
                    tripData: {
                      ...widget.tripData,
                      'tripId': widget.tripId,
                      'role': userRole ?? 'nahkoda',
                    },
                  ),
                );
              }
            });
            return;
          } else if (status == 'disetujui' || status == 'aktif' || status == 'sedang_melaut') {
            print('➡️ [PRE-TRACKING] Nahkoda: Status $status, navigating to WaitingSchedule...');
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                _navigateToWaitingSchedule();
              }
            });
            return;
          }
        }
        
        setState(() {
          _tripDetail = tripData;
        });
        
        // Start polling untuk crew (menunggu nahkoda kirim)
        if (userRole == 'crew') {
          print('🔄 [PRE-TRACKING] Starting polling for crew...');
          _startPolling();
        }
        
        print('✅ [PRE-TRACKING] Trip detail loaded');
      }
    } catch (e) {
      print('❌ [PRE-TRACKING] Failed to load trip detail: $e');
    }
  }

  Future<void> _submitAndRequestApproval() async {
    print('\n🔵 [PRE-TRACKING] KIRIM clicked!');
    print('🔵 [PRE-TRACKING] tripId: ${widget.tripId}');
    print('🔵 [PRE-TRACKING] tripData keys: ${widget.tripData.keys.toList()}');
    
    setState(() => _isSubmitting = true);

    try {
      // Upload dokumen Nahkoda jika ada
      final pendingDocs = widget.tripData['pendingDocuments'] as Map<String, dynamic>?;
      if (pendingDocs != null) {
        print('📤 [PRE-TRACKING] Uploading Nahkoda documents...');
        
        if (pendingDocs['izinMelaut'] != null && pendingDocs['izinMelaut'] != 'uploaded') {
          print('   Uploading Izin Melaut...');
          await TripService.uploadTripDocument(
            tripId: widget.tripId,
            jenisDokumen: 'izinMelaut',
            filePath: pendingDocs['izinMelaut'],
          );
        }
        
        if (pendingDocs['dokumenKapal'] != null && pendingDocs['dokumenKapal'] != 'uploaded') {
          print('   Uploading Dokumen Kapal...');
          await TripService.uploadTripDocument(
            tripId: widget.tripId,
            jenisDokumen: 'dokumenKapal',
            filePath: pendingDocs['dokumenKapal'],
          );
        }
        
        if (pendingDocs['asuransi'] != null && pendingDocs['asuransi'] != 'uploaded') {
          print('   Uploading Asuransi...');
          await TripService.uploadTripDocument(
            tripId: widget.tripId,
            jenisDokumen: 'asuransi',
            filePath: pendingDocs['asuransi'],
          );
        }
        
        print('✅ [PRE-TRACKING] All documents uploaded');
      } else {
        print('⚠️ [PRE-TRACKING] No pending documents to upload');
      }

      if (!mounted) return;

      // Navigate ke WaitingApprovalScreen
      print('➡️ [PRE-TRACKING] Navigating to WaitingApprovalScreen...');
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      
      // Ambil data kapal dan nahkoda dari tripData atau _tripDetail
      final kapal = _tripDetail.isNotEmpty ? _tripDetail['kapal'] : widget.tripData['kapal'];
      final nahkoda = _tripDetail.isNotEmpty ? _tripDetail['nahkoda'] : widget.tripData['nahkoda'];
      
      // Parse tanggal dengan safe handling
      DateTime departureDate = DateTime.now();
      if (widget.tripData['departureDate'] != null) {
        if (widget.tripData['departureDate'] is DateTime) {
          departureDate = widget.tripData['departureDate'];
        } else if (widget.tripData['departureDate'] is String) {
          try {
            departureDate = DateTime.parse(widget.tripData['departureDate']);
          } catch (e) {
            print('⚠️ [PRE-TRACKING] Failed to parse departureDate: $e');
          }
        }
      } else if (widget.tripData['tanggalBerangkat'] != null) {
        try {
          departureDate = DateTime.parse(widget.tripData['tanggalBerangkat']);
        } catch (e) {
          print('⚠️ [PRE-TRACKING] Failed to parse tanggalBerangkat: $e');
        }
      }
      
      NavigationHelper.pushReplacementNoTransition(
        context,
        WaitingApprovalScreen(
          tripData: {
            'tripId': widget.tripId,
            'vesselName': kapal?['namaKapal'] ?? kapal?['nama'] ?? '',
            'vesselNumber': kapal?['nomorRegistrasi'] ?? '',
            'captainName': nahkoda?['nama'] ?? nahkoda?['username'] ?? '',
            'crewCount': (_tripDetail['awakKapal'] as List?)?.length ?? 0,
            'departureHarbor': _tripDetail['pelabuhanAsal'] ?? '',
            'departureDate': departureDate,
            'estimatedDuration': _tripDetail['durasi'] ?? widget.tripData['durasi'] ?? 1,
            'emergencyContact': widget.tripData['emergencyContact'] ?? '',
            'fuelAmount': widget.tripData['fuelAmount'] ?? 0.0,
            'iceStorage': widget.tripData['iceStorage'] ?? 0.0,
            'notes': widget.tripData['notes'],
            'role': userProvider.user?.role ?? 'crew',
            'harborCoordinates': widget.tripData['harborCoordinates'],
          },
        ),
      );
    } catch (e) {
      print('❌ [PRE-TRACKING] Error: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengirim perizinan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userProvider = Provider.of<UserProvider>(context);
    final userRole = userProvider.user?.role?.toLowerCase();
    
    final width = MediaQuery.of(context).size.width;
    double sp(double size) => size * (width / 390);

    // Extract data from API response or use widget.tripData as fallback
    final kapal = _tripDetail['kapal'] ?? {};
    final nahkoda = _tripDetail['nahkoda'] ?? {};
    final perizinan = _tripDetail['perizinan'] ?? {};
    final fuelDataList = perizinan['fuelData'] as List? ?? [];
    final iceDataList = perizinan['iceData'] as List? ?? [];
    
    // Calculate total fuel and ice
    double totalFuel = 0;
    double totalIce = 0;
    
    for (var fuel in fuelDataList) {
      totalFuel += (fuel['jumlahLiter'] ?? 0).toDouble();
    }
    
    for (var ice in iceDataList) {
      totalIce += (ice['jumlahKg'] ?? 0).toDouble();
    }

    return Scaffold(
      backgroundColor: Color(0xFFF5F7FA),
      appBar: AppBar(
        title: Text(
          'Bersiap Melaut',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        iconTheme: IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  SizedBox(height: sp(16)),

                  // Vessel Info Card
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: sp(16)),
                    padding: EdgeInsets.all(sp(16)),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(sp(12)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: EdgeInsets.all(sp(12)),
                              decoration: BoxDecoration(
                                color: Color(0xFF1B4F9C).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(sp(12)),
                              ),
                              child: Icon(
                                Icons.directions_boat,
                                color: Color(0xFF1B4F9C),
                                size: 28,
                              ),
                            ),
                            SizedBox(width: sp(12)),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    kapal['namaKapal'] ?? widget.tripData['vesselName'] ?? '-',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    kapal['nomorRegistrasi'] ?? widget.tripData['vesselNumber'] ?? '-',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        Divider(height: 24),
                        _buildInfoRow(
                          Icons.person,
                          'Nahkoda',
                          nahkoda['nama'] ?? widget.tripData['captainName'] ?? '-',
                        ),
                        SizedBox(height: 8),
                        _buildInfoRow(
                          Icons.groups,
                          'ABK',
                          '${(_tripDetail['awakKapal'] as List?)?.length ?? widget.tripData['crewCount'] ?? 0} orang',
                        ),
                        SizedBox(height: 8),
                        _buildInfoRow(
                          Icons.anchor,
                          'Pelabuhan',
                          _tripDetail['pelabuhanAsal'] ?? 
                          _tripDetail['pelabuhan'] ?? 
                          (_tripDetail['areaTangkap']?['nama']) ?? 
                          'Tidak ditentukan',
                        ),
                        SizedBox(height: 8),
                        _buildInfoRow(
                          Icons.calendar_today,
                          'Estimasi',
                          '${_tripDetail['durasi'] ?? widget.tripData['estimatedDuration'] ?? 0} hari',
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: sp(16)),

                  // Resources Card
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: sp(16)),
                    padding: EdgeInsets.all(sp(16)),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(sp(12)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Persediaan',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 16),
                        _buildInfoRow(
                          Icons.local_gas_station,
                          'BBM',
                          '${totalFuel.toStringAsFixed(0)} L',
                        ),
                        SizedBox(height: 8),
                        _buildInfoRow(
                          Icons.ac_unit,
                          'Kapasitas Es',
                          '${totalIce.toStringAsFixed(0)} Kg',
                        ),
                        if (widget.tripData['notes'] != null) ...[
                          Divider(height: 24),
                          _buildInfoRow(
                            Icons.note,
                            'Catatan',
                            widget.tripData['notes'],
                          ),
                        ],
                      ],
                    ),
                  ),

                  SizedBox(height: sp(24)),

                  // Ready to Start
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: sp(16)),
                    child: Column(
                      children: [
                        Lottie.asset(
                          'assets/animations/GPS.json',
                          width: 400,
                          height: 400,
                          fit: BoxFit.contain,
                          repeat: true,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Semua Persiapan Selesai!',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[800],
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          userRole == 'nahkoda'
                              ? 'Kirim perizinan untuk memulai tracking'
                              : 'Menunggu Nahkoda mendapatkan izin dari Admin',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: userRole == 'nahkoda' ? Colors.grey[600] : Colors.orange[700],
                            fontWeight: userRole == 'nahkoda' ? FontWeight.normal : FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                  SizedBox(height: sp(100)),
                ],
              ),
            ),
          ),

          // Bottom Button - Only for Nahkoda
          if (userRole == 'nahkoda')
            Container(
              padding: EdgeInsets.all(sp(16)),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 10,
                    offset: Offset(0, -2),
                  ),
                ],
              ),
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitAndRequestApproval,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                      ? SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.send, size: 24, color: Colors.white),
                            SizedBox(width: 12),
                            Text(
                              'KIRIM',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Color(0xFF1B4F9C)),
        SizedBox(width: 12),
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
              ),
              Flexible(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
