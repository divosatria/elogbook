import 'package:flutter/material.dart';

/// Helper class untuk perhitungan durasi trip
/// Production-ready dengan fallback mechanism
class TripDurationHelper {
  final DateTime departureDate;
  final DateTime? estimatedReturnDate; // Dari BE (prioritas)
  final int? estimatedDurationDays; // Fallback jika estimatedReturnDate null
  final DateTime? actualReturnDate; // Jika trip sudah selesai

  TripDurationHelper({
    required this.departureDate,
    this.estimatedReturnDate,
    this.estimatedDurationDays,
    this.actualReturnDate,
  });

  /// Hitung estimasi tanggal pulang
  /// Prioritas: estimatedReturnDate dari BE > hitung dari estimatedDurationDays
  DateTime getEstimatedReturnDate() {
    if (estimatedReturnDate != null) {
      return estimatedReturnDate!;
    }
    
    // Fallback: hitung dari departure + duration
    final days = estimatedDurationDays ?? 7; // Default 7 hari
    return departureDate.add(Duration(days: days));
  }

  /// Hitung durasi yang sudah berjalan
  Duration getElapsedDuration() {
    final now = DateTime.now();
    return now.difference(departureDate);
  }

  /// Hitung sisa waktu sampai estimasi pulang
  /// Negatif = overtime
  Duration getRemainingDuration() {
    final now = DateTime.now();
    final estimatedReturn = getEstimatedReturnDate();
    
    // PRODUCTION FIX: Hitung dari departure date, bukan dari now
    // Jika trip belum dimulai, gunakan departure date sebagai start
    final tripStart = now.isBefore(departureDate) ? departureDate : now;
    return estimatedReturn.difference(tripStart);
  }

  /// Cek apakah trip sudah overtime
  bool isOvertime() {
    if (actualReturnDate != null) return false;
    return getRemainingDuration().isNegative;
  }

  /// Format sisa waktu untuk tampilan
  /// Format: "6h 10j 30m" atau "+1h 05j 00m" (jika overtime)
  String formatRemainingTime() {
    final remaining = getRemainingDuration();
    final isOT = remaining.isNegative;
    final duration = remaining.abs();
    
    final days = duration.inDays;
    final hours = duration.inHours.remainder(24);
    final minutes = duration.inMinutes.remainder(60);
    final seconds = duration.inSeconds.remainder(60);
    
    String result;
    if (days > 0) {
      result = '${days}h ${hours.toString().padLeft(2, '0')}j '
          '${minutes.toString().padLeft(2, '0')}m';
    } else {
      result = '${hours.toString().padLeft(2, '0')}:'
          '${minutes.toString().padLeft(2, '0')}:' 
          '${seconds.toString().padLeft(2, '0')}';
    }
    
    return isOT ? '+$result' : result;
  }

  /// Format durasi yang sudah berjalan
  /// Format: "2h 14j 30m"
  String formatElapsedTime() {
    final elapsed = getElapsedDuration();
    
    final days = elapsed.inDays;
    final hours = elapsed.inHours.remainder(24);
    final minutes = elapsed.inMinutes.remainder(60);
    
    if (days > 0) {
      return '${days}h ${hours}j ${minutes}m';
    }
    return '${hours}j ${minutes}m';
  }

  /// Get warna berdasarkan status
  Color getStatusColor() {
    if (isOvertime()) {
      return Colors.orange;
    }
    
    // Warning jika sisa waktu < 20%
    final remaining = getRemainingDuration();
    final total = getEstimatedReturnDate().difference(departureDate);
    final percentage = (remaining.inSeconds / total.inSeconds) * 100;
    
    if (percentage < 20 && percentage > 0) {
      return Colors.orange.shade300;
    }
    
    return Colors.blue;
  }

  /// Get label berdasarkan status
  String getStatusLabel() {
    if (actualReturnDate != null) {
      return 'Total Durasi';
    }
    // Jika trip belum dimulai
    if (DateTime.now().isBefore(departureDate)) {
      return 'Estimasi Durasi Trip';
    }
    return 'Sisa Waktu Trip';
  }
}
