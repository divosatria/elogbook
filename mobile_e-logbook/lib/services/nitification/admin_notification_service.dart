import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/document_requirement_model.dart';

class AdminNotificationService {
  static const String _documentRequirementsKey = 'document_requirements';
  static const String _adminNotificationsKey = 'admin_notifications';

  // Create document requirement notification for user
  static Future<void> createDocumentRequirement({
    required String userId,
    required String userRole,
    required String title,
    required String description,
    required List<DocumentItem> documents,
    DateTime? dueDate,
    bool isUrgent = false,
  }) async {
    final requirement = DocumentRequirementModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      userId: userId,
      userRole: userRole,
      title: title,
      description: description,
      requiredDocuments: documents,
      createdAt: DateTime.now(),
      dueDate: dueDate,
      isUrgent: isUrgent,
    );

    final prefs = await SharedPreferences.getInstance();
    final requirements = await getDocumentRequirements();
    requirements.add(requirement);

    final String requirementsJson = json.encode(
      requirements.map((req) => req.toJson()).toList()
    );
    await prefs.setString(_documentRequirementsKey, requirementsJson);
  }

  // Get document requirements for specific user
  static Future<List<DocumentRequirementModel>> getDocumentRequirementsForUser(String userId) async {
    final requirements = await getDocumentRequirements();
    return requirements.where((req) => req.userId == userId).toList();
  }

  // Get all document requirements
  static Future<List<DocumentRequirementModel>> getDocumentRequirements() async {
    final prefs = await SharedPreferences.getInstance();
    final String? requirementsJson = prefs.getString(_documentRequirementsKey);
    
    if (requirementsJson == null) return [];
    
    final List<dynamic> requirementsList = json.decode(requirementsJson);
    return requirementsList.map((json) => DocumentRequirementModel.fromJson(json)).toList();
  }

  // Initialize nahkoda document requirements
  static Future<void> initializeNahkodaDocuments(String userId) async {
    final nahkodaDocuments = [
      DocumentItem(
        name: 'KTP',
        description: 'Kartu Tanda Penduduk yang masih berlaku',
      ),
      DocumentItem(
        name: 'Buku Pelaut',
        description: 'Buku Pelaut yang masih berlaku',
      ),
      DocumentItem(
        name: 'Sertifikat Nahkoda',
        description: 'Sertifikat Nahkoda sesuai jenis kapal',
      ),
      DocumentItem(
        name: 'BST (Basic Safety Training)',
        description: 'Sertifikat Basic Safety Training',
      ),
      DocumentItem(
        name: 'Surat Keterangan Sehat / MCU',
        description: 'Medical Check Up yang masih berlaku',
      ),
      DocumentItem(
        name: 'SKCK',
        description: 'Surat Keterangan Catatan Kepolisian',
      ),
      DocumentItem(
        name: 'Pas Foto',
        description: 'Pas foto terbaru ukuran 4x6',
      ),
      DocumentItem(
        name: 'NPWP',
        description: 'Nomor Pokok Wajib Pajak',
      ),
    ];

    await createDocumentRequirement(
      userId: userId,
      userRole: 'nahkoda',
      title: 'Kelengkapan Dokumen Nahkoda',
      description: 'Mohon lengkapi dokumen-dokumen berikut sebelum memulai trip pertama Anda',
      documents: nahkodaDocuments,
      dueDate: DateTime.now().add(const Duration(days: 7)),
      isUrgent: true,
    );
  }

  // Create admin notification
  static Future<void> createAdminNotification({
    required String userId,
    required String title,
    required String message,
    required String type, // 'document_requirement', 'warning', 'info'
    bool isUrgent = false,
  }) async {
    final notification = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'user_id': userId,
      'title': title,
      'message': message,
      'type': type,
      'is_urgent': isUrgent,
      'is_read': false,
      'created_at': DateTime.now().toIso8601String(),
    };

    final prefs = await SharedPreferences.getInstance();
    final notifications = await getAdminNotifications();
    notifications.add(notification);

    final String notificationsJson = json.encode(notifications);
    await prefs.setString(_adminNotificationsKey, notificationsJson);
  }

  // Get admin notifications for user
  static Future<List<Map<String, dynamic>>> getAdminNotificationsForUser(String userId) async {
    final notifications = await getAdminNotifications();
    return notifications.where((notif) => notif['user_id'] == userId).toList();
  }

  // Get all admin notifications
  static Future<List<Map<String, dynamic>>> getAdminNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final String? notificationsJson = prefs.getString(_adminNotificationsKey);
    
    if (notificationsJson == null) return [];
    
    final List<dynamic> notificationsList = json.decode(notificationsJson);
    return notificationsList.cast<Map<String, dynamic>>();
  }

  // Mark notification as read
  static Future<void> markNotificationAsRead(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    final notifications = await getAdminNotifications();
    
    final index = notifications.indexWhere((notif) => notif['id'] == notificationId);
    if (index != -1) {
      notifications[index]['is_read'] = true;
      final String notificationsJson = json.encode(notifications);
      await prefs.setString(_adminNotificationsKey, notificationsJson);
    }
  }

  // Get unread count for user
  static Future<int> getUnreadCountForUser(String userId) async {
    final notifications = await getAdminNotificationsForUser(userId);
    return notifications.where((notif) => notif['is_read'] == false).length;
  }

  // Add admin notification (for dummy data)
  static Future<void> addAdminNotification(Map<String, dynamic> notification) async {
    final prefs = await SharedPreferences.getInstance();
    final notifications = await getAdminNotifications();
    notifications.add(notification);

    final String notificationsJson = json.encode(notifications);
    await prefs.setString(_adminNotificationsKey, notificationsJson);
    print('Added admin notification: ${notification['title']} for user: ${notification['user_id']}');
  }

  // Add document requirement (for dummy data)
  static Future<void> addDocumentRequirement(DocumentRequirementModel requirement) async {
    final prefs = await SharedPreferences.getInstance();
    final requirements = await getDocumentRequirements();
    requirements.add(requirement);

    final String requirementsJson = json.encode(
      requirements.map((req) => req.toJson()).toList()
    );
    await prefs.setString(_documentRequirementsKey, requirementsJson);
    print('Added document requirement: ${requirement.title} for user: ${requirement.userId}');
  }
}