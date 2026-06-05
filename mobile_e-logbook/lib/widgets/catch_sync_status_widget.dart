import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import '../services/local/offline_sync_service.dart';

class CatchSyncStatusWidget extends StatefulWidget {
  final String catchId;
  final String initialStatus;

  const CatchSyncStatusWidget({
    Key? key,
    required this.catchId,
    this.initialStatus = 'synced',
  }) : super(key: key);

  @override
  _CatchSyncStatusWidgetState createState() => _CatchSyncStatusWidgetState();
}

class _CatchSyncStatusWidgetState extends State<CatchSyncStatusWidget> {
  String status = 'synced';
  Map<String, dynamic>? pendingDetails;

  @override
  void initState() {
    super.initState();
    status = widget.initialStatus;
    _checkSyncStatus();
  }

  Future<void> _checkSyncStatus() async {
    final isPending = await OfflineSyncService.isCatchPending(widget.catchId);
    
    if (isPending) {
      final details = await OfflineSyncService.getPendingCatchDetails(widget.catchId);
      if (mounted) {
        setState(() {
          status = 'pending';
          pendingDetails = details;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return _buildStatusChip();
  }

  Widget _buildStatusChip() {
    switch (status) {
      case 'synced':
        return Container(
          padding: EdgeInsets.symmetric(
            horizontal: ResponsiveHelper.width(context, mobile: 8, tablet: 10),
            vertical: ResponsiveHelper.height(context, mobile: 4, tablet: 6),
          ),
          decoration: BoxDecoration(
            color: Colors.green.shade100,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.green.shade300),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.cloud_done, 
                size: ResponsiveHelper.width(context, mobile: 14, tablet: 16), 
                color: Colors.green.shade700,
              ),
              SizedBox(width: ResponsiveHelper.width(context, mobile: 4, tablet: 6)),
              Text(
                'Terkirim',
                style: TextStyle(
                  fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                  fontWeight: FontWeight.w600,
                  color: Colors.green.shade800,
                ),
              ),
            ],
          ),
        );

      case 'pending':
        return GestureDetector(
          onTap: () => _showPendingDetails(),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: ResponsiveHelper.width(context, mobile: 8, tablet: 10),
              vertical: ResponsiveHelper.height(context, mobile: 4, tablet: 6),
            ),
            decoration: BoxDecoration(
              color: Colors.orange.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.orange.shade300),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: ResponsiveHelper.width(context, mobile: 12, tablet: 14),
                  height: ResponsiveHelper.height(context, mobile: 12, tablet: 14),
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(Colors.orange.shade700),
                  ),
                ),
                SizedBox(width: ResponsiveHelper.width(context, mobile: 4, tablet: 6)),
                Text(
                  'Menunggu',
                  style: TextStyle(
                    fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                    fontWeight: FontWeight.w600,
                    color: Colors.orange.shade800,
                  ),
                ),
                Icon(
                  Icons.info_outline, 
                  size: ResponsiveHelper.width(context, mobile: 12, tablet: 14), 
                  color: Colors.orange.shade700,
                ),
              ],
            ),
          ),
        );

      case 'failed':
        return GestureDetector(
          onTap: () => _showFailedDetails(),
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: ResponsiveHelper.width(context, mobile: 8, tablet: 10),
              vertical: ResponsiveHelper.height(context, mobile: 4, tablet: 6),
            ),
            decoration: BoxDecoration(
              color: Colors.red.shade100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.error_outline, 
                  size: ResponsiveHelper.width(context, mobile: 14, tablet: 16), 
                  color: Colors.red.shade700,
                ),
                SizedBox(width: ResponsiveHelper.width(context, mobile: 4, tablet: 6)),
                Text(
                  'Gagal',
                  style: TextStyle(
                    fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                    fontWeight: FontWeight.w600,
                    color: Colors.red.shade800,
                  ),
                ),
              ],
            ),
          ),
        );

      default:
        return SizedBox.shrink();
    }
  }

  void _showPendingDetails() {
    if (pendingDetails == null) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.cloud_upload, color: Colors.orange),
            SizedBox(width: ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
            Text('Status Pengiriman'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Data ini sedang menunggu untuk dikirim ke server.',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
              ),
            ),
            SizedBox(height: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
            Container(
              padding: EdgeInsets.all(ResponsiveHelper.width(context, mobile: 12, tablet: 16)),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Detail:',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: ResponsiveHelper.height(context, mobile: 4, tablet: 6)),
                  Text('Percobaan: ${pendingDetails!['retry_count']} kali'),
                  Text('Dibuat: ${_formatDate(pendingDetails!['created_at'])}'),
                  if (pendingDetails!['last_error'] != null)
                    Text('Error: ${pendingDetails!['last_error']}'),
                ],
              ),
            ),
            SizedBox(height: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
            Text(
              '💡 Data akan dikirim otomatis saat koneksi internet stabil.',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
                fontStyle: FontStyle.italic,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Mengerti'),
          ),
        ],
      ),
    );
  }

  void _showFailedDetails() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.error, color: Colors.red),
            SizedBox(width: ResponsiveHelper.width(context, mobile: 8, tablet: 10)),
            Text('Pengiriman Gagal'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Data ini gagal dikirim ke server setelah beberapa percobaan.',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 14, tablet: 16),
              ),
            ),
            SizedBox(height: ResponsiveHelper.height(context, mobile: 12, tablet: 16)),
            Text(
              '🔄 Sistem akan terus mencoba mengirim data ini secara otomatis.',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 12, tablet: 14),
                fontStyle: FontStyle.italic,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Mengerti'),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }
}