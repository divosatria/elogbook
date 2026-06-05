import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../services/local/secure_storage_service.dart';
import '../api/vessel_service.dart';
import '../api/document_service.dart';

class RealtimeUpdateService {
  static Timer? _pollingTimer;
  static final Map<String, List<Function>> _listeners = {};
  static String? _lastVesselId;
  static List<dynamic>? _lastDocuments;
  static Map<String, dynamic>? _lastUserProfile;
  static int _retryCount = 0;
  
  static const Duration _initialInterval = Duration(seconds: 30);
  static const Duration _maxInterval = Duration(seconds: 120);
  static const int _maxRetries = 10;

  static Duration _getNextInterval() {
    final seconds = (_initialInterval.inSeconds * (1 + _retryCount * 0.5)).toInt();
    return Duration(seconds: seconds.clamp(_initialInterval.inSeconds, _maxInterval.inSeconds));
  }

  static Future<bool> _hasConnection() async {
    try {
      final result = await Connectivity().checkConnectivity();
      return result != ConnectivityResult.none;
    } catch (e) {
      return false;
    }
  }

  /// Start polling untuk auto-update
  static void startPolling() {
    if (_pollingTimer != null && _pollingTimer!.isActive) {
      return;
    }

    _retryCount = 0;
    _scheduleNextPoll();
  }

  static void _scheduleNextPoll() {
    _pollingTimer?.cancel();
    
    if (_retryCount >= _maxRetries) {
      _retryCount = 0;
    }

    final interval = _getNextInterval();
    _pollingTimer = Timer(interval, () async {
      if (!await _hasConnection()) {
        _retryCount++;
        _scheduleNextPoll();
        return;
      }
      
      await _checkForUpdates();
      _retryCount = 0;
      _scheduleNextPoll();
    });
  }

