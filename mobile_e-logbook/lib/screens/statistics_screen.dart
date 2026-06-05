import 'package:e_logbook/provider/catch_provider.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  String _selectedPeriod = 'Bulanan';

  @override
  void initState() {
    super.initState();
    // Load data saat screen dibuka
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final catchProvider = Provider.of<CatchProvider>(context, listen: false);
      if (catchProvider.catches.isEmpty) {
        catchProvider.fetchCatches();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = ResponsiveHelper.isTablet(context);

    if (isTablet) {
      return _buildTabletLayout();
    }

    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        automaticallyImplyLeading: false,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
        title: const Text(
          'Statistik Tangkapan',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      body: Consumer<CatchProvider>(
        builder: (context, catchProvider, child) {
          // Loading state
          if (catchProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }
          
          // Empty state
          if (catchProvider.catches.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.bar_chart_rounded,
                    size: 80,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Belum ada data tangkapan',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Mulai catat tangkapan untuk melihat statistik',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            );
          }
          
          return RefreshIndicator(
            onRefresh: () => catchProvider.fetchCatches(),
            child: SingleChildScrollView(
              padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildPeriodSelector(),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 20, tablet: 28)),
                  _buildSummaryCards(catchProvider),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 24, tablet: 32)),
                  _buildWeightChart(catchProvider),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 24, tablet: 32)),
                  _buildRevenueChart(catchProvider),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 24, tablet: 32)),
                  _buildFishTypeChart(catchProvider),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 24, tablet: 32)),
                  _buildTripAnalysis(catchProvider),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
  Widget _buildTabletLayout() {
    return Consumer<CatchProvider>(
      builder: (context, catchProvider, child) {
        if (catchProvider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        
        if (catchProvider.catches.isEmpty) {
          return Center(
            child: Text(
              'Belum ada data tangkapan',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
          );
        }
        
        return RefreshIndicator(
          onRefresh: () => catchProvider.fetchCatches(),
          child: SingleChildScrollView(
            child: Container(
              color: Colors.grey[100],
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildPeriodSelector(),
                        const SizedBox(height: 28),
                        _buildSummaryCards(catchProvider),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  _buildWeightChart(catchProvider),
                  const SizedBox(height: 28),
                  _buildRevenueChart(catchProvider),
                  const SizedBox(height: 28),
                  _buildFishTypeChart(catchProvider),
                  const SizedBox(height: 28),
                  _buildTripAnalysis(catchProvider),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPeriodSelector() {
    final periods = ['Bulanan', 'Tahunan'];
    return Container(
      padding: EdgeInsets.all(ResponsiveHelper.width(context, mobile: 4, tablet: 6)),
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
      ),
      child: Row(
        children: periods.map((period) {
          final isSelected = _selectedPeriod == period;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedPeriod = period),
              child: Container(
                padding: EdgeInsets.symmetric(
                  vertical: ResponsiveHelper.height(context, mobile: 12, tablet: 16),
                ),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF1B4F9C) : Colors.transparent,
                  borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 10, tablet: 14)),
                ),
                child: Text(
                  period,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey[700],
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    fontSize: ResponsiveHelper.font(context, mobile: 13, tablet: 15),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildSummaryCards(CatchProvider provider) {
    debugPrint('\n📊 [Statistics] Building summary cards');
    debugPrint('📊 [Statistics] Total catches: ${provider.catches.length}');
    
    // TAMPILKAN SEMUA DATA tanpa filter
    final allCatches = provider.catches;
    final totalWeight = allCatches.fold<double>(0, (sum, c) => sum + c.weight);
    final totalRevenue = allCatches.fold<double>(0, (sum, c) => sum + c.totalRevenue);
    
    debugPrint('📊 [Statistics] Total weight: ${totalWeight.toStringAsFixed(1)} kg');
    debugPrint('📊 [Statistics] Total revenue: Rp ${totalRevenue.toStringAsFixed(0)}');
    
    // Debug per periode
    final now = DateTime.now();
    if (_selectedPeriod == 'Bulanan') {
      final monthCatches = allCatches.where((c) => 
        c.departureDate.year == now.year && c.departureDate.month == now.month
      ).length;
      debugPrint('📊 [Statistics] Catches this month (${now.year}-${now.month}): $monthCatches');
      // Debug: tampilkan tanggal data yang ada
      if (allCatches.isNotEmpty) {
        debugPrint('📊 [Statistics] Sample dates in data:');
        for (var c in allCatches.take(3)) {
          debugPrint('   - ${c.fishName}: ${c.departureDate.year}-${c.departureDate.month}-${c.departureDate.day}');
        }
      }
    } else {
      final yearCatches = allCatches.where((c) => 
        c.departureDate.year == now.year
      ).length;
      debugPrint('📊 [Statistics] Catches this year (${now.year}): $yearCatches');
    }
    debugPrint('');
    
    return Row(
      children: [
        Expanded(
          child: _buildSummaryCard(
            'Total Berat',
            '${totalWeight.toStringAsFixed(1)} kg',
            Icons.scale_rounded,
            Colors.blue,
            '+12.5%',
            true,
          ),
        ),
        SizedBox(width: ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
        Expanded(
          child: _buildSummaryCard(
            'Total Pendapatan',
            'Rp ${_formatCurrency(totalRevenue)}',
            Icons.payments_rounded,
            Colors.green,
            '+8.3%',
            true,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard(
    String title,
    String value,
    IconData icon,
    Color color,
    String change,
    bool isPositive,
  ) {
    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        border: Border.all(color: Colors.grey.withOpacity(0.15), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            blurRadius: ResponsiveHelper.width(context, mobile: 10, tablet: 14),
            offset: Offset(0, ResponsiveHelper.height(context, mobile: 3, tablet: 4)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: ResponsiveHelper.width(context, mobile: 24, tablet: 28)),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: ResponsiveHelper.width(context, mobile: 8, tablet: 10),
                  vertical: ResponsiveHelper.height(context, mobile: 4, tablet: 6),
                ),
                decoration: BoxDecoration(
                  color: isPositive
                      ? Colors.green.withOpacity(0.1)
                      : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isPositive ? Icons.arrow_upward : Icons.arrow_downward,
                      size: ResponsiveHelper.width(context, mobile: 12, tablet: 14),
                      color: isPositive ? Colors.green : Colors.red,
                    ),
                    SizedBox(width: ResponsiveHelper.width(context, mobile: 2, tablet: 3)),
                    Text(
                      change,
                      style: TextStyle(
                        fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                        fontWeight: FontWeight.bold,
                        color: isPositive ? Colors.green : Colors.red,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
          Text(
            value,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 18, tablet: 22),
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 4, tablet: 6)),
          Text(
            title, 
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14), 
              color: Colors.grey[600]
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildWeightChart(CatchProvider provider) {
    final now = DateTime.now();
    List<double> chartData;
    List<String> labels;
    String subtitle;

    if (_selectedPeriod == 'Bulanan') {
      chartData = [];
      labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
      
      final hasRecentData = provider.catches.any((c) => 
        now.difference(c.departureDate).inDays <= 30
      );
      
      if (!hasRecentData && provider.catches.isNotEmpty) {
        final latestDate = provider.catches
          .map((c) => c.departureDate)
          .reduce((a, b) => a.isAfter(b) ? a : b);
        
        for (int i = 0; i < 4; i++) {
          final weekStart = DateTime(latestDate.year, latestDate.month, 1)
            .add(Duration(days: i * 7));
          final weekEnd = weekStart.add(const Duration(days: 6));
          
          final weekWeight = provider.catches.where((c) {
            return c.departureDate.isAfter(weekStart.subtract(const Duration(days: 1))) &&
                   c.departureDate.isBefore(weekEnd.add(const Duration(days: 1)));
          }).fold<double>(0, (sum, c) => sum + c.weight);
          
          chartData.add(weekWeight);
        }
        subtitle = 'Data: ${latestDate.month}/${latestDate.year}';
      } else {
        for (int i = 0; i < 4; i++) {
          final weekStart = now.subtract(Duration(days: (3 - i) * 7));
          final weekEnd = weekStart.add(const Duration(days: 6));
          
          final weekWeight = provider.catches.where((c) {
            return c.departureDate.isAfter(weekStart.subtract(const Duration(days: 1))) &&
                   c.departureDate.isBefore(weekEnd.add(const Duration(days: 1)));
          }).fold<double>(0, (sum, c) => sum + c.weight);
          
          chartData.add(weekWeight);
        }
        subtitle = '4 minggu terakhir';
      }
    } else {
      // Data 12 bulan - gunakan semua data yang ada
      chartData = [];
      final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      labels = [];
      
      // Cari tahun yang ada datanya
      final years = provider.catches.map((c) => c.departureDate.year).toSet().toList()..sort();
      final targetYear = years.isNotEmpty ? years.last : now.year;
      
      for (int month = 1; month <= 12; month++) {
        final monthWeight = provider.catches.where((c) {
          return c.departureDate.year == targetYear &&
                 c.departureDate.month == month;
        }).fold<double>(0, (sum, c) => sum + c.weight);
        
        chartData.add(monthWeight);
        labels.add(monthNames[month - 1]);
      }
      subtitle = 'Tahun $targetYear';
    }

    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Berat Tangkapan',
                style: TextStyle(
                  fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 18), 
                  fontWeight: FontWeight.bold
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14), 
                  color: Colors.grey[600]
                ),
              ),
            ],
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 20, tablet: 24)),
          SizedBox(
            height: ResponsiveHelper.height(context, mobile: 200, tablet: 240),
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 10,
                  getDrawingHorizontalLine: (value) {
                    return FlLine(color: Colors.grey[200]!, strokeWidth: 1);
                  },
                ),
                titlesData: FlTitlesData(
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      interval: 1,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 && value.toInt() < labels.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              labels[value.toInt()],
                              style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                            ),
                          );
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 40,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          '${value.toInt()}kg',
                          style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                        );
                      },
                    ),
                  ),
                ),
                borderData: FlBorderData(show: false),
                minX: 0,
                maxX: (chartData.length - 1).toDouble(),
                minY: 0,
                maxY: chartData.isEmpty || chartData.every((e) => e == 0)
                    ? 50
                    : (chartData.reduce((a, b) => a > b ? a : b) * 1.2),
                lineBarsData: [
                  LineChartBarData(
                    spots: List.generate(
                      chartData.length,
                      (index) => FlSpot(index.toDouble(), chartData[index]),
                    ),
                    isCurved: true,
                    color: const Color(0xFF1B4F9C),
                    barWidth: 3,
                    isStrokeCapRound: true,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, percent, barData, index) {
                        return FlDotCirclePainter(
                          radius: 4,
                          color: Colors.white,
                          strokeWidth: 2,
                          strokeColor: const Color(0xFF1B4F9C),
                        );
                      },
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      color: const Color(0xFF1B4F9C).withOpacity(0.1),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueChart(CatchProvider provider) {
    final now = DateTime.now();
    List<double> chartData;
    List<String> labels;
    String title;

    if (_selectedPeriod == 'Bulanan') {
      chartData = [];
      labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
      
      final hasRecentData = provider.catches.any((c) => 
        now.difference(c.departureDate).inDays <= 30
      );
      
      if (!hasRecentData && provider.catches.isNotEmpty) {
        final latestDate = provider.catches
          .map((c) => c.departureDate)
          .reduce((a, b) => a.isAfter(b) ? a : b);
        
        for (int i = 0; i < 4; i++) {
          final weekStart = DateTime(latestDate.year, latestDate.month, 1)
            .add(Duration(days: i * 7));
          final weekEnd = weekStart.add(const Duration(days: 6));
          
          final weekRevenue = provider.catches.where((c) {
            return c.departureDate.isAfter(weekStart.subtract(const Duration(days: 1))) &&
                   c.departureDate.isBefore(weekEnd.add(const Duration(days: 1)));
          }).fold<double>(0, (sum, c) => sum + c.totalRevenue);
          
          chartData.add(weekRevenue);
        }
        title = 'Pendapatan ${latestDate.month}/${latestDate.year}';
      } else {
        for (int i = 0; i < 4; i++) {
          final weekStart = now.subtract(Duration(days: (3 - i) * 7));
          final weekEnd = weekStart.add(const Duration(days: 6));
          
          final weekRevenue = provider.catches.where((c) {
            return c.departureDate.isAfter(weekStart.subtract(const Duration(days: 1))) &&
                   c.departureDate.isBefore(weekEnd.add(const Duration(days: 1)));
          }).fold<double>(0, (sum, c) => sum + c.totalRevenue);
          
          chartData.add(weekRevenue);
        }
        title = 'Pendapatan 4 Minggu Terakhir';
      }
    } else {
      chartData = [];
      final monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      labels = [];
      
      final years = provider.catches.map((c) => c.departureDate.year).toSet().toList()..sort();
      final targetYear = years.isNotEmpty ? years.last : now.year;
      
      for (int month = 1; month <= 12; month++) {
        final monthRevenue = provider.catches.where((c) {
          return c.departureDate.year == targetYear &&
                 c.departureDate.month == month;
        }).fold<double>(0, (sum, c) => sum + c.totalRevenue);
        
        chartData.add(monthRevenue);
        labels.add(monthNames[month - 1]);
      }
      title = 'Pendapatan Tahun $targetYear';
    }

    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 18), 
              fontWeight: FontWeight.bold
            ),
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 20, tablet: 24)),
          SizedBox(
            height: ResponsiveHelper.height(context, mobile: 200, tablet: 240),
            child: BarChart(
              BarChartData(
                alignment: BarChartAlignment.spaceAround,
                maxY: chartData.isEmpty || chartData.every((e) => e == 0)
                    ? 3000000
                    : (chartData.reduce((a, b) => a > b ? a : b) * 1.2),
                barTouchData: BarTouchData(enabled: false),
                titlesData: FlTitlesData(
                  show: true,
                  rightTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  topTitles: const AxisTitles(
                    sideTitles: SideTitles(showTitles: false),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (value, meta) {
                        if (value.toInt() >= 0 && value.toInt() < labels.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              labels[value.toInt()],
                              style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                            ),
                          );
                        }
                        return const Text('');
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 50,
                      getTitlesWidget: (value, meta) {
                        return Text(
                          '${(value / 1000).toStringAsFixed(0)}k',
                          style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                        );
                      },
                    ),
                  ),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (value) {
                    return FlLine(color: Colors.grey[200]!, strokeWidth: 1);
                  },
                ),
                borderData: FlBorderData(show: false),
                barGroups: List.generate(
                  chartData.length,
                  (index) => BarChartGroupData(
                    x: index,
                    barRods: [
                      BarChartRodData(
                        toY: chartData[index],
                        color: chartData[index] > 0 ? Colors.green : Colors.grey[300],
                        width: 16,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(6),
                          topRight: Radius.circular(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFishTypeChart(CatchProvider provider) {
    // Hitung jenis ikan terbanyak
    final fishCount = <String, int>{};
    for (var catch_ in provider.catches) {
      fishCount[catch_.fishName] = (fishCount[catch_.fishName] ?? 0) + 1;
    }

    final sortedFish = fishCount.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top4 = sortedFish.take(4).toList();

    if (top4.isEmpty) {
      return Container(
        padding: ResponsiveHelper.padding(context, mobile: 32, tablet: 40),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        ),
        child: Center(
          child: Text(
            'Belum ada data',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
            ),
          ),
        ),
      );
    }

    final total = top4.fold<int>(0, (sum, e) => sum + e.value);
    final colors = [Colors.blue, Colors.orange, Colors.green, Colors.purple];

    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Jenis Ikan Terbanyak',
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 18), 
              fontWeight: FontWeight.bold
            ),
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 20, tablet: 24)),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: ResponsiveHelper.height(context, mobile: 180, tablet: 220),
                  child: PieChart(
                    PieChartData(
                      sectionsSpace: 2,
                      centerSpaceRadius: 40,
                      sections: List.generate(top4.length, (index) {
                        final percentage = (top4[index].value / total * 100).round();
                        return PieChartSectionData(
                          value: top4[index].value.toDouble(),
                          title: '$percentage%',
                          color: colors[index],
                          radius: 50,
                          titleStyle: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        );
                      }),
                    ),
                  ),
                ),
              ),
              SizedBox(width: ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: List.generate(top4.length, (index) {
                    final percentage = (top4[index].value / total * 100).round();
                    return _buildLegendItem(
                      top4[index].key,
                      colors[index],
                      '$percentage%',
                    );
                  }),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, String percentage) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: ResponsiveHelper.height(context, mobile: 4, tablet: 6)),
      child: Row(
        children: [
          Container(
            width: ResponsiveHelper.width(context, mobile: 12, tablet: 14),
            height: ResponsiveHelper.height(context, mobile: 12, tablet: 14),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          SizedBox(width: ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
          Expanded(
            child: Text(
              label, 
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14)
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            percentage,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14), 
              fontWeight: FontWeight.bold
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripAnalysis(CatchProvider provider) {
    // Gunakan SEMUA data yang ada, bukan filter per periode
    final filteredCatches = provider.catches;
    final periodLabel = 'Total';
    
    final totalTrips = filteredCatches.length;
    
    final avgDuration = filteredCatches.isEmpty
        ? 0.0
        : filteredCatches.fold<double>(
                0, (sum, c) => sum + c.tripDurationHours + (c.tripDurationMinutes / 60)) /
            filteredCatches.length;

    final avgWeight = filteredCatches.isEmpty
        ? 0.0
        : filteredCatches.fold<double>(0, (sum, c) => sum + c.weight) /
            filteredCatches.length;
    
    final totalWeight = filteredCatches.fold<double>(0, (sum, c) => sum + c.weight);

    return Container(
      padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Analisis Trip',
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 18), 
              fontWeight: FontWeight.bold
            ),
          ),
          SizedBox(height: ResponsiveHelper.height(context, mobile: 16, tablet: 20)),
          _buildTripItem(
            'Total Trip $periodLabel',
            '$totalTrips Trip',
            Icons.directions_boat,
            Colors.blue,
          ),
          _buildTripItem(
            'Rata-rata Berat/Trip',
            '${avgWeight.toStringAsFixed(1)} kg',
            Icons.trending_up,
            Colors.green,
          ),
          _buildTripItem(
            'Durasi Rata-rata',
            '${avgDuration.toStringAsFixed(1)} jam',
            Icons.access_time,
            Colors.purple,
          ),
          _buildTripItem(
            'Total Berat $periodLabel',
            '${totalWeight.toStringAsFixed(1)} kg',
            Icons.scale,
            Colors.orange,
          ),
        ],
      ),
    );
  }

  Widget _buildTripItem(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      margin: EdgeInsets.only(bottom: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
      padding: ResponsiveHelper.padding(context, mobile: 12, tablet: 16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
      ),
      child: Row(
        children: [
          Container(
            padding: ResponsiveHelper.padding(context, mobile: 8, tablet: 10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
            ),
            child: Icon(
              icon, 
              color: color, 
              size: ResponsiveHelper.width(context, mobile: 20, tablet: 24)
            ),
          ),
          SizedBox(width: ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16), 
                fontWeight: FontWeight.w500
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  String _formatCurrency(double amount) {
    if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}jt';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(0)}k';
    }
    return amount.toStringAsFixed(0);
  }
}