// lib/screens/documents/crew_pending_popup.dart
import 'package:flutter/material.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:lottie/lottie.dart';
import 'dart:ui';
import 'dart:math' as math;

class CrewPendingPopup extends StatefulWidget {
  final int pendingCount;
  final int approvedCount;
  final int rejectedCount;
  final int totalCount;

  const CrewPendingPopup({
    Key? key,
    this.pendingCount = 0,
    this.approvedCount = 0,
    this.rejectedCount = 0,
    this.totalCount = 6,
  }) : super(key: key);

  @override
  State<CrewPendingPopup> createState() => _CrewPendingPopupState();
}

class _CrewPendingPopupState extends State<CrewPendingPopup>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _rotateController;
  late AnimationController _waveController;
  late AnimationController _shakeController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _rotateAnimation;
  late Animation<double> _shakeAnimation;
  bool _isMinimized = false;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.easeOutBack,
    );

    _rotateAnimation = CurvedAnimation(
      parent: _rotateController,
      curve: Curves.easeOutCubic,
    );

    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.05), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: -0.05), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -0.05, end: 0.05), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: -0.05), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -0.05, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(
      parent: _shakeController,
      curve: Curves.easeInOut,
    ));

    _scaleController.forward();
    _rotateController.forward();
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _rotateController.dispose();
    _waveController.dispose();
    _shakeController.dispose();
    super.dispose();
  }


  void _maximize() {
    setState(() => _isMinimized = false);
    _scaleController.forward();
  }

  void _closePopup() {
    _scaleController.reverse().then((_) {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _shakeController.forward(from: 0);
      },
      child: GestureDetector(
        onTap: () => _shakeController.forward(from: 0),
        child: Stack(
        children: [
          // Background blur
          if (!_isMinimized)
            BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                color: Colors.black.withOpacity(0.5),
              ),
            ),

          // Minimized floating button
          if (_isMinimized)
            Positioned(
              bottom: 20,
              right: 20,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: GestureDetector(
                  onTap: _maximize,
                  child: Stack(
                    children: [
                      Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFA726), Color(0xFFFB8C00)],
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.orange.withOpacity(0.5),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.hourglass_empty,
                          color: Colors.white,
                          size: 32,
                        ),
                      ),
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${widget.pendingCount}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Main popup
          if (!_isMinimized)
            Center(
              child: AnimatedBuilder(
                animation: _shakeAnimation,
                builder: (context, child) {
                  return Transform.rotate(
                    angle: _shakeAnimation.value,
                    child: child,
                  );
                },
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: RotationTransition(
                    turns: Tween<double>(begin: -0.02, end: 0.0).animate(_rotateAnimation),
                    child: Container(
                    margin: EdgeInsets.symmetric(horizontal: ResponsiveHelper.popupPadding(context)),
                    constraints: BoxConstraints(maxWidth: ResponsiveHelper.popupMaxWidth(context)),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(ResponsiveHelper.popupBorderRadius(context)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.orange.withOpacity(0.5),
                          blurRadius: 40,
                          offset: const Offset(0, 20),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(ResponsiveHelper.popupBorderRadius(context)),
                      child: _buildPopupContent(),
                    ),
                  ),
                ),
              ),
            ),
            )
        ],
      ),
      ),
    );
  }

  Widget _buildPopupContent() {
    // Ubah warna jika ada rejected
    final hasRejected = widget.rejectedCount > 0;
    print('🎨 [CREW POPUP] rejectedCount: ${widget.rejectedCount}, hasRejected: $hasRejected');
    
    final gradientColors = hasRejected
        ? [
            Color(0xFFB91C1C), // Merah gelap
            Color(0xFFDC2626), // Merah tua
            Color(0xFFEF4444), // Merah
          ]
        : [
            Color(0xFFF57C00),
            Color(0xFFFB8C00),
            Color(0xFFFFA726),
          ];
    
    print('🎨 [CREW POPUP] Using colors: ${hasRejected ? "RED" : "ORANGE"}');
    
    return Container(
      height: ResponsiveHelper.popupHeight(context),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          // Animated sand timer effect
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _waveController,
              builder: (context, child) {
                return CustomPaint(
                  painter: SandTimerPainter(_waveController.value),
                );
              },
            ),
          ),

          // Floating hourglasses
          _buildFloatingHourglasses(),

          // Content
          Column(
            children: [
              _buildHeader(),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(ResponsiveHelper.popupPadding(context)),
                  child: Column(
                    children: [
                      _buildPendingIllustration(),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 24, tablet: 20)),
                      Text(
                        'Sedang Diproses',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.popupTitleSize(context),
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          decoration: TextDecoration.none,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 12, tablet: 10)),
                      Text(
                        '${widget.pendingCount} dokumen Anda sedang diperiksa admin',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.popupSubtitleSize(context),
                          color: Colors.white,
                          decoration: TextDecoration.none,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 32, tablet: 24)),
                      _buildQuickInfo(),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 32, tablet: 24)),
                      _buildActionButtons(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 16, 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.black.withOpacity(0.3),
            Colors.transparent,
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.3),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.groups, color: Colors.white, size: 16),
                SizedBox(width: 6),
                Text(
                  'ABK/CREW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: _closePopup,
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 20),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }



  Widget _buildPendingIllustration() {
    return AnimatedBuilder(
      animation: _waveController,
      builder: (context, child) {
        return Transform.rotate(
          angle: math.sin(_waveController.value * 2 * math.pi) * 0.1,
          child: Container(
            width: ResponsiveHelper.popupIllustrationSize(context),
            height: ResponsiveHelper.popupIllustrationSize(context),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [
                  Colors.white.withOpacity(0.3),
                  Colors.white.withOpacity(0.1),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.white.withOpacity(0.3),
                  blurRadius: 30,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Colors.white.withOpacity(0.5),
                        width: 3,
                      ),
                    ),
                  ),
                ),
                Center(
                  child: Lottie.asset(
                    'assets/animations/hourglass.json',
                    width: ResponsiveHelper.popupLottieSize(context, mobile: 120, smallTablet: 90, mediumTablet: 100, largeTablet: 110),
                    height: ResponsiveHelper.popupLottieSize(context, mobile: 120, smallTablet: 90, mediumTablet: 100, largeTablet: 110),
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(
                        Icons.hourglass_empty,
                        color: Colors.white,
                        size: 80,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFloatingHourglasses() {
    return Stack(
      children: [
        _buildFloatingIcon(Icons.hourglass_top, 50, 100, 0),
        _buildFloatingIcon(Icons.hourglass_bottom, 300, 80, 1),
      ],
    );
  }

  Widget _buildFloatingIcon(IconData icon, double left, double top, int index) {
    return Positioned(
      left: left,
      top: top,
      child: TweenAnimationBuilder<double>(
        duration: Duration(milliseconds: 1500 + (index * 200)),
        tween: Tween(begin: 0.0, end: 1.0),
        builder: (context, value, child) {
          return Transform.rotate(
            angle: (value * 2 * math.pi) / 8,
            child: Opacity(
              opacity: 0.15 + (0.1 * value),
              child: Icon(icon, color: Colors.white, size: 30),
            ),
          );
        },
      ),
    );
  }





  Widget _buildQuickInfo() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.2), width: 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 32),
                const SizedBox(height: 8),
                Text(
                  '${widget.approvedCount}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.none,
                  ),
                ),
                Text(
                  'Selesai',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(width: 20),
          Expanded(
            child: Column(
              children: [
                const Icon(Icons.pending_actions, color: Colors.white, size: 32),
                const SizedBox(height: 8),
                Text(
                  '${widget.pendingCount}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    decoration: TextDecoration.none,
                  ),
                ),
                Text(
                  'Pending',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Container(
      width: double.infinity,
      height: 56,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Colors.white, Color(0xFFF5F5F5)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: () {
          Navigator.of(context).pop();
          Navigator.pushNamed(context, '/crew-document-status');
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment, size: 20, color: Color(0xFFFB8C00)),
            SizedBox(width: 8),
            Text(
              'Lihat Status Detail',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 14),
                fontWeight: FontWeight.bold,
                color: Color(0xFFFB8C00),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SandTimerPainter extends CustomPainter {
  final double animationValue;

  SandTimerPainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.08)
      ..style = PaintingStyle.fill;

    // Draw sand falling effect
    for (int i = 0; i < 15; i++) {
      final x = (i * 40.0) % size.width;
      final y = (animationValue * size.height + i * 50) % size.height;
      final radius = 2.0 + (i % 3);

      canvas.drawCircle(Offset(x, y), radius, paint);
    }
  }

  @override
  bool shouldRepaint(SandTimerPainter oldDelegate) => true;
}