  /// Stop polling
  static void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _retryCount = 0;
  }

  /// Register listener untuk data tertentu
  static void addListener(String key, Function callback) {
    if (_listeners[key] == null) {
      _listeners[key] = [];
    }
    _listeners[key]!.add(callback);
    print('🔔 [LISTENER] Added listener for "$key" - Total: ${_listeners[key]!.length}');
    print('   All listeners: ${_listeners.keys.map((k) => '$k(${_listeners[k]!.length})').join(', ')}');
  }

  /// Remove listener
  static void removeListener(String key, [Function? callback]) {
    final beforeCount = _listeners[key]?.length ?? 0;
    if (callback != null) {
      final removed = _listeners[key]?.remove(callback) ?? false;
      print('🗑️ [LISTENER] Remove specific callback for "$key": ${removed ? 'SUCCESS' : 'FAILED'}');
      print('   Before: $beforeCount, After: ${_listeners[key]?.length ?? 0}');
      if (_listeners[key]?.isEmpty ?? false) {
        _listeners.remove(key);
        print('   Key "$key" removed (empty)');
      }
    } else {
      _listeners.remove(key);
      print('🗑️ [LISTENER] Removed all listeners for "$key" (was: $beforeCount)');
    }
    print('   Remaining listeners: ${_listeners.keys.map((k) => '$k(${_listeners[k]!.length})').join(', ')}');
  }
  
  /// Get listener (untuk manual trigger)
  static List<Function>? getListener(String key) {
    return _listeners[key];
  }

  /// Check for updates dari backend
  static Future<void> _checkForUpdates() async {
    print('\n🔄 [POLLING] Checking for updates...');
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = await SecureStorageService.getToken();
      
      if (token == null) {
        print('❌ [POLLING] No auth token found');
        return;
      }

      final changes = <String>[];

      // Check vessel ID changes
      try {
        final vesselService = VesselService();
        final currentVesselId = await vesselService.getVesselIdFromUserSettings() ?? 
                                await vesselService.getVesselIdFromTrip();
        
        print('🚢 [VESSEL] Current: $currentVesselId, Last: $_lastVesselId');
        
        if (currentVesselId != null) {
          if (_lastVesselId == null) {
            _lastVesselId = currentVesselId;
            print('   First time vessel ID set');
          } else if (_lastVesselId != currentVesselId) {
            changes.add('vessel');
            _lastVesselId = currentVesselId;
            print('   ⚠️ VESSEL CHANGED!');
          }
        }
      } catch (e) {
        print('❌ [VESSEL] Error: $e');
      }

      // Check documents - DETAIL CHECK untuk detect status changes
      try {
        final docResponse = await DocumentService.getDocuments();
        if (docResponse['success'] == true) {
          final docs = docResponse['documents'] as List;
          
          if (_lastDocuments == null) {
            _lastDocuments = docs;
          } else {
            bool hasDocumentChanges = false;
            
            // Check count change (dokumen dihapus atau ditambah)
            if (docs.length != _lastDocuments!.length) {
              hasDocumentChanges = true;
            }
            
            // Check jika ada dokumen baru atau hilang (compare by ID)
            if (!hasDocumentChanges) {
              final currentIds = docs.map((d) => d['id']).toSet();
              final lastIds = _lastDocuments!.map((d) => d['id']).toSet();
              
              if (!currentIds.containsAll(lastIds) || !lastIds.containsAll(currentIds)) {
                hasDocumentChanges = true;
              }
            }
            
            // Check status changes untuk setiap dokumen (by ID, bukan index)
            if (!hasDocumentChanges && docs.isNotEmpty) {
              for (var doc in docs) {
                final oldDoc = _lastDocuments!.firstWhere(
                  (d) => d['id'] == doc['id'],
                  orElse: () => {},
                );
                
                if (oldDoc.isEmpty) {
                  hasDocumentChanges = true;
                  break;
                }
                
                // Check status change
                if (oldDoc['status'] != doc['status']) {
                  hasDocumentChanges = true;
                  break;
                }
                
                // Check rejection reason
                if (doc['status'] == 'rejected' && 
                    oldDoc['alasanPenolakan'] != doc['alasanPenolakan']) {
                  hasDocumentChanges = true;
                  break;
                }
                
                // Check file path change (dokumen diupload ulang)
                if (oldDoc['filePath'] != doc['filePath']) {
                  hasDocumentChanges = true;
                  break;
                }
              }
            }
            
            if (hasDocumentChanges) {
              changes.add('documents');
              _lastDocuments = docs;
            }
          }
        }
      } catch (e) {
        // Silent error
      }

      
      // Check user profile changes
      try {
        final userDataStr = prefs.getString('user_data');
        if (userDataStr != null) {
          if (_lastUserProfile == null) {
            _lastUserProfile = {'data': userDataStr};
          } else if (_lastUserProfile!['data'] != userDataStr) {
            changes.add('profile');
            _lastUserProfile = {'data': userDataStr};
          }
        }
      } catch (e) {
        // Silent error
      }

      if (changes.isNotEmpty) {
        print('📢 [POLLING] Changes detected: $changes');
        _notifyListeners(changes);
      } else {
        print('✅ [POLLING] No changes detected');
      }
    } catch (e) {
      print('❌ [POLLING] Error: $e');
    }
  }

  /// Notify all listeners
  static void _notifyListeners(List<String> changes) {
    print('\n📣 [NOTIFY] Notifying listeners for: $changes');
    for (var change in changes) {
      final listeners = _listeners[change];
      print('   "$change": ${listeners?.length ?? 0} listeners');
      if (listeners != null && listeners.isNotEmpty) {
        for (var i = 0; i < listeners.length; i++) {
          try {
            print('      Calling listener #${i + 1}...');
            listeners[i]();
            print('      ✅ Listener #${i + 1} executed');
          } catch (e) {
            print('      ❌ Listener #${i + 1} error: $e');
          }
        }
      }
    }
    
    final globalListeners = _listeners['global'];
    if (globalListeners != null && globalListeners.isNotEmpty) {
      for (var listener in globalListeners) {
        try {
          listener(changes);
        } catch (e) {
          // Silent error
        }
      }
    }
  }

  /// Public method to manually trigger listeners
  static void notifyListeners(String key) {
    _notifyListeners([key]);
  }


  /// Force refresh all data
  static Future<void> forceRefresh() async {
    _lastVesselId = null;
    _lastDocuments = null;
    _lastUserProfile = null;
    await _checkForUpdates();
  }
}
