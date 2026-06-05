import 'dart:io';
import 'package:e_logbook/provider/catch_provider.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/catch_model.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch catch data when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final catchProvider = Provider.of<CatchProvider>(context, listen: false);
      catchProvider.fetchCatches();
    });
  }

  // Orientation handling removed - let AndroidManifest handle it

  Widget build(BuildContext context) {
    final isTablet = ResponsiveHelper.isTablet(context);
    
    return Scaffold(
      appBar: isTablet ? null : _buildAppBar(context, isTablet),
      body: Consumer<CatchProvider>(
        builder: (context, catchProvider, child) {
          if (isTablet) {
            return _buildTabletLayout(catchProvider);
          }
          return _buildMobileLayout(catchProvider);
        },
      ),
    );
  }

  // ========================================================================
  // APP BAR
  // ========================================================================
  PreferredSizeWidget _buildAppBar(BuildContext context, bool isTablet) {
    return AppBar(
      elevation: 0,
      backgroundColor: Colors.transparent,
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ),
      title: Text(
        'Riwayat Tangkapan',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: Colors.white,
          fontSize: isTablet ? 20 : 18,
        ),
      ),
      centerTitle: true,
    );
  }

  // ========================================================================
  // MOBILE LAYOUT
  // ========================================================================
  Widget _buildMobileLayout(CatchProvider catchProvider) {
    if (catchProvider.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (catchProvider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 60, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              catchProvider.error!,
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => catchProvider.fetchCatches(),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      );
    }

    return Builder(
      builder: (context) {
        final width = MediaQuery.of(context).size.width;
        double fs(double size) => size * (width / 390);
        double sp(double value) => value * (width / 390);

        return RefreshIndicator(
          onRefresh: () => catchProvider.fetchCatches(),
          child: ListView(
            padding: EdgeInsets.all(sp(16)),
            children: [
              _buildSummaryCardMobile(catchProvider, fs, sp),
              SizedBox(height: sp(20)),

              if (catchProvider.catches.isEmpty)
                _buildEmptyStateWithDummy(fs, sp)
              else
                ..._buildGroupedCatchesMobile(catchProvider.catches, fs, sp),
            ],
          ),
        );
      },
    );
  }

  // ========================================================================
  // TABLET LAYOUT
  // ========================================================================
  Widget _buildTabletLayout(CatchProvider catchProvider) {
    // Check if opened via navigation (fullscreen) or embedded in MainScreen
    final isFullscreen = ModalRoute.of(context)?.settings.name != null;
    
    if (catchProvider.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (catchProvider.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 60, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              catchProvider.error!,
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => catchProvider.fetchCatches(),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      );
    }
    
    return RefreshIndicator(
      onRefresh: () => catchProvider.fetchCatches(),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(30),
        child: Column(
          children: [
            // Back button only for fullscreen tablet
            if (isFullscreen)
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Color(0xFF1B4F9C)),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Riwayat Tangkapan',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B4F9C),
                    ),
                  ),
                ],
              ),
            if (isFullscreen) const SizedBox(height: 20),
            
            _buildSummaryCardTablet(catchProvider),
            const SizedBox(height: 20),

            if (catchProvider.catches.isEmpty)
              _buildEmptyStateWithDummyTablet()
            else
              _buildGroupedCatchesTablet(catchProvider.catches),
          ],
        ),
      ),
    );
  }

  // ========================================================================
  // SUMMARY CARD - MOBILE
  // ========================================================================
  Widget _buildSummaryCardMobile(
    CatchProvider provider,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    // Gunakan SEMUA data, bukan hanya bulan ini
    final allCatches = provider.catches;
    final totalWeight = allCatches.fold<double>(0, (sum, c) => sum + c.weight);
    final totalRevenue = allCatches.fold<double>(0, (sum, c) => sum + c.totalRevenue);
    final totalTrips = allCatches.length;
    
    return Container(
      padding: EdgeInsets.all(sp(20)),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
        ),
        borderRadius: BorderRadius.circular(sp(16)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1B4F9C).withOpacity(0.3),
            blurRadius: sp(15),
            offset: Offset(0, sp(5)),
          )
        ],
      ),
      child: Column(
        children: [
          Text(
            'Total Keseluruhan',
            style: TextStyle(
              color: Colors.white70,
              fontSize: fs(14),
            ),
          ),
          SizedBox(height: sp(8)),
          Text(
            'Rp ${_formatMoney(totalRevenue)}',
            style: TextStyle(
              color: Colors.white,
              fontSize: fs(32),
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: sp(16)),
          Divider(color: Colors.white30, height: 1),
          SizedBox(height: sp(16)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItemMobile(
                'Total Tangkapan',
                '${totalWeight.toStringAsFixed(1)} kg',
                Icons.scale_rounded,
                fs,
                sp,
              ),
              Container(width: 1, height: sp(40), color: Colors.white30),
              _buildStatItemMobile(
                'Total Trip',
                '$totalTrips Trip',
                Icons.sailing_rounded,
                fs,
                sp,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItemMobile(
    String label,
    String value,
    IconData icon,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: fs(24)),
        SizedBox(height: sp(8)),
        Text(
          label,
          style: TextStyle(
            color: Colors.white70,
            fontSize: fs(12),
          ),
        ),
        SizedBox(height: sp(4)),
        Text(
          value,
          style: TextStyle(
            color: Colors.white,
            fontSize: fs(18),
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  // ========================================================================
  // SUMMARY CARD - TABLET
  // ========================================================================
  Widget _buildSummaryCardTablet(CatchProvider provider) {
    // Gunakan SEMUA data, bukan hanya bulan ini
    final allCatches = provider.catches;
    final totalWeight = allCatches.fold<double>(0, (sum, c) => sum + c.weight);
    final totalRevenue = allCatches.fold<double>(0, (sum, c) => sum + c.totalRevenue);
    final totalTrips = allCatches.length;
    
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1B4F9C).withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 5),
          )
        ],
      ),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Total Keseluruhan',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Rp ${_formatMoney(totalRevenue)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          Container(width: 2, height: 60, color: Colors.white30),
          const SizedBox(width: 24),
          Expanded(
            child: _buildStatItemTablet(
              'Total Tangkapan',
              '${totalWeight.toStringAsFixed(1)} kg',
              Icons.scale_rounded,
            ),
          ),
          const SizedBox(width: 24),
          Expanded(
            child: _buildStatItemTablet(
              'Total Trip',
              '$totalTrips Trip',
              Icons.sailing_rounded,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItemTablet(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 28),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 12,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  // ========================================================================
  // EMPTY STATE
  // ========================================================================
  Widget _buildEmptyStateWithDummy(
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Container(
      padding: EdgeInsets.all(sp(48)),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(sp(16)),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: fs(80), color: Colors.grey[400]),
          SizedBox(height: sp(16)),
          Text(
            'Belum Ada Riwayat',
            style: TextStyle(
              fontSize: fs(18),
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: sp(8)),
          Text(
            'Mulai catat tangkapan Anda',
            style: TextStyle(fontSize: fs(14), color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyStateWithDummyTablet() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Belum Ada Riwayat',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Mulai catat tangkapan Anda',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }



  // ========================================================================
  // GROUPED CATCHES - MOBILE
  // ========================================================================
  List<Widget> _buildGroupedCatchesMobile(
    List<CatchModel> catches,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    // Sort by id descending (terbaru di atas)
    final sorted = [...catches]..sort((a, b) => (b.id ?? 0).compareTo(a.id ?? 0));

    final grouped = <String, List<CatchModel>>{};
    for (var c in sorted) {
      final dateKey = DateFormat('yyyy-MM-dd').format(c.displayDate);
      grouped.putIfAbsent(dateKey, () => []).add(c);
    }

    // Sort dateKey descending
    final sortedKeys = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    final widgets = <Widget>[];

    for (final dateKey in sortedKeys) {
      final list = grouped[dateKey]!;
      final date = DateTime.parse(dateKey);

      String label;
      if (_isSameDay(date, today)) {
        label = "Hari Ini - ${DateFormat('dd MMM yyyy').format(date)}";
      } else if (_isSameDay(date, yesterday)) {
        label = "Kemarin - ${DateFormat('dd MMM yyyy').format(date)}";
      } else {
        label = DateFormat('dd MMM yyyy').format(date);
      }

      widgets.add(_buildDateSection(label, fs, sp));
      widgets.add(SizedBox(height: sp(10)));
      for (var c in list) {
        widgets.add(_historyItemMobile(c, fs, sp));
      }
      widgets.add(SizedBox(height: sp(20)));
    }

    return widgets;
  }

  Widget _buildDateSection(String text, double Function(double) fs, double Function(double) sp) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: sp(6)),
      child: Text(
        text,
        style: TextStyle(
          fontSize: fs(16),
          fontWeight: FontWeight.bold,
          color: const Color(0xFF1B4F9C),
        ),
      ),
    );
  }

  Widget _historyItemMobile(
    CatchModel data,
    double Function(double) fs,
    double Function(double) sp,
  ) {
    return Builder(
      builder: (context) {
        return InkWell(
          onTap: () => NavigationHelper.pushNamedNoTransition(
            context,
            '/catch-detail',
            arguments: {'catchData': data},
          ),
          child: Container(
            margin: EdgeInsets.only(bottom: sp(12)),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(sp(16)),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  blurRadius: sp(8),
                  offset: Offset(0, sp(2)),
                ),
              ],
            ),
            child: Padding(
              padding: EdgeInsets.all(sp(16)),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(sp(12)),
                    child: data.photoPath.isNotEmpty
                        ? _buildCatchImage(data.photoPath, sp(100), sp(100), fs(40))
                        : Container(
                            width: sp(100),
                            height: sp(100),
                            color: Colors.blue.withOpacity(0.1),
                            child: Icon(Icons.image_not_supported,
                                color: Colors.grey, size: fs(40)),
                          ),
                  ),
                  SizedBox(width: sp(16)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data.fishName,
                          style: TextStyle(
                            fontSize: fs(16),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: sp(6)),
                        Row(
                          children: [
                            Icon(Icons.scale_rounded,
                                size: fs(14), color: Colors.grey[600]),
                            SizedBox(width: sp(4)),
                            Text(
                              data.weight > 0 
                                  ? '${data.weight.toStringAsFixed(1)} kg'
                                  : 'Berat tidak tersedia',
                              style: TextStyle(
                                fontSize: fs(13),
                                color: Colors.grey[600],
                              ),
                            ),
                            SizedBox(width: sp(12)),
                            Icon(Icons.access_time_rounded,
                                size: fs(14), color: Colors.grey[600]),
                            SizedBox(width: sp(4)),
                            Text(
                              data.departureTime,
                              style: TextStyle(
                                fontSize: fs(13),
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: sp(4)),
                        Row(
                          children: [
                            Icon(Icons.location_on_rounded,
                                size: fs(14), color: Colors.grey[600]),
                            SizedBox(width: sp(4)),
                            Expanded(
                              child: Text(
                                data.locationName,
                                style: TextStyle(
                                  fontSize: fs(13),
                                  color: Colors.grey[600],
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: sp(6)),
                        Container(
                          padding: EdgeInsets.symmetric(
                            horizontal: sp(8),
                            vertical: sp(4),
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(sp(6)),
                          ),
                          child: Text(
                            data.fishingZone.split(' - ')[0],
                            style: TextStyle(
                              fontSize: fs(10),
                              color: Colors.blue,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Rp ${_formatMoney(data.totalRevenue)}',
                        style: TextStyle(
                          fontSize: fs(15),
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1B4F9C),
                        ),
                      ),
                      SizedBox(height: sp(4)),
                      Text(
                        '${data.tripDurationHours}j ${data.tripDurationMinutes}m',
                        style: TextStyle(fontSize: fs(11), color: Colors.grey[600]),
                      ),
                      SizedBox(height: sp(6)),
                      Container(
                        padding: EdgeInsets.symmetric(
                            horizontal: sp(8), vertical: sp(4)),
                        decoration: BoxDecoration(
                          color: _conditionColor(data.condition).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(sp(8)),
                        ),
                        child: Text(
                          data.condition,
                          style: TextStyle(
                            fontSize: fs(11),
                            fontWeight: FontWeight.w600,
                            color: _conditionColor(data.condition),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ========================================================================
  // GROUPED CATCHES - TABLET
  // ========================================================================
  Widget _buildGroupedCatchesTablet(List<CatchModel> catches) {
    final sorted = [...catches]..sort((a, b) => (b.id ?? 0).compareTo(a.id ?? 0));

    final grouped = <String, List<CatchModel>>{};
    for (var c in sorted) {
      final dateKey = DateFormat('yyyy-MM-dd').format(c.displayDate);
      grouped.putIfAbsent(dateKey, () => []).add(c);
    }

    final sortedKeys = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    return Column(
      children: sortedKeys.map((dateKey) {
        final list = grouped[dateKey]!;
        final date = DateTime.parse(dateKey);

        String label;
        if (_isSameDay(date, today)) {
          label = "Hari Ini - ${DateFormat('dd MMM yyyy').format(date)}";
        } else if (_isSameDay(date, yesterday)) {
          label = "Kemarin - ${DateFormat('dd MMM yyyy').format(date)}";
        } else {
          label = DateFormat('dd MMM yyyy').format(date);
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1B4F9C),
                ),
              ),
            ),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.4,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: list.length,
              itemBuilder: (context, index) => _historyItemTablet(list[index]),
            ),
            const SizedBox(height: 24),
          ],
        );
      }).toList(),
    );
  }

  Widget _historyItemTablet(CatchModel data) {
    return Builder(
      builder: (context) {
        return InkWell(
          onTap: () => NavigationHelper.pushNamedNoTransition(
            context,
            '/catch-detail',
            arguments: {'catchData': data},
          ),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: data.photoPath.isNotEmpty
                          ? _buildCatchImage(data.photoPath, 70, 70, 30)
                          : Container(
                              width: 70,
                              height: 70,
                              color: Colors.blue.withOpacity(0.1),
                              child: const Icon(Icons.image_not_supported,
                                  color: Colors.grey, size: 30),
                            ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            data.fishName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Rp ${_formatMoney(data.totalRevenue)}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1B4F9C),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.scale_rounded, size: 13, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      data.weight > 0
                          ? '${data.weight} kg'
                          : 'Berat tidak tersedia',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                    const SizedBox(width: 12),
                    Icon(Icons.access_time_rounded, size: 13, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(
                      data.departureTime.isNotEmpty && data.departureTime != '00:00'
                          ? data.departureTime
                          : '${data.tripDurationHours}j ${data.tripDurationMinutes}m',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.location_on_rounded, size: 13, color: Colors.grey[600]),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        data.locationName,
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        data.fishingZone.split(' - ')[0],
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.blue,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _conditionColor(data.condition).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        data.condition,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _conditionColor(data.condition),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  Color _conditionColor(String v) {
    switch (v) {
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

  String _formatMoney(double amount) {
    if (amount >= 1000000) return '${(amount / 1000000).toStringAsFixed(1)}jt';
    if (amount >= 1000) return '${(amount / 1000).toStringAsFixed(0)}k';
    return amount.toStringAsFixed(0);
  }

  // Helper untuk load image dengan error handling
  Widget _buildCatchImage(String photoPath, double width, double height, double iconSize) {
    try {
      final file = File(photoPath);
      if (file.existsSync()) {
        return Image.file(
          file,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: width,
              height: height,
              color: Colors.blue.withOpacity(0.1),
              child: Icon(Icons.image_not_supported, color: Colors.grey, size: iconSize),
            );
          },
        );
      }
    } catch (e) {
      // Ignore error, return placeholder
    }
    return Container(
      width: width,
      height: height,
      color: Colors.blue.withOpacity(0.1),
      child: Icon(Icons.image_not_supported, color: Colors.grey, size: iconSize),
    );
  }
}