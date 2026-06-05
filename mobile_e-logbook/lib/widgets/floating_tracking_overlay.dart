import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';

class FloatingTrackingOverlay extends StatefulWidget {
  final Widget child;

  const FloatingTrackingOverlay({
    Key? key,
    required this.child,
  }) : super(key: key);

  @override
  State<FloatingTrackingOverlay> createState() => _FloatingTrackingOverlayState();
}

class _FloatingTrackingOverlayState extends State<FloatingTrackingOverlay> {
  Offset _position = Offset(20, 100);
  
  @override
  Widget build(BuildContext context) {
    return Consumer<TrackingMinimizeProvider>(
      builder: (context, minimizeProvider, child) {
        return Stack(
          children: [
            widget.child,
            
            // Floating minimized tracking bubble
            if (minimizeProvider.isMinimized && minimizeProvider.isTrackingActive)
              Positioned(
                left: _position.dx,
                top: _position.dy,
                child: Draggable(
                  feedback: _buildMiniBubble(minimizeProvider, isDragging: true),
                  childWhenDragging: Container(),
                  onDragEnd: (details) {
                    setState(() {
                      final screenSize = MediaQuery.of(context).size;
                      _position = Offset(
                        details.offset.dx.clamp(0, screenSize.width - 120),
                        details.offset.dy.clamp(0, screenSize.height - 160),
                      );
                    });
                  },
                  child: _buildMiniBubble(minimizeProvider),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _buildMiniBubble(TrackingMinimizeProvider provider, {bool isDragging = false}) {
    return GestureDetector(
      onTap: () {
        // Maximize and navigate back to tracking
        provider.maximize();
        Navigator.pushNamed(context, '/active-tracking');
      },
      child: Container(
        width: 120,
        height: 160,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDragging ? 0.4 : 0.3),
              blurRadius: isDragging ? 16 : 12,
              offset: Offset(0, isDragging ? 6 : 4),
            ),
          ],
        ),
        child: Column(
          children: [
            // Mini Header
            Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                ),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(Icons.directions_boat, color: Colors.white, size: 16),
                  Text(
                    'Tracking',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Icon(Icons.open_in_full, color: Colors.white, size: 12),
                ],
              ),
            ),
            // Mini Content
            Expanded(
              child: Container(
                padding: EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.location_on,
                      color: Color(0xFF1B4F9C),
                      size: 32,
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Tracking Aktif',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1B4F9C),
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Tap untuk buka',
                      style: TextStyle(
                        fontSize: 8,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
