import 'package:e_logbook/services/nitification/notification_service.dart';
import 'package:e_logbook/services/nitification/admin_notification_service.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:provider/provider.dart';
import '../models/document_requirement_model.dart';
import '../provider/user_provider.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class NotificationScreen extends StatefulWidget {
  @override
  _NotificationScreenState createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen>
    with SingleTickerProviderStateMixin {
  List<Map<String, dynamic>> _adminNotifications = [];
  List<DocumentRequirementModel> _documentRequirements = [];
  List<Map<String, dynamic>> _tripNotifications = [];
  bool _isLoading = true;
  late TabController _tabController;
  int _unreadSystemCount = 0;
  int _unreadAdminCount = 0;
  int _unreadTripCount = 0;
  bool _isSelectionMode = false;
  Set<String> _selectedNotifications = {};

  // System notifications with IDs
  final List<Map<String, dynamic>> _systemNotifications = [
    {
      'id': 'ai_detection_feature',
      'title': 'Fitur AI Detection',
      'subtitle': 'Fitur baru untuk identifikasi ikan otomatis telah tersedia',
      'icon': Icons.notifications_outlined,
      'color': Colors.blue,
      'dateTime': DateTime.now().subtract(const Duration(hours: 6)),
    },
    {
      'id': 'app_ready',
      'title': 'Aplikasi Siap Digunakan',
      'subtitle':
          'E-Logbook telah siap untuk mencatat aktivitas penangkapan ikan Anda',
      'icon': Icons.notifications_outlined,
      'color': Colors.blue,
      'dateTime': DateTime.now().subtract(const Duration(days: 2)),
    },
    {
      'id': 'security_update',
      'title': 'Update Keamanan',
      'subtitle': 'Sistem keamanan aplikasi telah diperbarui',
      'icon': Icons.notifications_outlined,
      'color': Colors.blue,
      'dateTime': DateTime.now().subtract(const Duration(days: 5)),
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadNotifications();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    if (!mounted) return;

    final user = Provider.of<UserProvider>(context, listen: false).user;
    if (user != null) {
      // Load admin notifications and document requirements
      final adminNotifications =
          await AdminNotificationService.getAdminNotificationsForUser(
              user.email);
      final documentRequirements =
          await AdminNotificationService.getDocumentRequirementsForUser(
              user.email);

      // Load trip notifications from API
      final tripNotifications = await _fetchTripNotificationsFromAPI();

      if (mounted) {
        setState(() {
          _adminNotifications = adminNotifications;
          _documentRequirements = documentRequirements;
          _tripNotifications = tripNotifications;
          _isLoading = false;
        });
        await _updateUnreadCounts();
      }
    } else {
      if (mounted) {
        setState(() => _isLoading = false);
        await _updateUnreadCounts();
      }
    }
  }

  Future<List<Map<String, dynamic>>> _fetchTripNotificationsFromAPI() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      final userDataString = prefs.getString('user_data');

      if (token == null || userDataString == null) return [];

      final userData = json.decode(userDataString);
      final userId = userData['id'];

      final response = await http.get(
        Uri.parse('${ApiConfig.apiUrl}/mobile/notifications'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final notifications = List<Map<String, dynamic>>.from(data['data']);

          // Filter notifications by userId
          return notifications.where((n) => n['userId'] == userId).toList();
        }
      }
      return [];
    } catch (e) {
      print('❌ [Notification] Error fetching: $e');
      return [];
    }
  }

  Future<void> _updateUnreadCounts() async {
    final user = Provider.of<UserProvider>(context, listen: false).user;
    if (user != null) {
      final systemIds =
          _systemNotifications.map((n) => n['id'] as String).toList();

      final sysCount =
          await NotificationService.getUnreadSystemCount(systemIds);
      final adminCount =
          await AdminNotificationService.getUnreadCountForUser(user.email);
      final tripCount =
          _tripNotifications.where((n) => n['isRead'] == false).length;

      if (mounted) {
        setState(() {
          _unreadSystemCount = sysCount;
          _unreadAdminCount = adminCount;
          _unreadTripCount = tripCount;
        });
      }
    }
  }

  Future<void> _markNotificationAsRead(dynamic notificationId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      if (token == null) return;

      await http.put(
        Uri.parse(
            '${ApiConfig.apiUrl}/mobile/notifications/$notificationId/read'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ).timeout(const Duration(seconds: 10));

      await _loadNotifications();
    } catch (e) {
      print('❌ [Notification] Error marking as read: $e');
    }
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes} menit lalu';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} jam lalu';
    } else if (difference.inDays == 1) {
      return '1 hari lalu';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} hari lalu';
    } else {
      return DateFormat('dd MMM yyyy').format(dateTime);
    }
  }

  int _getAllUnreadCount() {
    return _unreadSystemCount + _unreadAdminCount + _unreadTripCount;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: _isSelectionMode
            ? Text(
                '${_selectedNotifications.length} dipilih',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              )
            : const Text(
                'Notifikasi',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: _isSelectionMode
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  setState(() {
                    _isSelectionMode = false;
                    _selectedNotifications.clear();
                  });
                },
              )
            : null,
        actions: _isSelectionMode
            ? [
                IconButton(
                  icon: const Icon(Icons.delete),
                  onPressed: _deleteSelectedNotifications,
                ),
              ]
            : [
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, color: Colors.white),
                  onSelected: (value) {
                    switch (value) {
                      case 'mark_read':
                        _markAllAsRead();
                        break;
                      case 'select_all':
                        _selectAll();
                        break;
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'mark_read',
                      child: Row(
                        children: [
                          Icon(Icons.mark_email_read, color: Color(0xFF1B4F9C)),
                          SizedBox(width: 8),
                          Text('Tandai telah dibaca'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'select_all',
                      child: Row(
                        children: [
                          Icon(Icons.select_all, color: Color(0xFF1B4F9C)),
                          SizedBox(width: 8),
                          Text('Pilih semua'),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Standard TabBar
          Container(
            color: Colors.white,
            padding: ResponsiveHelper.paddingVertical(context,
                mobile: 16, tablet: 20),
            child: TabBar(
              controller: _tabController,
              indicatorColor: const Color(0xFF1B4F9C),
              indicatorWeight: 3,
              labelColor: const Color(0xFF1B4F9C),
              unselectedLabelColor: Colors.grey.shade600,
              labelStyle: TextStyle(
                fontSize:
                    ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                fontWeight: FontWeight.bold,
              ),
              unselectedLabelStyle: TextStyle(
                fontSize:
                    ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                fontWeight: FontWeight.normal,
              ),
              tabs: [
                Tab(
                  height:
                      ResponsiveHelper.height(context, mobile: 60, tablet: 70),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            Icons.notifications_active,
                            size: ResponsiveHelper.width(context,
                                mobile: 24, tablet: 28),
                          ),
                          if (_getAllUnreadCount() > 0)
                            Positioned(
                              right: -8,
                              top: -4,
                              child: Container(
                                padding: EdgeInsets.all(ResponsiveHelper.width(
                                    context,
                                    mobile: 2,
                                    tablet: 3)),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                constraints: BoxConstraints(
                                  minWidth: ResponsiveHelper.width(context,
                                      mobile: 16, tablet: 18),
                                  minHeight: ResponsiveHelper.height(context,
                                      mobile: 16, tablet: 18),
                                ),
                                child: Text(
                                  '${_getAllUnreadCount()}',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: ResponsiveHelper.font(context,
                                        mobile: 9, tablet: 10),
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(
                          width: ResponsiveHelper.width(context,
                              mobile: 6, tablet: 8)),
                      const Text('Semua'),
                    ],
                  ),
                ),
                Tab(
                  height:
                      ResponsiveHelper.height(context, mobile: 60, tablet: 70),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            Icons.sailing,
                            size: ResponsiveHelper.width(context,
                                mobile: 24, tablet: 28),
                          ),
                          if (_unreadTripCount > 0)
                            Positioned(
                              right: -8,
                              top: -4,
                              child: Container(
                                padding: EdgeInsets.all(ResponsiveHelper.width(
                                    context,
                                    mobile: 2,
                                    tablet: 3)),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                constraints: BoxConstraints(
                                  minWidth: ResponsiveHelper.width(context,
                                      mobile: 16, tablet: 18),
                                  minHeight: ResponsiveHelper.height(context,
                                      mobile: 16, tablet: 18),
                                ),
                                child: Text(
                                  '$_unreadTripCount',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: ResponsiveHelper.font(context,
                                        mobile: 9, tablet: 10),
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(
                          width: ResponsiveHelper.width(context,
                              mobile: 6, tablet: 8)),
                      const Text('Trip'),
                    ],
                  ),
                ),
                Tab(
                  height:
                      ResponsiveHelper.height(context, mobile: 60, tablet: 70),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            Icons.info_outline,
                            size: ResponsiveHelper.width(context,
                                mobile: 24, tablet: 28),
                          ),
                          if (_unreadSystemCount > 0)
                            Positioned(
                              right: -8,
                              top: -4,
                              child: Container(
                                padding: EdgeInsets.all(ResponsiveHelper.width(
                                    context,
                                    mobile: 2,
                                    tablet: 3)),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                constraints: BoxConstraints(
                                  minWidth: ResponsiveHelper.width(context,
                                      mobile: 16, tablet: 18),
                                  minHeight: ResponsiveHelper.height(context,
                                      mobile: 16, tablet: 18),
                                ),
                                child: Text(
                                  '$_unreadSystemCount',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: ResponsiveHelper.font(context,
                                        mobile: 9, tablet: 10),
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                      SizedBox(
                          width: ResponsiveHelper.width(context,
                              mobile: 6, tablet: 8)),
                      const Text('Sistem'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Tab Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : Consumer<UserProvider>(
                    builder: (context, userProvider, child) {
                      return TabBarView(
                        controller: _tabController,
                        physics: const ClampingScrollPhysics(),
                        children: [
                          _buildAllNotificationsTab(userProvider.user),
                          _buildTripTab(),
                          _buildSystemTab(),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAllNotificationsTab(user) {
    // Gabungkan semua notifikasi (admin + trip + system)
    final allNotifications = <Map<String, dynamic>>[];

    // Add admin notifications
    for (var notification in _adminNotifications) {
      allNotifications.add({
        'type': 'admin',
        'data': notification,
        'dateTime': DateTime.parse(notification['created_at']),
      });
    }

    // Add trip notifications
    for (var notification in _tripNotifications) {
      allNotifications.add({
        'type': 'trip',
        'data': notification,
        'dateTime': DateTime.parse(notification['createdAt']),
      });
    }

    // Add document requirements
    for (var requirement in _documentRequirements) {
      allNotifications.add({
        'type': 'document',
        'data': requirement,
        'dateTime': requirement.createdAt,
      });
    }

    // Add system notifications
    for (var notification in _systemNotifications) {
      allNotifications.add({
        'type': 'system',
        'id': notification['id'],
        'title': notification['title'],
        'subtitle': notification['subtitle'],
        'icon': notification['icon'],
        'color': notification['color'],
        'dateTime': notification['dateTime'],
      });
    }

    // Sort by date (newest first)
    allNotifications.sort((a, b) =>
        (b['dateTime'] as DateTime).compareTo(a['dateTime'] as DateTime));

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: allNotifications.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _buildEmptyState(
                  'Belum Ada Notifikasi',
                  'Semua notifikasi Anda akan muncul di sini',
                  Icons.notifications_off,
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: allNotifications.length,
              itemBuilder: (context, index) {
                final notification = allNotifications[index];
                switch (notification['type']) {
                  case 'admin':
                    var buildAdminNotificationCard =
                        _buildAdminNotificationCard;
                    return buildAdminNotificationCard(notification['data']);
                  case 'trip':
                    return _buildTripNotificationCard(notification['data']);
                  case 'document':
                    return _buildDocumentRequirementCard(notification['data']);
                  case 'system':
                  default:
                    return _buildSystemNotification(
                      notification['id'],
                      notification['title'],
                      notification['subtitle'],
                      notification['icon'],
                      notification['color'],
                      notification['dateTime'],
                    );
                }
              },
            ),
    );
  }

  Widget _buildSystemTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var notification in _systemNotifications)
            _buildSystemNotification(
              notification['id'],
              notification['title'],
              notification['subtitle'],
              notification['icon'],
              notification['color'],
              notification['dateTime'],
            ),
        ],
      ),
    );
  }

  Widget _buildTripTab() {
    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: _tripNotifications.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _buildEmptyState(
                  'Belum Ada Notifikasi Trip',
                  'Notifikasi persetujuan trip akan muncul di sini',
                  Icons.sailing,
                ),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _tripNotifications.length,
              itemBuilder: (context, index) {
                return _buildTripNotificationCard(_tripNotifications[index]);
              },
            ),
    );
  }

  Widget _buildTripNotificationCard(Map<String, dynamic> notification) {
    final notificationId = notification['id'];
    final isRead = notification['isRead'] == true;
    final dateTime = DateTime.parse(notification['createdAt']);

    String timeLeft = '';
    if (notification['departureTime'] != null) {
      final departureTime = DateTime.parse(notification['departureTime']);
      final duration = departureTime.difference(DateTime.now());

      if (duration.isNegative) {
        timeLeft = 'Trip sudah dimulai';
      } else if (duration.inDays > 0) {
        timeLeft = '${duration.inDays} hari lagi';
      } else if (duration.inHours > 0) {
        timeLeft =
            '${duration.inHours} jam ${duration.inMinutes.remainder(60)} menit lagi';
      } else {
        timeLeft = '${duration.inMinutes} menit lagi';
      }
    }

    return Container(
      margin: EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isRead ? Colors.white : Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRead ? Colors.grey.shade200 : Colors.blue.shade200,
          width: isRead ? 1 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () async {
            await _markNotificationAsRead(notificationId);
            await _updateUnreadCounts();
            setState(() {});
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Center(
                    child:
                        Icon(Icons.check_circle, color: Colors.green, size: 24),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '✅ Trip Aktif!',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1B4F9C),
                              ),
                            ),
                          ),
                          if (!isRead)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      SizedBox(height: 8),
                      Text(
                        notification['message'] ?? '',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[700],
                          height: 1.4,
                        ),
                      ),
                      if (timeLeft.isNotEmpty) ...[
                        SizedBox(height: 8),
                        Container(
                          padding:
                              EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: timeLeft.contains('sudah')
                                ? Colors.grey.shade200
                                : Colors.orange.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            timeLeft,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: timeLeft.contains('sudah')
                                  ? Colors.grey.shade700
                                  : Colors.orange.shade900,
                            ),
                          ),
                        ),
                      ],
                      SizedBox(height: 8),
                      Text(
                        _getTimeAgo(dateTime),
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _deleteSelectedNotifications() {
    setState(() {
      _selectedNotifications.clear();
      _isSelectionMode = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notifikasi telah dihapus')));
  }

  void _markAllAsRead() async {
    final systemIds =
        _systemNotifications.map((n) => n['id'] as String).toList();

    for (String id in systemIds) {
      await NotificationService.markSystemAsRead(id);
    }

    // Mark admin notifications as read
    for (var notification in _adminNotifications) {
      await AdminNotificationService.markNotificationAsRead(notification['id']);
    }

    await _updateUnreadCounts();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Semua notifikasi telah ditandai sebagai dibaca'),
      ),
    );
  }

  void _selectAll() {
    setState(() {
      _isSelectionMode = true;
      _selectedNotifications.clear();

      // Add system notifications
      for (var notification in _systemNotifications) {
        _selectedNotifications.add('system_${notification['id']}');
      }

      // Add admin notifications
      for (var notification in _adminNotifications) {
        _selectedNotifications.add('admin_${notification['id']}');
      }
    });
  }

  Widget _buildSystemNotification(
    String id,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    DateTime dateTime,
  ) {
    final notificationId = 'system_$id';
    final isSelected = _selectedNotifications.contains(notificationId);

    return Container(
      margin: EdgeInsets.only(
          bottom: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(
            ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
        border: isSelected ? Border.all(color: Colors.blue, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(
                0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(
              ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
          onTap: _isSelectionMode
              ? () => _toggleSelection(id, 'system', null)
              : () async {
                  await NotificationService.markSystemAsRead(id);
                  await _updateUnreadCounts();
                  NavigationHelper.pushNamedNoTransition(
                    context,
                    '/notification-detail',
                    arguments: {
                      'title': title,
                      'message': subtitle,
                      'timestamp': dateTime,
                    },
                  );
                },
          onLongPress: () => _toggleSelection(id, 'system', null),
          child: Padding(
            padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Selection checkbox
                if (_isSelectionMode)
                  Padding(
                    padding: EdgeInsets.only(
                        right: ResponsiveHelper.width(context,
                            mobile: 12, tablet: 16)),
                    child: Icon(
                      isSelected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: isSelected ? Colors.blue : Colors.grey,
                      size: ResponsiveHelper.width(context,
                          mobile: 24, tablet: 28),
                    ),
                  ),
                // System Icon
                Container(
                  width:
                      ResponsiveHelper.width(context, mobile: 48, tablet: 56),
                  height:
                      ResponsiveHelper.height(context, mobile: 48, tablet: 56),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(ResponsiveHelper.width(
                        context,
                        mobile: 24,
                        tablet: 28)),
                  ),
                  child: Center(
                    child: Icon(icon,
                        color: color,
                        size: ResponsiveHelper.width(context,
                            mobile: 24, tablet: 28)),
                  ),
                ),
                SizedBox(
                    width: ResponsiveHelper.width(context,
                        mobile: 12, tablet: 16)),
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 16, tablet: 18),
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1B4F9C),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 14, tablet: 16),
                          color: Colors.grey[700],
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        _getTimeAgo(dateTime),
                        style: TextStyle(
                            fontSize: ResponsiveHelper.font(context,
                                mobile: 12, tablet: 14),
                            color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String title, String subtitle, IconData icon) {
    return Container(
      width: double.infinity,
      padding: ResponsiveHelper.padding(context, mobile: 32, tablet: 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(
            ResponsiveHelper.width(context, mobile: 16, tablet: 20)),
        border: Border.all(color: Colors.grey.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon,
              size: ResponsiveHelper.width(context, mobile: 64, tablet: 80),
              color: Colors.grey[400]),
          SizedBox(
              height: ResponsiveHelper.height(context, mobile: 16, tablet: 20)),
          Text(
            title,
            style: TextStyle(
              fontSize: ResponsiveHelper.font(context, mobile: 18, tablet: 22),
              fontWeight: FontWeight.bold,
              color: Color(0xFF1B4F9C),
            ),
          ),
          SizedBox(
              height: ResponsiveHelper.height(context, mobile: 8, tablet: 12)),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize:
                    ResponsiveHelper.font(context, mobile: 14, tablet: 16),
                color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  void _toggleSelection(String notificationId, String type, dynamic data) {
    setState(() {
      if (!_isSelectionMode) {
        _isSelectionMode = true;
      }

      final fullId = '${type}_$notificationId';
      if (_selectedNotifications.contains(fullId)) {
        _selectedNotifications.remove(fullId);
        if (_selectedNotifications.isEmpty) {
          _isSelectionMode = false;
        }
      } else {
        _selectedNotifications.add(fullId);
      }
    });
  }

  Widget _buildAdminNotificationCard(Map<String, dynamic> notification) {
    final notificationId = 'admin_${notification['id']}';
    final isSelected = _selectedNotifications.contains(notificationId);
    final dateTime = DateTime.parse(notification['created_at']);

    return Container(
      margin: EdgeInsets.only(
          bottom: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(
            ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
        border: isSelected ? Border.all(color: Colors.blue, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(
                0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(
              ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
          onTap: _isSelectionMode
              ? () => _toggleSelection(
                  notification['id'].toString(), 'admin', notification)
              : () async {
                  await AdminNotificationService.markNotificationAsRead(
                      notification['id']);
                  await _updateUnreadCounts();

                  // Navigate to document upload stepper
                  if (_documentRequirements.isNotEmpty) {
                    NavigationHelper.pushNamedNoTransition(
                      context,
                      '/nahkoda-document-upload',
                    );
                  }
                },
          onLongPress: () => _toggleSelection(
              notification['id'].toString(), 'admin', notification),
          child: Padding(
            padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isSelectionMode)
                  Padding(
                    padding: EdgeInsets.only(
                        right: ResponsiveHelper.width(context,
                            mobile: 12, tablet: 16)),
                    child: Icon(
                      isSelected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: isSelected ? Colors.blue : Colors.grey,
                      size: ResponsiveHelper.width(context,
                          mobile: 24, tablet: 28),
                    ),
                  ),
                Container(
                  width:
                      ResponsiveHelper.width(context, mobile: 48, tablet: 56),
                  height:
                      ResponsiveHelper.height(context, mobile: 48, tablet: 56),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(ResponsiveHelper.width(
                        context,
                        mobile: 24,
                        tablet: 28)),
                  ),
                  child: Center(
                    child: Icon(Icons.admin_panel_settings,
                        color: Colors.orange,
                        size: ResponsiveHelper.width(context,
                            mobile: 24, tablet: 28)),
                  ),
                ),
                SizedBox(
                    width: ResponsiveHelper.width(context,
                        mobile: 12, tablet: 16)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        notification['title'] ?? 'Admin Notification',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 16, tablet: 18),
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1B4F9C),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        notification['message'] ?? '',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 14, tablet: 16),
                          color: Colors.grey[700],
                          height: 1.4,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        _getTimeAgo(dateTime),
                        style: TextStyle(
                            fontSize: ResponsiveHelper.font(context,
                                mobile: 12, tablet: 14),
                            color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDocumentRequirementCard(DocumentRequirementModel requirement) {
    final notificationId = 'document_${requirement.id}';
    final isSelected = _selectedNotifications.contains(notificationId);

    return Container(
      margin: EdgeInsets.only(
          bottom: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(
            ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
        border: isSelected ? Border.all(color: Colors.blue, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: ResponsiveHelper.width(context, mobile: 8, tablet: 12),
            offset: Offset(
                0, ResponsiveHelper.height(context, mobile: 2, tablet: 3)),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(
              ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
          onTap: _isSelectionMode
              ? () => _toggleSelection(requirement.id, 'document', requirement)
              : null,
          onLongPress: () =>
              _toggleSelection(requirement.id, 'document', requirement),
          child: Padding(
            padding: ResponsiveHelper.padding(context, mobile: 16, tablet: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_isSelectionMode)
                  Padding(
                    padding: EdgeInsets.only(
                        right: ResponsiveHelper.width(context,
                            mobile: 12, tablet: 16)),
                    child: Icon(
                      isSelected
                          ? Icons.check_circle
                          : Icons.radio_button_unchecked,
                      color: isSelected ? Colors.blue : Colors.grey,
                      size: ResponsiveHelper.width(context,
                          mobile: 24, tablet: 28),
                    ),
                  ),
                Container(
                  width:
                      ResponsiveHelper.width(context, mobile: 48, tablet: 56),
                  height:
                      ResponsiveHelper.height(context, mobile: 48, tablet: 56),
                  decoration: BoxDecoration(
                    color: requirement.isCompleted
                        ? Colors.green.withOpacity(0.1)
                        : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(ResponsiveHelper.width(
                        context,
                        mobile: 24,
                        tablet: 28)),
                  ),
                  child: Center(
                    child: Icon(
                      requirement.isCompleted
                          ? Icons.check_circle
                          : Icons.description,
                      color:
                          requirement.isCompleted ? Colors.green : Colors.red,
                      size: ResponsiveHelper.width(context,
                          mobile: 24, tablet: 28),
                    ),
                  ),
                ),
                SizedBox(
                    width: ResponsiveHelper.width(context,
                        mobile: 12, tablet: 16)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        requirement.title,
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 16, tablet: 18),
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1B4F9C),
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        requirement.isCompleted
                            ? 'Dokumen telah dilengkapi'
                            : 'Dokumen perlu dilengkapi',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.font(context,
                              mobile: 14, tablet: 16),
                          color: requirement.isCompleted
                              ? Colors.green[700]
                              : Colors.red[700],
                          height: 1.4,
                        ),
                      ),
                      SizedBox(
                          height: ResponsiveHelper.height(context,
                              mobile: 8, tablet: 10)),
                      Text(
                        _getTimeAgo(requirement.createdAt),
                        style: TextStyle(
                            fontSize: ResponsiveHelper.font(context,
                                mobile: 12, tablet: 14),
                            color: Colors.grey[500]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
