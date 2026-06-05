/// Koordinat pelabuhan-pelabuhan di Indonesia
final Map<String, Map<String, double>> harborCoordinates = {
  // Jawa
  'Pelabuhan Muara Baru': {'latitude': -6.1075, 'longitude': 106.7975},
  'Pelabuhan Muara Angke': {'latitude': -6.1167, 'longitude': 106.7833},
  'Pelabuhan Sunda Kelapa': {'latitude': -6.1167, 'longitude': 106.8167},
  'Pelabuhan Tanjung Priok': {'latitude': -6.1044, 'longitude': 106.8861},
  'Pelabuhan Cirebon': {'latitude': -6.7063, 'longitude': 108.5571},
  'Pelabuhan Tegal': {'latitude': -6.8694, 'longitude': 109.1400},
  'Pelabuhan Pekalongan': {'latitude': -6.8833, 'longitude': 109.6667},
  'Pelabuhan Semarang': {'latitude': -6.9667, 'longitude': 110.4167},
  'Pelabuhan Surabaya': {'latitude': -7.2092, 'longitude': 112.7350},
  
  // Sumatra
  'Pelabuhan Belawan': {'latitude': 3.7833, 'longitude': 98.6833},
  'Pelabuhan Dumai': {'latitude': 1.6667, 'longitude': 101.4500},
  'Pelabuhan Teluk Bayur': {'latitude': -0.9833, 'longitude': 100.3667},
  'Pelabuhan Panjang': {'latitude': -5.4500, 'longitude': 105.3167},
  'Pelabuhan Palembang': {'latitude': -2.9833, 'longitude': 104.7500},
  
  // Kalimantan
  'Pelabuhan Pontianak': {'latitude': -0.0333, 'longitude': 109.3167},
  'Pelabuhan Banjarmasin': {'latitude': -3.3167, 'longitude': 114.5833},
  'Pelabuhan Balikpapan': {'latitude': -1.2667, 'longitude': 116.8333},
  'Pelabuhan Samarinda': {'latitude': -0.5000, 'longitude': 117.1500},
  
  // Sulawesi
  'Pelabuhan Makassar': {'latitude': -5.1167, 'longitude': 119.4000},
  'Pelabuhan Manado': {'latitude': 1.4833, 'longitude': 124.8500},
  'Pelabuhan Kendari': {'latitude': -3.9667, 'longitude': 122.5833},
  'Pelabuhan Palu': {'latitude': -0.9000, 'longitude': 119.8667},
  
  // Maluku & Papua
  'Pelabuhan Ambon': {'latitude': -3.6833, 'longitude': 128.1833},
  'Pelabuhan Ternate': {'latitude': 0.7833, 'longitude': 127.3667},
  'Pelabuhan Jayapura': {'latitude': -2.5333, 'longitude': 140.7167},
  'Pelabuhan Sorong': {'latitude': -0.8667, 'longitude': 131.2500},
  
  // Bali & Nusa Tenggara
  'Pelabuhan Benoa': {'latitude': -8.7500, 'longitude': 115.2167},
  'Pelabuhan Lembar': {'latitude': -8.7333, 'longitude': 116.0667},
  'Pelabuhan Kupang': {'latitude': -10.1667, 'longitude': 123.5833},
};

/// Get koordinat pelabuhan berdasarkan nama
Map<String, double> getHarborCoordinates(String harborName) {
  // Cari exact match
  if (harborCoordinates.containsKey(harborName)) {
    return harborCoordinates[harborName]!;
  }
  
  // Cari partial match (case insensitive)
  final lowerName = harborName.toLowerCase();
  for (var entry in harborCoordinates.entries) {
    if (entry.key.toLowerCase().contains(lowerName) || 
        lowerName.contains(entry.key.toLowerCase())) {
      return entry.value;
    }
  }
  
  // Default: Jakarta (Muara Baru)
  return {'latitude': -6.1075, 'longitude': 106.7975};
}
