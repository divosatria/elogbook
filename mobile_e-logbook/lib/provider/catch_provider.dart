import 'package:flutter/foundation.dart';
import '../models/catch_model.dart';
import '../services/api/catch_service.dart';
import '../services/local/catch_submission_service.dart';

class CatchProvider with ChangeNotifier {
  final List<CatchModel> _catches = [];
  bool _isLoading = false;
  String? _error;

  List<CatchModel> get catches => [..._catches];
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<CatchModel> get todayCatches {
    final now = DateTime.now();
    return _catches.where((catch_) {
      return catch_.departureDate.year == now.year &&
          catch_.departureDate.month == now.month &&
          catch_.departureDate.day == now.day;
    }).toList();
  }

  // Fetch catches from API
  Future<void> fetchCatches() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      debugPrint('\n🔍 [CatchProvider] Fetching catches from API...');
      final response = await CatchService.getCatches();
      
      debugPrint('📦 [CatchProvider] Response success: ${response['success']}');
      
      if (response['success'] == true) {
        _catches.clear();
        final fetchedCatches = response['data'] as List<CatchModel>;
        
        // Merge dengan catch_date lokal
        final localDates = await CatchSubmissionService.getCatchDatesLocally();
        final merged = fetchedCatches.map((c) {
          final localDate = localDates[c.id?.toString()];
          if (localDate != null) {
            try {
              return CatchModel(
                id: c.id,
                fishName: c.fishName,
                fishType: c.fishType,
                weight: c.weight,
                quantity: c.quantity,
                condition: c.condition,
                photoPath: c.photoPath,
                vesselName: c.vesselName,
                vesselNumber: c.vesselNumber,
                captainName: c.captainName,
                crewCount: c.crewCount,
                pricePerKg: c.pricePerKg,
                totalRevenue: c.totalRevenue,
                departureDate: c.departureDate,
                departureTime: c.departureTime,
                arrivalDate: c.arrivalDate,
                arrivalTime: c.arrivalTime,
                tripDurationHours: c.tripDurationHours,
                tripDurationMinutes: c.tripDurationMinutes,
                fishingZone: c.fishingZone,
                locationName: c.locationName,
                latitude: c.latitude,
                longitude: c.longitude,
                waterDepth: c.waterDepth,
                weatherCondition: c.weatherCondition,
                fuelCost: c.fuelCost,
                operationalCost: c.operationalCost,
                tax: c.tax,
                totalCost: c.totalCost,
                netProfit: c.netProfit,
                notes: c.notes,
                syncStatus: c.syncStatus,
                catchDate: DateTime.parse(localDate),
              );
            } catch (_) {
              return c;
            }
          }
          return c;
        }).toList();
        
        _catches.addAll(merged);
        _error = null;
        debugPrint('✅ [CatchProvider] Loaded ${_catches.length} catches (${localDates.length} with local dates)');
      } else {
        _error = response['message'] ?? 'Gagal mengambil data';
        debugPrint('❌ [CatchProvider] Error: $_error');
      }
    } catch (e) {
      _error = 'Terjadi kesalahan: $e';
      debugPrint('❌ CatchProvider fetchCatches error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
      debugPrint('🔔 [CatchProvider] notifyListeners() called\n');
    }
  }

  void addCatch(CatchModel catchData) {
    _catches.insert(0, catchData);
    notifyListeners();
  }

  void removeCatch(String id) {
    _catches.removeWhere((catch_) => catch_.id.toString() == id);
    notifyListeners();
  }

  void clearCatches() {
    _catches.clear();
    notifyListeners();
  }

  // Statistik
  double get totalWeightToday {
    return todayCatches.fold(0, (sum, item) => sum + item.weight);
  }

  int get uniqueFishTypesToday {
    return todayCatches.map((e) => e.fishName).toSet().length;
  }

  int get totalTripsToday {
    return todayCatches.length;
  }

  double get totalRevenueToday {
    return todayCatches.fold(0, (sum, item) => sum + item.totalRevenue);
  }

  double get totalWeightThisMonth {
    final now = DateTime.now();
    return _catches
        .where((c) =>
            c.departureDate.year == now.year &&
            c.departureDate.month == now.month)
        .fold(0, (sum, item) => sum + item.weight);
  }

  int get totalTripsThisMonth {
    final now = DateTime.now();
    return _catches
        .where((c) =>
            c.departureDate.year == now.year &&
            c.departureDate.month == now.month)
        .length;
  }

  double get totalRevenueThisMonth {
    final now = DateTime.now();
    return _catches
        .where((c) =>
            c.departureDate.year == now.year &&
            c.departureDate.month == now.month)
        .fold(0, (sum, item) => sum + item.totalRevenue);
  }
}