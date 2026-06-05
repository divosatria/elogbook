// lib/screens/document_upload/widgets/progress_indicator_widget.dart

import 'package:flutter/material.dart';

class ProgressIndicatorWidget extends StatefulWidget {
  final int currentStep;
  final int totalSteps;
  final Map<int, String>? documentStatuses; // step -> status mapping

  const ProgressIndicatorWidget({
    Key? key,
    required this.currentStep,
    required this.totalSteps,
    this.documentStatuses,
  }) : super(key: key);

  @override
  State<ProgressIndicatorWidget> createState() => _ProgressIndicatorWidgetState();
}

class _ProgressIndicatorWidgetState extends State<ProgressIndicatorWidget> with TickerProviderStateMixin {
  late List<AnimationController> _lineControllers;
  late List<Animation<double>> _lineAnimations;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
  }

  void _initializeAnimations() {
    _lineControllers = List.generate(
      widget.totalSteps - 1,
      (index) => AnimationController(
        duration: const Duration(milliseconds: 500),
        vsync: this,
      ),
    );

    _lineAnimations = _lineControllers.map((controller) {
      return Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(parent: controller, curve: Curves.easeInOut),
      );
    }).toList();

    // Animate lines for completed steps
    _updateLineAnimations();
  }

  void _updateLineAnimations() {
    for (int i = 0; i < widget.totalSteps - 1; i++) {
      int currentStepNum = i + 1;
      
      String? currentStatus = widget.documentStatuses?[currentStepNum];
      
      // Garis akan penuh jika step saat ini sudah approved/pending
      if (currentStatus == 'approved' || currentStatus == 'pending') {
        _lineControllers[i].value = 1.0;
      } else {
        _lineControllers[i].value = 0.0;
      }
    }
  }

  @override
  void didUpdateWidget(ProgressIndicatorWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Jika step berubah atau status berubah, update animasi
    if (oldWidget.currentStep != widget.currentStep || 
        oldWidget.documentStatuses != widget.documentStatuses) {
      
      // Cek setiap garis apakah perlu dianimasikan
      for (int i = 0; i < widget.totalSteps - 1; i++) {
        int currentStepNum = i + 1;
        
        String? oldStatus = oldWidget.documentStatuses?[currentStepNum];
        String? newStatus = widget.documentStatuses?[currentStepNum];
        
        bool wasLineFull = (oldStatus == 'approved' || oldStatus == 'pending');
        bool shouldBeLineFull = (newStatus == 'approved' || newStatus == 'pending');
        
        // Jika garis harus muncul (dari kosong ke penuh), animate
        if (!wasLineFull && shouldBeLineFull) {
          _lineControllers[i].forward();
        }
        // Jika garis harus hilang (dari penuh ke kosong), reset
        else if (wasLineFull && !shouldBeLineFull) {
          _lineControllers[i].value = 0.0;
        }
      }
    }
  }

  @override
  void dispose() {
    for (var controller in _lineControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Color _getStepColor(int step, bool isCurrent, String? status) {
    if (status == 'approved') {
      return Colors.green;
    } else if (status == 'pending') {
      return Colors.orange;
    } else if (status == 'rejected') {
      return Colors.red;
    } else {
      if (isCurrent) {
        return Colors.blue;
      } else {
        return Colors.grey[300]!;
      }
    }
  }

  IconData? _getStepIcon(String? status) {
    if (status == 'approved') {
      return Icons.check;
    } else if (status == 'pending') {
      return Icons.schedule;
    } else if (status == 'rejected') {
      return Icons.close;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Step Indicators with connecting lines
          Stack(
            children: [
              // Background lines layer
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Row(
                  children: List.generate(widget.totalSteps, (index) {
                    return Expanded(
                      child: Row(
                        children: [
                          // Space for circle
                          const SizedBox(width: 16),
                          // Line
                          if (index < widget.totalSteps - 1)
                            Expanded(
                              child: AnimatedBuilder(
                                animation: _lineAnimations[index],
                                builder: (context, child) {
                                  int currentStepNum = index + 1;
                                  
                                  String? currentStatus = widget.documentStatuses?[currentStepNum];
                                  
                                  // Tentukan warna garis berdasarkan status step saat ini
                                  Color lineColor = Colors.grey[300]!;
                                  if (currentStatus == 'approved') {
                                    lineColor = Colors.green;
                                  } else if (currentStatus == 'pending') {
                                    lineColor = Colors.orange;
                                  } else if (currentStatus == 'rejected') {
                                    lineColor = Colors.red;
                                  }
                                  
                                  return CustomPaint(
                                    painter: AnimatedLinePainter(
                                      progress: _lineAnimations[index].value,
                                      color: lineColor,
                                    ),
                                    child: Container(height: 3),
                                  );
                                },
                              ),
                            ),
                          // Space for next circle
                          if (index < widget.totalSteps - 1)
                            const SizedBox(width: 16),
                        ],
                      ),
                    );
                  }),
                ),
              ),
              // Circles layer on top
              Row(
                children: List.generate(widget.totalSteps, (index) {
                  int step = index + 1;
                  bool isCurrent = step == widget.currentStep;
                  String? status = widget.documentStatuses?[step];
                  Color stepColor = _getStepColor(step, isCurrent, status);
                  IconData? stepIcon = _getStepIcon(status);

                  return Expanded(
                    child: Column(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: stepColor,
                            border: Border.all(
                              color: isCurrent && status == null ? Colors.blue : Colors.transparent,
                              width: 2,
                            ),
                          ),
                          child: Center(
                            child: stepIcon != null
                                ? Icon(
                                    stepIcon,
                                    color: Colors.white,
                                    size: stepIcon == Icons.schedule ? 16 : 18,
                                  )
                                : Text(
                                    '$step',
                                    style: TextStyle(
                                      color: isCurrent || status != null
                                          ? Colors.white
                                          : Colors.grey[600],
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getStepLabel(step),
                          style: TextStyle(
                            fontSize: 9,
                            color: isCurrent && status == null
                                ? Colors.blue
                                : status != null
                                    ? stepColor
                                    : Colors.grey[600],
                            fontWeight: isCurrent && status == null ? FontWeight.bold : FontWeight.normal,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _getStepLabel(int step) {
    switch (step) {
      case 1:
        return 'KTP';
      case 2:
        return 'Foto';
      case 3:
        return 'NPWP';
      case 4:
        return 'Buku';
      case 5:
        return 'Sertif';
      case 6:
        return 'BST';
      case 7:
        return 'Sehat';
      case 8:
        return 'SKCK';
      default:
        return '';
    }
  }
}

// Custom painter untuk garis yang beranimasi
class AnimatedLinePainter extends CustomPainter {
  final double progress;
  final Color color;

  AnimatedLinePainter({
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final startPoint = Offset(0, size.height / 2);
    final endPoint = Offset(size.width * progress, size.height / 2);

    canvas.drawLine(startPoint, endPoint, paint);
  }

  @override
  bool shouldRepaint(AnimatedLinePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}