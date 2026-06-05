import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

class VesselDetailScreen extends StatefulWidget {
  final Map<String, dynamic> vesselData;

  const VesselDetailScreen({super.key, required this.vesselData});

  @override
  State<VesselDetailScreen> createState() => _VesselDetailScreenState();
}

class _VesselDetailScreenState extends State<VesselDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildVesselNameCard(),
                const SizedBox(height: 16),
                _buildQuickStats(),
                const SizedBox(height: 16),
                _buildTabBar(),
                const SizedBox(height: 16),
                _buildTabContent(),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    final foto = widget.vesselData['foto'];
    final nomorRegistrasi = widget.vesselData['nomorRegistrasi'] ?? '-';
    final statusOperasional = widget.vesselData['statusOperasional'] ?? 'active';

    return SliverAppBar(
      expandedHeight: 250,
      pinned: true,
      stretch: true,
      backgroundColor: const Color(0xFF1B4F9C),
      iconTheme: const IconThemeData(color: Colors.white),
      title: const Text(
        'Detail Kapal',
        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.share),
          onPressed: () {},
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            if (foto != null && foto.toString().isNotEmpty)
              _buildVesselImage(foto)
            else
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.directions_boat, size: 100, color: Colors.white70),
                ),
              ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.3),
                  ],
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.verified,
                      size: 16,
                      color: statusOperasional == 'active' ? Colors.green : Colors.orange,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      nomorRegistrasi,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B4F9C),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVesselImage(dynamic foto) {
    try {
      if (foto is String && foto.startsWith('data:image')) {
        final base64String = foto.split(',')[1];
        final bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Center(
                child: Icon(Icons.directions_boat, size: 80, color: Colors.white70),
              ),
            );
          },
        );
      }
    } catch (e) {
      // Handle error
    }
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: const Center(
        child: Icon(Icons.directions_boat, size: 80, color: Colors.white70),
      ),
    );
  }

  Widget _buildVesselNameCard() {
    final namaKapal = widget.vesselData['namaKapal'] ?? 'Tidak ada nama';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Text(
        namaKapal,
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Color(0xFF1B4F9C),
        ),
      ),
    );
  }

  Widget _buildQuickStats() {
    final panjangKapal = widget.vesselData['panjangKapal'];
    final lebarKapal = widget.vesselData['lebarKapal'];
    final abkList = widget.vesselData['abk'] as List?;
    final abkCount = abkList?.length ?? 0;
    final gps = widget.vesselData['gps'] as Map<String, dynamic>?;
    final isGpsActive = gps?['isActive'] ?? false;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
              icon: Icons.straighten,
              label: 'Dimensi',
              value: '${panjangKapal ?? 0}m × ${lebarKapal ?? 0}m',
              color: const Color(0xFF3B82F6),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              icon: Icons.group,
              label: 'Awak Kapal',
              value: '${abkCount + 1} Orang',
              color: const Color(0xFF8B5CF6),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildStatCard(
              icon: Icons.gps_fixed,
              label: 'GPS',
              value: isGpsActive ? 'Aktif' : 'Nonaktif',
              color: isGpsActive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: const Color(0xFF1B4F9C),
        unselectedLabelColor: Colors.grey,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(
          color: const Color(0xFF1B4F9C).withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        dividerColor: Colors.transparent,
        tabs: const [
          Tab(icon: Icon(Icons.info_outline, size: 20), text: 'Info'),
          Tab(icon: Icon(Icons.settings, size: 20), text: 'Mesin'),
          Tab(icon: Icon(Icons.gps_fixed, size: 20), text: 'GPS'),
          Tab(icon: Icon(Icons.group, size: 20), text: 'Awak'),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return SizedBox(
      height: 500,
      child: TabBarView(
        controller: _tabController,
        children: [
          _buildBasicInfoTab(),
          _buildEngineTab(),
          _buildGPSTab(),
          _buildCrewTab(),
        ],
      ),
    );
  }

  Widget _buildBasicInfoTab() {
    final pemilik = widget.vesselData['pemilik'];
    final tipeKapal = widget.vesselData['tipeKapal'];
    final alatTangkap = widget.vesselData['alatTangkap'];
    final panjangKapal = widget.vesselData['panjangKapal'];
    final lebarKapal = widget.vesselData['lebarKapal'];
    final statusOperasional = widget.vesselData['statusOperasional'];
    final nahkoda = widget.vesselData['nahkoda'] as Map<String, dynamic>?;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          _buildInfoCard(
            title: 'Informasi Kapal',
            icon: Icons.directions_boat,
            color: const Color(0xFF3B82F6),
            children: [
              if (nahkoda != null) _buildModernInfoRow('Nahkoda', nahkoda['nama'] ?? '-', Icons.person),
              if (pemilik != null) _buildModernInfoRow('Pemilik', pemilik, Icons.business),
              if (tipeKapal != null) _buildModernInfoRow('Tipe Kapal', tipeKapal, Icons.directions_boat),
              if (alatTangkap != null) _buildModernInfoRow('Alat Tangkap', alatTangkap, Icons.phishing),
            ],
          ),
          const SizedBox(height: 16),
          _buildInfoCard(
            title: 'Spesifikasi',
            icon: Icons.analytics,
            color: const Color(0xFF8B5CF6),
            children: [
              if (panjangKapal != null) _buildModernInfoRow('Panjang', '${panjangKapal}m', Icons.straighten),
              if (lebarKapal != null) _buildModernInfoRow('Lebar', '${lebarKapal}m', Icons.straighten),
              _buildStatusRow('Status Operasional', statusOperasional ?? 'active'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEngineTab() {
    final mesin = widget.vesselData['mesin'] as Map<String, dynamic>?;
    
    if (mesin == null || mesin.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.settings_outlined,
                size: 64,
                color: Colors.orange[400],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Data Mesin Belum Tersedia',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Informasi mesin akan ditampilkan di sini',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: _buildInfoCard(
        title: 'Detail Mesin',
        icon: Icons.settings,
        color: const Color(0xFFF59E0B),
        children: [
          _buildModernInfoRow('Merk', mesin['merk'] ?? '-', Icons.label),
          _buildModernInfoRow('Tahun Pembuatan', mesin['tahun']?.toString() ?? '-', Icons.calendar_today),
          _buildModernInfoRow('Tenaga', mesin['tenaga'] ?? '-', Icons.speed),
        ],
      ),
    );
  }

  Widget _buildGPSTab() {
    final gps = widget.vesselData['gps'] as Map<String, dynamic>?;
    
    if (gps == null || gps.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.gps_off,
                size: 64,
                color: Colors.orange[400],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'GPS Belum Terpasang',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Pasang GPS untuk tracking kapal',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    final currentPos = gps['currentPosition'] as Map<String, dynamic>?;
    final isActive = gps['isActive'] ?? false;
    final latitude = currentPos?['latitude'];
    final longitude = currentPos?['longitude'];

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          _buildInfoCard(
            title: 'Status GPS',
            icon: Icons.gps_fixed,
            color: isActive ? const Color(0xFF10B981) : Colors.grey,
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF10B981) : Colors.grey,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    isActive ? 'Aktif' : 'Nonaktif',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            children: [
              _buildModernInfoRow('Merk', gps['merk'] ?? '-', Icons.label),
              _buildModernInfoRow('Tipe', gps['tipe'] ?? '-', Icons.devices),
            ],
          ),
          const SizedBox(height: 16),
          if (currentPos != null) ...[
            _buildInfoCard(
              title: 'Posisi Terakhir',
              icon: Icons.my_location,
              color: const Color(0xFF06B6D4),
              children: [
                _buildModernInfoRow('Latitude', currentPos['latitude']?.toString() ?? '-', Icons.explore),
                _buildModernInfoRow('Longitude', currentPos['longitude']?.toString() ?? '-', Icons.explore),
                _buildModernInfoRow('Kecepatan', '${currentPos['speed']?.toStringAsFixed(2) ?? '0'} knot', Icons.speed),
                _buildModernInfoRow('Arah', '${currentPos['heading'] ?? 0}°', Icons.navigation),
              ],
            ),
            const SizedBox(height: 16),
            if (latitude != null && longitude != null)
              Container(
                width: double.infinity,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF10B981), Color(0xFF059669)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton.icon(
                  onPressed: () => _openGoogleMaps(latitude, longitude),
                  icon: const Icon(Icons.map, size: 24),
                  label: const Text(
                    'Buka di Google Maps',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    foregroundColor: Colors.white,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildCrewTab() {
    final nahkoda = widget.vesselData['nahkoda'] as Map<String, dynamic>?;
    final abkList = widget.vesselData['abk'] as List?;

    if (nahkoda == null && (abkList == null || abkList.isEmpty)) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.group_outlined,
                size: 64,
                color: Colors.blue[400],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Belum Ada Awak Kapal',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Tambahkan nahkoda dan ABK',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          if (nahkoda != null)
            _buildModernCrewCard(
              name: nahkoda['nama'] ?? '-',
              role: 'Nahkoda',
              username: nahkoda['username'] ?? '-',
              color: const Color(0xFF10B981),
              icon: Icons.anchor,
            ),
          if (abkList != null && abkList.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...abkList.map((abk) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildModernCrewCard(
                name: abk['nama'] ?? '-',
                role: 'ABK',
                username: abk['username'] ?? '-',
                color: const Color(0xFF06B6D4),
                icon: Icons.person,
              ),
            )).toList(),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
    Widget? trailing,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B4F9C),
                    ),
                  ),
                ),
                if (trailing != null) trailing,
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  Widget _buildModernInfoRow(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[400]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, String status) {
    final isActive = status.toLowerCase() == 'active';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(Icons.circle, size: 20, color: Colors.grey[400]),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isActive ? const Color(0xFF10B981).withOpacity(0.1) : Colors.orange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isActive ? const Color(0xFF10B981) : Colors.orange,
                width: 1.5,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFF10B981) : Colors.orange,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  isActive ? 'Aktif' : 'Nonaktif',
                  style: TextStyle(
                    color: isActive ? const Color(0xFF10B981) : Colors.orange,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernCrewCard({
    required String name,
    required String role,
    required String username,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [color, color.withOpacity(0.7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.alternate_email, size: 14, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        username,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                role,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final url = 'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }
}