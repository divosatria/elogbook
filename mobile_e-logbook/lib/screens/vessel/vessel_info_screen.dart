import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:provider/provider.dart';
import '../../provider/user_provider.dart';
import '../../services/api/vessel_service.dart';
import '../../services/realtime/realtime_update_service.dart';
import '../../utils/network_error_handler.dart';
import '../../utils/navigation_helper.dart';
import 'vessel_detail_screen.dart';

class VesselInfoScreen extends StatefulWidget {
  final Map<String, dynamic>? arguments;

  const VesselInfoScreen({Key? key, this.arguments}) : super(key: key);

  @override
  _VesselInfoScreenState createState() => _VesselInfoScreenState();
}

class _VesselInfoScreenState extends State<VesselInfoScreen> {
  String vesselName = "Belum memilih kapal";
  String vesselNumber = "-";
  Map<String, dynamic>? _vesselData;
  bool _isLoading = false;

  void _onVesselUpdate() {
    print('\n🔔 [VESSEL_INFO] _onVesselUpdate called, mounted: $mounted');
    if (mounted) {
      print('   Reloading vessel data...');
      _loadVesselData();
    } else {
      print('   ⚠️ Widget not mounted, skipping reload');
    }
  }

  @override
  void initState() {
    super.initState();
    print('\n🚀 [VESSEL_INFO] initState called');
    _loadVesselData();
    
    print('   Adding vessel listener...');
    RealtimeUpdateService.addListener('vessel', _onVesselUpdate);
  }

  Future<void> _loadVesselData() async {
    print('\n🔄 [VESSEL_INFO] Loading vessel data...');
    setState(() => _isLoading = true);
    
    try {
      print('   Fetching vessel detail...');
      final detailData = await VesselService().getVesselDetail();
      print('   Vessel detail received: ${detailData != null}');
      
      if (mounted) {
        if (detailData == null) {
          print('   ⚠️ No vessel found');
          setState(() {
            vesselName = 'Belum ada kapal yang ditugaskan';
            vesselNumber = '-';
            _vesselData = null;
            _isLoading = false;
          });
          _showNoVesselDialog();
        } else {
          print('   ✅ Vessel data loaded: ${detailData['namaKapal']}');
          setState(() {
            _vesselData = detailData;
            vesselName = detailData['namaKapal'] ?? 'Tidak ada nama';
            vesselNumber = detailData['nomorRegistrasi'] ?? '-';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      print('   ❌ Error loading vessel data: $e');
      if (mounted) {
        setState(() {
          vesselName = NetworkErrorHandler.getErrorMessage(e);
          vesselNumber = '-';
          _isLoading = false;
        });
        NetworkErrorHandler.showErrorDialog(
          context,
          message: NetworkErrorHandler.getErrorMessage(e),
          onRetry: _loadVesselData,
        );
      }
    }
  }

  void _showNoVesselDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          padding: EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.directions_boat_outlined, size: 40, color: Colors.orange),
              ),
              SizedBox(height: 20),
              Text(
                'Belum Ada Kapal',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 12),
              Text(
                'Anda belum ditugaskan ke kapal manapun. Silakan hubungi admin untuk assignment kapal.',
                style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.orange,
                  padding: EdgeInsets.symmetric(vertical: 14, horizontal: 32),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: Text('OK', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }


  @override
  void dispose() {
    print('\n🗑️ [VESSEL_INFO] dispose called');
    print('   Removing vessel listener...');
    RealtimeUpdateService.removeListener('vessel', _onVesselUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        final user = userProvider.user;
        final isNahkoda = user?.isNahkoda == true;

        return Scaffold(
          backgroundColor: Colors.grey[50],
          appBar: AppBar(
            elevation: 0,
            backgroundColor: Colors.transparent,
            iconTheme: IconThemeData(color: Colors.white),
            flexibleSpace: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            title: Text('Informasi Kapal', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          body: RefreshIndicator(
            onRefresh: _loadVesselData,
            child: _isLoading
                ? Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    physics: AlwaysScrollableScrollPhysics(),
                    child: Column(
                      children: [
                        _buildHeaderBanner(),
                        SizedBox(height: 24),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildVesselInfoCard(isNahkoda),
                              SizedBox(height: 24),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildHeaderBanner() {
    return Container(
      width: double.infinity,
      color: Colors.transparent,
      child: Column(
        children: [
          SizedBox(height: 24),
          Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              color: Color(0xFFE0F2FE),
              shape: BoxShape.circle,
            ),
            child: Lottie.asset('assets/animations/PreTrip.json', width: 80, height: 80),
          ),
          SizedBox(height: 16),
          Text(
            vesselName,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1B4F9C),
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 8),
          Container(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Color(0xFF1B4F9C).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              vesselNumber,
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF1B4F9C),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildVesselInfoCard(bool isNahkoda) {
    final statusOperasional = _vesselData?['statusOperasional'];

    return InkWell(
      onTap: _vesselData != null
          ? () {
              NavigationHelper.pushNoTransition(
                context,
                VesselDetailScreen(vesselData: _vesselData!),
              );
            }
          : null,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 20,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C).withOpacity(0.1), Color(0xFF2563EB).withOpacity(0.05)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(20),
                  topRight: Radius.circular(20),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.info_outline, color: Colors.white, size: 24),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Informasi Detail',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1B4F9C),
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Tap untuk lihat detail lengkap',
                          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios, color: Colors.grey[400], size: 20),
                ],
              ),
            ),
            Padding(
              padding: EdgeInsets.all(20),
              child: _buildDetailRow(
                icon: Icons.verified,
                label: 'Status Operasional',
                value: statusOperasional ?? 'active',
                color: Color(0xFF10B981),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Row(
        children: [
          Container(
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
