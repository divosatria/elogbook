import 'package:flutter/material.dart';
import '../services/local/offline_sync_service.dart';
import '../services/local/catch_submission_service.dart';

class SyncStatusWidget extends StatefulWidget {
  @override
  _SyncStatusWidgetState createState() => _SyncStatusWidgetState();
}

class _SyncStatusWidgetState extends State<SyncStatusWidget> {
  int pendingCount = 0;
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadPendingCount();
  }

  Future<void> _loadPendingCount() async {
    final count = await OfflineSyncService.getPendingCount();
    if (mounted) {
      setState(() {
        pendingCount = count;
      });
    }
  }

  Future<void> _manualSync() async {
    setState(() {
      isLoading = true;
    });

    final result = await CatchSubmissionService.manualSync();
    
    if (mounted) {
      setState(() {
        isLoading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: result.success ? Colors.green : Colors.red,
        ),
      );
      
      _loadPendingCount(); // Refresh count
    }
  }

  @override
  Widget build(BuildContext context) {
    if (pendingCount == 0) return SizedBox.shrink();

    return Container(
      margin: EdgeInsets.all(8),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.shade300),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_upload, color: Colors.orange.shade700),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              '$pendingCount data menunggu untuk dikirim',
              style: TextStyle(
                color: Colors.orange.shade800,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          if (isLoading)
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation(Colors.orange.shade700),
              ),
            )
          else
            TextButton(
              onPressed: _manualSync,
              child: Text(
                'SYNC',
                style: TextStyle(
                  color: Colors.orange.shade700,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }
}