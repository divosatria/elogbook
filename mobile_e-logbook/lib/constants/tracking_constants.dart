/// Konstanta untuk konfigurasi tracking
class TrackingConstants {
  // Waktu buffer untuk NAHKODA (dalam menit)
  // Nahkoda bisa mulai tracking 1 hari sebelum waktu berangkat
  static const int nahkodaBufferMinutes = 1440; // 24 jam (1 hari) sebelum
  
  // Waktu buffer untuk CREW (dalam menit)
  // Crew hanya bisa masuk tepat pada waktu jadwal
  static const int crewBufferMinutes = 0; // Tepat waktu jadwal
  
  // Helper method untuk mendapatkan buffer berdasarkan role
  static int getBufferMinutes(String role) {
    return role.toLowerCase() == 'nahkoda' ? nahkodaBufferMinutes : crewBufferMinutes;
  }
  
  // Helper method untuk cek apakah user bisa akses tracking
  static bool canAccessTracking({
    required String role,
    required int userId,
    required int? nahkodaId,
    required List<dynamic>? awakKapal,
    required DateTime departureDate,
    required String status,
  }) {
    final now = DateTime.now();
    
    // Cek apakah user adalah bagian dari trip ini
    final isNahkoda = userId == nahkodaId;
    final isCrew = awakKapal != null && awakKapal.contains(userId);
    
    if (!isNahkoda && !isCrew) return false;
    
    // Crew hanya bisa akses saat status berlayar
    if (role.toLowerCase() == 'crew' || role.toLowerCase() == 'abk') {
      return status.toLowerCase() == 'berlayar';
    }
    
    // Nahkoda bisa akses 1 hari sebelum departure
    final bufferMinutes = getBufferMinutes(role);
    final allowedStartTime = departureDate.subtract(Duration(minutes: bufferMinutes));
    
    return now.isAfter(allowedStartTime) || now.isAtSameMomentAs(allowedStartTime);
  }
}
