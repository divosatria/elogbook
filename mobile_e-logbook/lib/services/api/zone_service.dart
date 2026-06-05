import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../models/catch_polygon_model.dart';
import '../../models/harbor_zone_model.dart';
import '../../config/api_config.dart';
import '../local/secure_storage_service.dart';

class ZoneService {
  static String get baseUrl => ApiConfig.baseUrl;

  /// Get all catch polygons (zona tangkap)
  static Future<List<CatchPolygonModel>> getAllCatchPolygons() async {
    try {
      print('\n========== GET CATCH POLYGONS START ==========');
      
      final token = await SecureStorageService.getToken();

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/catch-polygons';
      print('🌐 [ZONES] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [ZONES] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        final List<dynamic> data = result['data'] ?? [];
        final zones = data.map((json) => CatchPolygonModel.fromJson(json)).toList();
        print('✅ [ZONES] ${zones.length} catch polygons retrieved');
        print('========== GET CATCH POLYGONS END (SUCCESS) ==========\n');
        return zones;
      } else {
        print('❌ [ZONES] Failed: ${response.statusCode}');
        print('========== GET CATCH POLYGONS END (FAILED) ==========\n');
        throw Exception('Gagal mengambil data zona tangkap');
      }
    } catch (e) {
      print('❌ [ZONES] Exception: $e');
      print('========== GET CATCH POLYGONS END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Get catch polygon by name (untuk matching dengan trip.areaTangkap.nama)
  static Future<CatchPolygonModel?> getCatchPolygonByName(String name) async {
    try {
      final zones = await getAllCatchPolygons();
      
      // Cari zona yang namanya match (case insensitive, partial match)
      for (var zone in zones) {
        if (name.toLowerCase().contains(zone.name.toLowerCase()) ||
            zone.name.toLowerCase().contains(name.toLowerCase())) {
          return zone;
        }
      }
      
      return null;
    } catch (e) {
      print('❌ [ZONES] Error finding zone by name: $e');
      return null;
    }
  }

  /// Get multiple catch polygons by names (untuk trip dengan multiple zona)
  static Future<List<CatchPolygonModel>> getCatchPolygonsByNames(String namesString) async {
    try {
      final zones = await getAllCatchPolygons();
      final List<CatchPolygonModel> matchedZones = [];
      
      // Split nama zona (biasanya dipisah koma)
      final names = namesString.split(',').map((n) => n.trim()).toList();
      
      for (var name in names) {
        for (var zone in zones) {
          if (name.toLowerCase().contains(zone.name.toLowerCase()) ||
              zone.name.toLowerCase().contains(name.toLowerCase())) {
            if (!matchedZones.any((z) => z.id == zone.id)) {
              matchedZones.add(zone);
            }
          }
        }
      }
      
      return matchedZones;
    } catch (e) {
      print('❌ [ZONES] Error finding zones by names: $e');
      return [];
    }
  }

  /// Get active fishing zones only
  static Future<List<CatchPolygonModel>> getActiveFishingZones() async {
    try {
      final zones = await getAllCatchPolygons();
      return zones.where((z) => z.isActive && z.zoneType == 'fishing').toList();
    } catch (e) {
      print('❌ [ZONES] Error getting active fishing zones: $e');
      return [];
    }
  }

  /// Get all harbor zones
  static Future<List<HarborZoneModel>> getAllHarborZones() async {
    try {
      print('\n========== GET HARBOR ZONES START ==========');
      
      final token = await SecureStorageService.getToken();

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/harbor-zones';
      print('🌐 [HARBOR] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [HARBOR] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        final List<dynamic> data = result['data'] ?? [];
        final zones = data.map((json) => HarborZoneModel.fromJson(json)).toList();
        print('✅ [HARBOR] ${zones.length} harbor zones retrieved');
        print('========== GET HARBOR ZONES END (SUCCESS) ==========\n');
        return zones;
      } else {
        print('❌ [HARBOR] Failed: ${response.statusCode}');
        print('========== GET HARBOR ZONES END (FAILED) ==========\n');
        throw Exception('Gagal mengambil data zona pelabuhan');
      }
    } catch (e) {
      print('❌ [HARBOR] Exception: $e');
      print('========== GET HARBOR ZONES END (ERROR) ==========\n');
      throw Exception('Error: $e');
    }
  }

  /// Get active harbor zones only
  static Future<List<HarborZoneModel>> getActiveHarborZones() async {
    try {
      final zones = await getAllHarborZones();
      return zones.where((z) => z.isActive).toList();
    } catch (e) {
      print('❌ [HARBOR] Error getting active harbor zones: $e');
      return [];
    }
  }

  /// Get restricted zones (zona terlarang)
  static Future<List<HarborZoneModel>> getRestrictedZones() async {
    try {
      final zones = await getAllHarborZones();
      return zones.where((z) => z.isRestricted && z.isActive).toList();
    } catch (e) {
      print('❌ [HARBOR] Error getting restricted zones: $e');
      return [];
    }
  }

  /// Get all harbor POIs
  static Future<List<Map<String, dynamic>>> getAllHarborPOIs() async {
    try {
      print('\n========== GET HARBOR POIs START ==========');
      
      final token = await SecureStorageService.getToken();

      if (token == null) {
        throw Exception('Token tidak ditemukan');
      }

      final url = '$baseUrl/api/harbor-pois';
      print('🌐 [POI] URL: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 30));

      print('📥 [POI] Response status: ${response.statusCode}');

      if (response.statusCode == 200) {
        final result = json.decode(response.body);
        final List<dynamic> data = result['data'] ?? [];
        print('✅ [POI] ${data.length} POIs retrieved');
        print('========== GET HARBOR POIs END (SUCCESS) ==========\n');
        return List<Map<String, dynamic>>.from(data);
      } else {
        print('❌ [POI] Failed: ${response.statusCode}');
        print('========== GET HARBOR POIs END (FAILED) ==========\n');
        throw Exception('Gagal mengambil data POI');
      }
    } catch (e) {
      print('❌ [POI] Exception: $e');
      print('========== GET HARBOR POIs END (ERROR) ==========\n');
      return [];
    }
  }
}
