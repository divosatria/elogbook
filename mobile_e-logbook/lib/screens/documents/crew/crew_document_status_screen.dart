// lib/screens/documents/crew/crew_document_status_screen.dart

import 'package:e_logbook/services/api/document_service.dart';
import 'package:e_logbook/services/realtime/realtime_update_service.dart';
import 'package:flutter/material.dart';
import 'dart:math' as math;

class CrewDocumentStatusScreen extends StatefulWidget {
  const CrewDocumentStatusScreen({Key? key}) : super(key: key);

  @override
  State<CrewDocumentStatusScreen> createState() => _CrewDocumentStatusScreenState();
}

class _CrewDocumentStatusScreenState extends State<CrewDocumentStatusScreen>
    with TickerProviderStateMixin, WidgetsBindingObserver {
  late AnimationController _animationController;
  late AnimationController _bubbleController;
  late Animation<double> _fadeAnimation;

  // Document data from API
  List<Map<String, dynamic>> _documents = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _bubbleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
    _fadeAnimation = CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    );
    _animationController.forward();
    _loadDocuments();
    
    // Register listener untuk auto-refresh
    RealtimeUpdateService.addListener('documents', () {
      if (mounted) {
        print('🔔 Documents changed, auto-refreshing status screen...');
        _loadDocuments();
      }
    });
    
    // Register listener untuk auto-refresh saat ada perubahan dari admin
    RealtimeUpdateService.addListener('document-verified', () {
      if (mounted) {
        print('🔔 Document verified by admin, auto-refreshing...');
        _loadDocuments();
      }
    });
  }

  Future<void> _loadDocuments() async {
    try {
      final response = await DocumentService.getDocuments();
      
      if (response['success'] == true && mounted) {
        final docs = response['documents'] as List;
        
        // Group by jenisDokumen and take only the latest one
        final Map<String, dynamic> latestDocs = {};
        for (var doc in docs) {
          final docType = doc['jenisDokumen'] ?? 'Unknown';
          final docId = doc['id'];
          
          // Keep only the latest document (highest ID) for each type
          if (!latestDocs.containsKey(docType) || docId > latestDocs[docType]['id']) {
            latestDocs[docType] = doc;
          }
        }
        
        setState(() {
          _documents = latestDocs.values.map((doc) {
            return {
              'name': doc['jenisDokumen'] ?? 'Unknown',
              'status': doc['status'] ?? 'pending',
              'icon': _getIconForDocument(doc['jenisDokumen']),
              'uploadedAt': doc['createdAt'] ?? '-',
              'verifiedAt': doc['verifiedAt'],
              'reason': doc['rejectionReason'],
            };
          }).toList();
        });
      }
    } catch (e) {
      print('Error loading documents: $e');
    }
  }

  IconData _getIconForDocument(String? docType) {
    switch (docType?.toLowerCase()) {
      case 'ktp':
        return Icons.credit_card;
      case 'pas foto':
      case 'foto':
        return Icons.portrait;
      case 'npwp':
        return Icons.receipt_long;
      case 'buku pelaut':
        return Icons.book;
      case 'bst':
        return Icons.health_and_safety;
      case 'surat keterangan sehat':
      case 'surat sehat':
        return Icons.medical_services;
      case 'skck':
        return Icons.policy;
      case 'ijazah':
        return Icons.school;
      default:
        return Icons.description;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // JANGAN remove listener agar home screen tetap bisa menerima update
    // RealtimeUpdateService.removeListener('documents');
    // RealtimeUpdateService.removeListener('document-verified');
    _animationController.dispose();
    _bubbleController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Tidak perlu auto-reload saat resumed
    // User bisa swipe to refresh jika ingin update data
  }

  int get _approvedCount => _documents.where((d) => d['status'] == 'approved').length;
  int get _pendingCount => _documents.where((d) => d['status'] == 'pending').length;
  int get _rejectedCount => _documents.where((d) => d['status'] == 'rejected').length;
  int get _totalCount => _documents.length;
  int get _uploadedCount => _approvedCount + _pendingCount;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(0xFF164E63),
              Color(0xFF0891B2),
              Color(0xFF06B6D4),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Stack(
          children: [
            // Animated bubbles
            Positioned.fill(
              child: AnimatedBuilder(
                animation: _bubbleController,
                builder: (context, child) {
                  return CustomPaint(
                    painter: BubbleBackgroundPainter(_bubbleController.value),
                  );
                },
              ),
            ),

            // Content
            SafeArea(
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: Column(
                  children: [
                    _buildHeader(),
                    _buildProgressSummary(),
                    Expanded(child: _buildDocumentList()),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.arrow_back, color: Colors.white),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Status Dokumen',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              decoration: TextDecoration.none,
            ),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.3),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.orange, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.groups, color: Colors.orange, size: 14),
                SizedBox(width: 4),
                Text(
                  'ABK/CREW',
                  style: TextStyle(
                    color: Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressSummary() {
    final progress = _totalCount > 0 ? _uploadedCount / _totalCount : 0.0;
    final progressPercent = _totalCount > 0 ? (_uploadedCount / _totalCount * 100).toInt() : 0;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.cyan.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          // Progress bar with wave effect
          Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 140,
                height: 140,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withOpacity(0.3),
                    width: 8,
                  ),
                ),
                child: AnimatedBuilder(
                  animation: _bubbleController,
                  builder: (context, child) {
                    return CustomPaint(
                      painter: WaveProgressPainter(
                        progress: progress,
                        animationValue: _bubbleController.value,
                      ),
                      child: child,
                    );
                  },
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          '$progressPercent%',
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            decoration: TextDecoration.none,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Status grid
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatusBubble(
                icon: Icons.check_circle,
                count: _approvedCount,
                label: 'Disetujui',
                color: Colors.green,
              ),
              _buildStatusBubble(
                icon: Icons.hourglass_empty,
                count: _pendingCount,
                label: 'Pending',
                color: Colors.amber,
              ),
              _buildStatusBubble(
                icon: Icons.error,
                count: _rejectedCount,
                label: 'Ditolak',
                color: Colors.red,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBubble({
    required IconData icon,
    required int count,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.3),
              shape: BoxShape.circle,
              border: Border.all(color: color, width: 2),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          const SizedBox(height: 8),
          Text(
            count.toString(),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              decoration: TextDecoration.none,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Colors.white,
              decoration: TextDecoration.none,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentList() {
    return Container(
      margin: const EdgeInsets.only(top: 20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(32),
          topRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                Icon(Icons.description, color: Color(0xFF0891B2), size: 24),
                const SizedBox(width: 12),
                const Text(
                  'Daftar Dokumen',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1A1A1A),
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              itemCount: _documents.length,
              itemBuilder: (context, index) {
                return _buildDocumentCard(_documents[index], index);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentCard(Map<String, dynamic> doc, int index) {
    final status = doc['status'] as String;
    Color statusColor;
    Color bgColor;
    IconData statusIcon;

    switch (status) {
      case 'approved':
        statusColor = Colors.green;
        bgColor = Colors.green.shade50;
        statusIcon = Icons.check_circle;
        break;
      case 'pending':
        statusColor = Colors.amber;
        bgColor = Colors.amber.shade50;
        statusIcon = Icons.hourglass_empty;
        break;
      case 'rejected':
        statusColor = Colors.red;
        bgColor = Colors.red.shade50;
        statusIcon = Icons.error;
        break;
      default:
        statusColor = Colors.grey;
        bgColor = Colors.grey.shade50;
        statusIcon = Icons.help;
    }

    return TweenAnimationBuilder<double>(
      duration: Duration(milliseconds: 300 + (index * 100)),
      tween: Tween(begin: 0.0, end: 1.0),
      builder: (context, value, child) {
        return Transform.scale(
          scale: value,
          child: Opacity(opacity: value, child: child),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: statusColor.withOpacity(0.3), width: 2),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => _showDocDetail(doc),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Color(0xFF0891B2).withOpacity(0.2),
                              Color(0xFF06B6D4).withOpacity(0.1),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          doc['icon'] as IconData,
                          color: Color(0xFF0891B2),
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              doc['name'] as String,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                decoration: TextDecoration.none,
                              ),
                            ),
                            Text(
                              doc['uploadedAt'] as String,
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[600],
                                decoration: TextDecoration.none,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(statusIcon, color: statusColor, size: 28),
                    ],
                  ),
                  if (status == 'rejected' && doc['reason'] != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.info, color: Colors.red, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              doc['reason'] as String,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.red[700],
                                decoration: TextDecoration.none,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pushNamed(
                            context,
                            '/crew-document-upload',
                            arguments: {'rejectedDocType': doc['name']},
                          ).then((_) => _loadDocuments());
                        },
                        icon: const Icon(Icons.upload, size: 16),
                        label: const Text('Upload Ulang'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showDocDetail(Map<String, dynamic> doc) {
    // Same as nahkoda version
  }
}

class BubbleBackgroundPainter extends CustomPainter {
  final double animationValue;

  BubbleBackgroundPainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    for (int i = 0; i < 20; i++) {
      final x = (i * 60.0) % size.width;
      final y = (size.height - (animationValue * size.height * 2 + i * 50) % (size.height * 1.5));
      final radius = 4.0 + (i % 4) * 2;

      canvas.drawCircle(Offset(x, y), radius, paint);
    }
  }

  @override
  bool shouldRepaint(BubbleBackgroundPainter oldDelegate) => true;
}

class WaveProgressPainter extends CustomPainter {
  final double progress;
  final double animationValue;

  WaveProgressPainter({required this.progress, required this.animationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final waveHeight = size.height * (1 - progress);
    final paint = Paint()
      ..color = Colors.cyan.withOpacity(0.6)
      ..style = PaintingStyle.fill;

    final path = Path();
    path.moveTo(0, waveHeight);

    for (double i = 0; i <= size.width; i++) {
      path.lineTo(
        i,
        waveHeight + math.sin((i / size.width * 2 * math.pi) + (animationValue * 2 * math.pi)) * 8,
      );
    }

    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(WaveProgressPainter oldDelegate) => true;
}