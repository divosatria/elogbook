import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class FishPhotoTipsScreen extends StatefulWidget {
  const FishPhotoTipsScreen({super.key});

  @override
  State<FishPhotoTipsScreen> createState() => _FishPhotoTipsScreenState();
}

class _FishPhotoTipsScreenState extends State<FishPhotoTipsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final width = size.width;
    double fs(double size) => (size * (width / 390)).clamp(size * 0.8, size * 1.2);
    double sp(double size) => (size * (width / 390)).clamp(size * 0.8, size * 1.2);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Panduan Foto Ikan',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: ResponsiveHelper.font(context, mobile: 18, tablet: 20),
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: TextStyle(
            fontSize: ResponsiveHelper.font(context, mobile: 13, tablet: 15), 
            fontWeight: FontWeight.bold,
          ),
          unselectedLabelStyle: TextStyle(
            fontSize: ResponsiveHelper.font(context, mobile: 13, tablet: 15),
          ),
          tabs: const [
            Tab(text: 'Teknik Foto'),
            Tab(text: 'Jenis Ikan'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildTechniqueTab(fs, sp),
          _buildFishTypesTab(fs, sp),
        ],
      ),
    );
  }

  // TAB 1: TEKNIK FOTO
  Widget _buildTechniqueTab(double Function(double) fs, double Function(double) sp) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(sp(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card with Animation
          Container(
            padding: EdgeInsets.all(sp(20)),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade50, Colors.blue.shade100],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(sp(16)),
              border: Border.all(color: Colors.blue.shade300, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.shade200.withOpacity(0.5),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(sp(14)),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(sp(14)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.orange.shade200,
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Icon(Icons.lightbulb, color: Colors.orange.shade700, size: fs(32)),
                ),
                SizedBox(width: sp(16)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tips Penting!',
                        style: TextStyle(
                          fontSize: fs(17),
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade900,
                        ),
                      ),
                      SizedBox(height: sp(6)),
                      Text(
                        'Foto yang baik = Deteksi AI yang akurat',
                        style: TextStyle(
                          fontSize: fs(14),
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          SizedBox(height: sp(24)),

          // Step by Step Guide
          _buildStepCard(
            '1',
            'Posisi & Jarak',
            [
              'Foto dari SAMPING ikan (profil lengkap)',
              'Jarak ideal: 30-50 cm dari ikan',
              'Ikan harus memenuhi 60-80% frame foto',
              'Pastikan kepala hingga ekor terlihat',
            ],
            Icons.straighten,
            Colors.blue,
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          _buildStepCard(
            '2',
            'Pencahayaan',
            [
              'Gunakan cahaya alami/terang',
              'Hindari backlight (cahaya dari belakang)',
              'Pastikan tidak ada bayangan menutupi ikan',
              'Waktu terbaik: pagi/siang hari',
            ],
            Icons.wb_sunny,
            Colors.orange,
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          _buildStepCard(
            '3',
            'Fokus & Kejernihan',
            [
              'Tap pada layar untuk fokus di bagian kepala ikan',
              'Pastikan foto tidak blur atau goyang',
              'Gunakan mode HDR jika tersedia',
              'Ambil beberapa foto untuk pilihan terbaik',
            ],
            Icons.center_focus_strong,
            Colors.green,
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          _buildStepCard(
            '4',
            'Referensi Ukuran',
            [
              'Letakkan tangan/penggaris di samping ikan',
              'Jangan menutupi ciri khas ikan',
              'Gunakan objek dengan ukuran standar (korek api, pulpen)',
              'Referensi membantu AI menentukan spesies',
            ],
            Icons.straighten,
            Colors.purple,
            fs,
            sp,
          ),

          SizedBox(height: sp(24)),

          // Do's and Don'ts
          Row(
            children: [
              Expanded(
                child: _buildDosDontsCard(
                  'LAKUKAN ✅',
                  [
                    'Foto dari samping',
                    'Cahaya cukup',
                    'Fokus tajam',
                    'Background bersih',
                    'Ikan utuh terlihat',
                  ],
                  Colors.green,
                  fs,
                  sp,
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: _buildDosDontsCard(
                  'HINDARI ❌',
                  [
                    'Foto dari atas',
                    'Terlalu gelap',
                    'Blur/goyang',
                    'Ikan tertutup',
                    'Jarak terlalu jauh',
                  ],
                  Colors.red,
                  fs,
                  sp,
                ),
              ),
            ],
          ),

          SizedBox(height: sp(24)),

        ],
      ),
    );
  }

  // TAB 2: JENIS IKAN (Enhanced)
  Widget _buildFishTypesTab(double Function(double) fs, double Function(double) sp) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(sp(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Section
          Container(
            padding: EdgeInsets.all(sp(16)),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              ),
              borderRadius: BorderRadius.circular(sp(12)),
            ),
            child: Column(
              children: [
                Icon(Icons.info_outline, color: Colors.white, size: fs(32)),
                SizedBox(height: sp(8)),
                Text(
                  'Panduan Foto Per Jenis Ikan',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: fs(18),
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: sp(6)),
                Text(
                  'Setiap jenis ikan memiliki ciri khas yang harus difoto dengan jelas',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: fs(13),
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
              ],
            ),
          ),

          SizedBox(height: sp(20)),

          // Ikan Tongkol
          _buildFishDetailCard(
            'TONGKOL',
            'Euthynnus affinis',
            [
              'CIRI KHAS UTAMA:',
              '• Corak "batik" gelap di bagian punggung belakang',
              '• Garis-garis miring tidak teratur',
              '• Perut berwarna perak mengkilap',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Corak batik di punggung (sangat penting!)',
              '✓ Bentuk tubuh fusiform (torpedo)',
              '✓ Sirip punggung yang terpisah',
              '✓ Area perut yang mengkilap',
              '',
              'SUDUT TERBAIK:',
              '→ Foto dari samping dengan fokus ke punggung',
              '→ Pastikan corak terlihat kontras',
            ],
            Colors.blue.shade700,
            '🐟',
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          // Ikan Tenggiri
          _buildFishDetailCard(
            'TENGGIRI',
            'Scomberomorus spp.',
            [
              'CIRI KHAS UTAMA:',
              '• Tubuh panjang dan pipih dari samping',
              '• Gigi tajam dan menonjol',
              '• Sisik kecil halus',
              '• Warna perak kebiruan',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Gigi tajam (buka mulut jika memungkinkan)',
              '✓ Bentuk tubuh yang memanjang',
              '✓ Sirip ekor berbentuk bulan sabit',
              '✓ Proporsi kepala yang lancip',
              '',
              'SUDUT TERBAIK:',
              '→ Foto profil penuh untuk proporsi tubuh',
              '→ Close-up kepala untuk gigi (opsional)',
            ],
            Colors.cyan.shade700,
            '🐠',
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          // Ikan Cakalang
          _buildFishDetailCard(
            'CAKALANG',
            'Katsuwonus pelamis',
            [
              'CIRI KHAS UTAMA:',
              '• 4-6 garis horizontal gelap di PERUT',
              '• Punggung berwarna biru gelap',
              '• Tubuh berbentuk torpedo kokoh',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Garis-garis horizontal di perut (WAJIB!)',
              '✓ Punggung biru gelap',
              '✓ Bentuk tubuh yang robust',
              '✓ Jumlah garis (hitung: 4-6 garis)',
              '',
              'SUDUT TERBAIK:',
              '→ Foto dari samping, pastikan perut terlihat',
              '→ Garis harus kontras dan jelas terhitung',
            ],
            Colors.indigo.shade700,
            '🐟',
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          // Ikan Tuna
          _buildFishDetailCard(
            'TUNA',
            'Thunnus spp.',
            [
              'CIRI KHAS UTAMA:',
              '• Ukuran BESAR (umumnya >30cm)',
              '• Sirip kuning (pada beberapa spesies)',
              '• Tubuh bulat dan berotot',
              '• Ekor sangat kuat berbentuk bulan sabit',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Ukuran keseluruhan dengan referensi',
              '✓ Warna sirip (kuning/biru)',
              '✓ Bentuk ekor yang khas',
              '✓ Proporsi tubuh yang besar',
              '',
              'SUDUT TERBAIK:',
              '→ Foto penuh dengan objek referensi ukuran',
              '→ Pastikan sirip dan ekor terlihat jelas',
            ],
            Colors.amber.shade800,
            '🎣',
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          // Ikan Kembung
          _buildFishDetailCard(
            'KEMBUNG',
            'Rastrelliger spp.',
            [
              'CIRI KHAS UTAMA:',
              '• Tubuh pipih perak mengkilap',
              '• Corak garis-garis bergelombang di punggung',
              '• Ukuran sedang (15-25cm)',
              '• Mata relatif besar',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Corak bergelombang di punggung',
              '✓ Warna perak mengkilap',
              '✓ Bentuk tubuh yang agak pipih',
              '✓ Ukuran mata yang proporsional',
              '',
              'SUDUT TERBAIK:',
              '→ Foto dari samping dengan cahaya cukup',
              '→ Corak punggung harus terlihat kontras',
            ],
            Colors.grey.shade700,
            '🐟',
            fs,
            sp,
          ),

          SizedBox(height: sp(16)),

          // Ikan Layang
          _buildFishDetailCard(
            'LAYANG',
            'Decapterus spp.',
            [
              'CIRI KHAS UTAMA:',
              '• Tubuh ramping dan streamline',
              '• Ekor bercabang dalam (forked)',
              '• Garis lateral hitam memanjang',
              '• Sisik mudah lepas',
              '',
              'YANG HARUS DIFOTO:',
              '✓ Bentuk ekor bercabang yang jelas',
              '✓ Garis lateral hitam di sisi tubuh',
              '✓ Proporsi tubuh yang ramping',
              '✓ Sirip dada yang panjang',
              '',
              'SUDUT TERBAIK:',
              '→ Foto profil lengkap untuk garis lateral',
              '→ Fokus pada bentuk ekor yang khas',
            ],
            Colors.teal.shade700,
            '🐠',
            fs,
            sp,
          ),

          SizedBox(height: sp(24)),

          // Quick Reference Card
          _buildQuickReferenceCard(fs, sp),

          SizedBox(height: sp(20)),
        ],
      ),
    );
  }


  // Helper Widgets
  Widget _buildStepCard(
    String number,
    String title,
    List<String> points,
    IconData icon,
    MaterialColor color,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(18)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(16)),
        border: Border.all(color: color.shade200, width: 2),
        boxShadow: [
          BoxShadow(
            color: color.shade100,
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: sp(52),
            height: sp(52),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.shade400, color.shade600],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(sp(14)),
              boxShadow: [
                BoxShadow(
                  color: color.shade300,
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Center(
              child: Text(
                number,
                style: TextStyle(
                  fontSize: fs(26),
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          SizedBox(width: sp(16)),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, color: color.shade700, size: fs(22)),
                    SizedBox(width: sp(8)),
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: fs(16),
                          fontWeight: FontWeight.bold,
                          color: color.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: sp(14)),
                ...points.map((point) => Padding(
                  padding: EdgeInsets.only(bottom: sp(8)),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        margin: EdgeInsets.only(top: sp(5)),
                        width: sp(6),
                        height: sp(6),
                        decoration: BoxDecoration(
                          color: color.shade600,
                          shape: BoxShape.circle,
                        ),
                      ),
                      SizedBox(width: sp(10)),
                      Expanded(
                        child: Text(
                          point,
                          style: TextStyle(
                            fontSize: fs(13),
                            color: Colors.grey.shade700,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                )).toList(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDosDontsCard(
    String title,
    List<String> items,
    MaterialColor color,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(color: color.shade300, width: 2),
        boxShadow: [
          BoxShadow(
            color: color.shade200.withOpacity(0.5),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: fs(14),
              fontWeight: FontWeight.bold,
              color: color.shade900,
            ),
          ),
          SizedBox(height: sp(14)),
          ...items.map((item) => Padding(
            padding: EdgeInsets.only(bottom: sp(10)),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: EdgeInsets.only(top: sp(4)),
                  width: sp(5),
                  height: sp(5),
                  decoration: BoxDecoration(
                    color: color.shade700,
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: sp(8)),
                Expanded(
                  child: Text(
                    item,
                    style: TextStyle(
                      fontSize: fs(12),
                      color: color.shade800,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          )).toList(),
        ],
      ),
    );
  }

  Widget _buildFishDetailCard(
    String name,
    String scientificName,
    List<String> details,
    Color color,
    String emoji,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(16)),
        border: Border.all(color: color.withOpacity(0.3), width: 2),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.15),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.all(sp(18)),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color.withOpacity(0.15), color.withOpacity(0.05)],
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(sp(14)),
                topRight: Radius.circular(sp(14)),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: EdgeInsets.all(sp(12)),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(sp(12)),
                    boxShadow: [
                      BoxShadow(
                        color: color.withOpacity(0.2),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    emoji,
                    style: TextStyle(fontSize: fs(28)),
                  ),
                ),
                SizedBox(width: sp(14)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: TextStyle(
                          fontSize: fs(19),
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      SizedBox(height: sp(4)),
                      Text(
                        scientificName,
                        style: TextStyle(
                          fontSize: fs(12),
                          fontStyle: FontStyle.italic,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Content
          Padding(
            padding: EdgeInsets.all(sp(18)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Placeholder for fish image with better styling
                Container(
                  width: double.infinity,
                  height: sp(160),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.grey.shade50, Colors.grey.shade100],
                    ),
                    borderRadius: BorderRadius.circular(sp(12)),
                    border: Border.all(color: color.withOpacity(0.2), width: 2),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.photo_camera, size: fs(44), color: Colors.grey.shade400),
                      SizedBox(height: sp(10)),
                      Text(
                        'Foto Contoh $name',
                        style: TextStyle(
                          fontSize: fs(13),
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      SizedBox(height: sp(4)),
                      Text(
                        'Tambahkan foto referensi di sini',
                        style: TextStyle(
                          fontSize: fs(11),
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: sp(18)),
                ...details.map((detail) {
                  if (detail.isEmpty) return SizedBox(height: sp(10));
                  
                  final isBold = detail.endsWith(':');
                  final isCheckmark = detail.startsWith('✓');
                  final isArrow = detail.startsWith('→');
                  
                  return Padding(
                    padding: EdgeInsets.only(bottom: sp(6)),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (isCheckmark || isArrow)
                          Padding(
                            padding: EdgeInsets.only(right: sp(8)),
                            child: Text(
                              isCheckmark ? '✓' : '→',
                              style: TextStyle(
                                fontSize: fs(14),
                                color: isCheckmark ? Colors.green.shade600 : color,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        Expanded(
                          child: Text(
                            detail.replaceAll('✓ ', '').replaceAll('→ ', ''),
                            style: TextStyle(
                              fontSize: fs(13),
                              color: isBold ? color : Colors.grey.shade700,
                              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
                              height: 1.6,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          ),
        ],
      ),
    );
  }



  Widget _buildQuickReferenceCard(double Function(double) fs, double Function(double) sp) {
    return Container(
      padding: EdgeInsets.all(sp(18)),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.amber.shade50, Colors.orange.shade50],
        ),
        borderRadius: BorderRadius.circular(sp(16)),
        border: Border.all(color: Colors.orange.shade300, width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb_outline, color: Colors.orange.shade700, size: fs(24)),
              SizedBox(width: sp(12)),
              Text(
                'Referensi Cepat',
                style: TextStyle(
                  fontSize: fs(17),
                  fontWeight: FontWeight.bold,
                  color: Colors.orange.shade900,
                ),
              ),
            ],
          ),
          SizedBox(height: sp(14)),
          Text(
            'Ingat ciri khas utama:',
            style: TextStyle(
              fontSize: fs(13),
              fontWeight: FontWeight.w600,
              color: Colors.orange.shade800,
            ),
          ),
          SizedBox(height: sp(10)),
          _buildQuickRefItem('Tongkol', 'Corak batik di punggung', fs, sp),
          _buildQuickRefItem('Tenggiri', 'Tubuh panjang + gigi tajam', fs, sp),
          _buildQuickRefItem('Cakalang', '4-6 garis di perut', fs, sp),
          _buildQuickRefItem('Tuna', 'Ukuran besar + sirip kuning', fs, sp),
          _buildQuickRefItem('Kembung', 'Garis bergelombang punggung', fs, sp),
          _buildQuickRefItem('Layang', 'Ekor bercabang + garis lateral', fs, sp),
        ],
      ),
    );
  }

  Widget _buildQuickRefItem(String fish, String feature, double Function(double) fs, double Function(double) sp) {
    return Padding(
      padding: EdgeInsets.only(bottom: sp(8)),
      child: Row(
        children: [
          Container(
            width: sp(6),
            height: sp(6),
            decoration: BoxDecoration(
              color: Colors.orange.shade600,
              shape: BoxShape.circle,
            ),
          ),
          SizedBox(width: sp(10)),
          Text(
            '$fish: ',
            style: TextStyle(
              fontSize: fs(12),
              fontWeight: FontWeight.bold,
              color: Colors.orange.shade900,
            ),
          ),
          Expanded(
            child: Text(
              feature,
              style: TextStyle(
                fontSize: fs(12),
                color: Colors.orange.shade800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}