import 'dart:io';
import 'package:e_logbook/models/catch_model.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';


class CatchDetailScreen extends StatelessWidget {
  final CatchModel catchData;

  const CatchDetailScreen({super.key, required this.catchData});

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    double fs(double size) => size * (width / 390);
    double sp(double value) => value * (width / 390);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Detail Tangkapan',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: fs(18),
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
        iconTheme: IconThemeData(color: Colors.white, size: fs(20)),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildPhotoHeader(sp),
            Padding(
              padding: EdgeInsets.all(sp(16)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildFishInfo(fs, sp),
                  SizedBox(height: sp(24)),
                  _buildFinancialCard(fs, sp),
                  SizedBox(height: sp(24)),
                  _buildInfoSection(fs, sp, '🚢 Informasi Kapal', [
                    'Nama Kapal: ${catchData.vesselName}',
                    'Nomor Kapal: ${catchData.vesselNumber}',
                    'Nahkoda: ${catchData.captainName}',
                    'Jumlah ABK: ${catchData.crewCount} orang',
                  ]),
                  SizedBox(height: sp(16)),
                  _buildInfoSection(fs, sp, '🐟 Informasi Tangkapan', [
                    'Berat: ${catchData.weight} kg',
                    'Jumlah: ${catchData.quantity} ekor',
                    'Harga per kg: Rp ${_formatNumber(catchData.pricePerKg)}',
                    'Total Pendapatan: Rp ${_formatNumber(catchData.totalRevenue)}',
                  ]),
                  SizedBox(height: sp(16)),
                  _buildInfoSection(fs, sp, '⏰ Waktu & Durasi', [
                    'Keberangkatan: ${DateFormat('dd MMM yyyy').format(catchData.departureDate)} - ${catchData.departureTime}',
                    'Kedatangan: ${DateFormat('dd MMM yyyy').format(catchData.arrivalDate)} - ${catchData.arrivalTime}',
                    'Durasi Trip: ${catchData.tripDurationHours} jam ${catchData.tripDurationMinutes} menit',
                  ]),
                  SizedBox(height: sp(16)),
                  _buildInfoSection(fs, sp, '📍 Lokasi & Zona', [
                    'Zona WPP: ${catchData.fishingZone}',
                    'Lokasi: ${catchData.locationName}',
                    'Koordinat: ${catchData.latitude.toStringAsFixed(6)}, ${catchData.longitude.toStringAsFixed(6)}',
                    'Kedalaman Air: ${catchData.waterDepth} meter',
                    'Cuaca: ${catchData.weatherCondition}',
                  ]),
                  SizedBox(height: sp(16)),
                  _buildInfoSection(fs, sp, '💰 Biaya Operasional', [
                    'Bahan Bakar: Rp ${_formatNumber(catchData.fuelCost)}',
                    'Operasional Lain: Rp ${_formatNumber(catchData.operationalCost)}',
                    'Pajak: Rp ${_formatNumber(catchData.tax)}',
                    'Total Biaya: Rp ${_formatNumber(catchData.totalCost)}',
                  ]),
                  SizedBox(height: sp(16)),
                  _buildProfitCard(fs, sp),
                  SizedBox(height: sp(32)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================== UI COMPONENTS ===========================

  Widget _buildPhotoHeader(double Function(double) sp) {
    if (catchData.photoPath.isNotEmpty) {
      final file = File(catchData.photoPath);
      if (file.existsSync()) {
        return Image.file(
          file,
          width: double.infinity,
          height: sp(250),
          fit: BoxFit.cover,
        );
      }
    }

    return Container(
      width: double.infinity,
      height: sp(250),
      color: Colors.grey[300],
      child: Icon(Icons.phishing, size: sp(80), color: Colors.grey[600]),
    );
  }

  Widget _buildFishInfo(double Function(double) fs, double Function(double) sp) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                catchData.fishName,
                style: TextStyle(fontSize: fs(28), fontWeight: FontWeight.bold),
              ),
              SizedBox(height: sp(4)),
              Text(
                catchData.fishType,
                style: TextStyle(fontSize: fs(16), color: Colors.grey[600]),
              ),
            ],
          ),
        ),
        Container(
          padding: EdgeInsets.symmetric(horizontal: sp(16), vertical: sp(8)),
          decoration: BoxDecoration(
            color: _getConditionColor(catchData.condition).withOpacity(0.1),
            borderRadius: BorderRadius.circular(sp(20)),
            border: Border.all(color: _getConditionColor(catchData.condition), width: sp(2)),
          ),
          child: Text(
            catchData.condition,
            style: TextStyle(
              fontSize: fs(14),
              fontWeight: FontWeight.bold,
              color: _getConditionColor(catchData.condition),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFinancialCard(double Function(double) fs, double Function(double) sp) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
        ),
        borderRadius: BorderRadius.circular(sp(16)),
      ),
      child: Column(
        children: [
          _buildFinancialRow(fs, sp, 'Pendapatan', catchData.totalRevenue, Colors.green.shade300),
          Divider(color: Colors.white30, height: sp(20)),
          _buildFinancialRow(fs, sp, 'Biaya', catchData.totalCost, Colors.orange.shade300),
          Divider(color: Colors.white30, height: sp(20)),
          _buildFinancialRow(fs, sp, 'Profit Bersih', catchData.netProfit, 
            catchData.netProfit >= 0 ? Colors.green.shade300 : Colors.red.shade300),
        ],
      ),
    );
  }

  Widget _buildFinancialRow(double Function(double) fs, double Function(double) sp, 
      String label, double value, Color iconColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(Icons.circle, color: iconColor, size: fs(8)),
            SizedBox(width: sp(8)),
            Text(label, style: TextStyle(color: Colors.white, fontSize: fs(14))),
          ],
        ),
        Text(
          'Rp ${_formatNumber(value)}',
          style: TextStyle(
            color: Colors.white,
            fontSize: fs(16),
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoSection(double Function(double) fs, double Function(double) sp, String title, List<String> items) {
    return Container(
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(12)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: sp(8),
            offset: Offset(0, sp(2)),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: fs(16),
              fontWeight: FontWeight.bold,
              color: const Color(0xFF1B4F9C),
            ),
          ),
          SizedBox(height: sp(12)),
          ...items.asMap().entries.map(
            (entry) => Padding(
              padding: EdgeInsets.only(bottom: entry.key < items.length - 1 ? sp(10) : 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check_circle, size: fs(16), color: Colors.green),
                  SizedBox(width: sp(8)),
                  Expanded(
                    child: Text(
                      entry.value,
                      style: TextStyle(fontSize: fs(14), color: Colors.black87, height: 1.4),
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

  Widget _buildProfitCard(double Function(double) fs, double Function(double) sp) {
    final isProfit = catchData.netProfit >= 0;
    return Container(
      padding: EdgeInsets.all(sp(20)),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isProfit
              ? [Colors.green, Colors.green.shade700]
              : [Colors.red, Colors.red.shade700],
        ),
        borderRadius: BorderRadius.circular(sp(16)),
        boxShadow: [
          BoxShadow(
            color: (isProfit ? Colors.green : Colors.red).withOpacity(0.3),
            blurRadius: sp(12),
            offset: Offset(0, sp(4)),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(isProfit ? Icons.trending_up : Icons.trending_down, 
                color: Colors.white, size: fs(24)),
              SizedBox(width: sp(8)),
              Text(
                'Keuntungan Bersih',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: fs(16),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          SizedBox(height: sp(12)),
          Text(
            'Rp ${_formatNumber(catchData.netProfit)}',
            style: TextStyle(
              color: Colors.white,
              fontSize: fs(28),
              fontWeight: FontWeight.bold,
            ),
          ),
          SizedBox(height: sp(4)),
          Text(
            'Pendapatan - Total Biaya',
            style: TextStyle(
              color: Colors.white70,
              fontSize: fs(12),
            ),
          ),
        ],
      ),
    );
  }

  // =========================== HELPERS ===========================

  Color _getConditionColor(String condition) {
    switch (condition) {
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

  String _formatNumber(double number) {
    return NumberFormat('#,###', 'id_ID').format(number);
  }
}
