import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class AIDetectionLoadingWidget extends StatefulWidget {
  const AIDetectionLoadingWidget({super.key});

  @override
  State<AIDetectionLoadingWidget> createState() =>
      _AIDetectionLoadingWidgetState();
}

class _AIDetectionLoadingWidgetState extends State<AIDetectionLoadingWidget>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  int _currentStep = 0;

  final List<Map<String, dynamic>> _steps = [
    {'text': 'Memproses gambar...', 'icon': Icons.image, 'duration': 800},
    {
      'text': 'AI: Menganalisis gambar...',
      'icon': Icons.psychology,
      'duration': 1500,
    },
    {
      'text': 'AI: Mengidentifikasi spesies...',
      'icon': Icons.search,
      'duration': 1200,
    },
    {
      'text': 'AI: Menghitung berat & jumlah...',
      'icon': Icons.scale,
      'duration': 1000,
    },
    {
      'text': 'AI: Analisis kesegaran...',
      'icon': Icons.auto_awesome,
      'duration': 800,
    },
    {
      'text': 'Menyelesaikan deteksi...',
      'icon': Icons.check_circle_outline,
      'duration': 400,
    },
  ];

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _controller.repeat();
    _pulseController.repeat(reverse: true);
    _startStepAnimation();
  }

  void _startStepAnimation() {
    if (!mounted || _currentStep >= _steps.length) return;

    final stepDuration = _steps[_currentStep]['duration'] as int;

    Future.delayed(Duration(milliseconds: stepDuration), () {
      if (mounted && _currentStep < _steps.length - 1) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            setState(() {
              _currentStep++;
            });
            _startStepAnimation();
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isTablet = size.width >= 600;
    
    // Responsive sizing
    final lottieSize = isTablet ? 120.0 : 177.0;
    final titleSize = isTablet ? 16.0 : 20.0;
    final subtitleSize = isTablet ? 10.0 : 12.0;
    final stepTextSize = isTablet ? 11.0 : 13.0;
    final iconSize = isTablet ? 26.0 : 32.0;
    final padding = isTablet ? 16.0 : 24.0;
    
    return Container(
      margin: EdgeInsets.all(isTablet ? 12 : 16),
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade50, Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade200, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.15),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // AI Icon with Animation
          Lottie.asset(
            'assets/animations/AI.json',
            height: lottieSize * _pulseAnimation.value,
            width: lottieSize * _pulseAnimation.value,
            fit: BoxFit.contain,
          ),

          Text(
            'AI Menganalisis',
            style: TextStyle(
              fontSize: titleSize,
              fontWeight: FontWeight.bold,
              color: Colors.blue.shade800,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Mohon tunggu sebentar...',
            style: TextStyle(
              fontSize: subtitleSize,
              color: Colors.grey.shade600,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 24),

          // Progress Steps
          Column(
            children: List.generate(_steps.length, (index) {
              final isActive = index <= _currentStep;
              final isCompleted = index < _currentStep;
              final step = _steps[index];

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: iconSize,
                      height: iconSize,
                      decoration: BoxDecoration(
                        color: isCompleted
                            ? Colors.green.shade500
                            : isActive
                            ? Colors.blue.shade500
                            : Colors.grey.shade300,
                        shape: BoxShape.circle,
                        boxShadow: isActive
                            ? [
                                BoxShadow(
                                  color: Colors.blue.withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : [],
                      ),
                      child: isCompleted
                          ? const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 18,
                            )
                          : isActive
                          ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : Icon(
                              step['icon'] as IconData,
                              color: Colors.grey.shade500,
                              size: 16,
                            ),
                    ),

                    const SizedBox(width: 12),

                    Expanded(
                      child: AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 300),
                        style: TextStyle(
                          fontSize: stepTextSize,
                          color: isActive
                              ? Colors.blue.shade700
                              : Colors.grey.shade600,
                          fontWeight: isActive
                              ? FontWeight.w600
                              : FontWeight.normal,
                        ),
                        child: Text(step['text'] as String),
                      ),
                    ),

                    if (isActive && !isCompleted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.blue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${(step['duration'] as int) ~/ 1000}s',
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.blue.shade700,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
              );
            }),
          ),

          const SizedBox(height: 20),

          // Progress Bar
          Stack(
            children: [
              Container(
                height: 6,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: 6,
                width:
                    MediaQuery.of(context).size.width *
                    ((_currentStep + 1) / _steps.length),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade400, Colors.blue.shade600],
                  ),
                  borderRadius: BorderRadius.circular(3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.3),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${((_currentStep + 1) / _steps.length * 100).toInt()}% selesai',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue.shade700,
                ),
              ),
              Row(
                children: [
                  Icon(
                    Icons.timer_outlined,
                    size: 14,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _getEstimatedTime(),
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Deteksi AI: Backend AI Model',
                    style: TextStyle(fontSize: 11, color: Colors.blue.shade700),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getEstimatedTime() {
    int remainingTime = 0;
    for (int i = _currentStep; i < _steps.length; i++) {
      remainingTime += _steps[i]['duration'] as int;
    }

    if (remainingTime < 1000) {
      return '< 1s';
    } else {
      return '~${(remainingTime / 1000).ceil()}s';
    }
  }
}
