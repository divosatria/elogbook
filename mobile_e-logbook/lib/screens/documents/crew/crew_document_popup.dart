// lib/screens/documents/crew_document_popup.dart

import 'package:flutter/material.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'dart:ui';

class CrewDocumentPopup extends StatefulWidget {
  const CrewDocumentPopup({Key? key}) : super(key: key);

  @override
  State<CrewDocumentPopup> createState() => _CrewDocumentPopupState();
}

class _CrewDocumentPopupState extends State<CrewDocumentPopup>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  late AnimationController _rotateController;
  late AnimationController _bubbleController;
  late AnimationController _shakeController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
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

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _bubbleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
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
    _fadeController.forward();
    _rotateController.forward();
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _fadeController.dispose();
    _rotateController.dispose();
    _bubbleController.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  void _maximize() {
    setState(() {
      _isMinimized = false;
    });
    _scaleController.forward();
    _fadeController.forward();
  }

  void _closePopup() {
    _scaleController.reverse().then((_) {
      if (mounted) {
        Navigator.of(context).pop();
      }
    });
    _fadeController.reverse();
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
          if (!_isMinimized)
            FadeTransition(
              opacity: _fadeAnimation,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  color: Colors.black.withOpacity(0.5),
                ),
              ),
            ),
          if (_isMinimized)
            Positioned(
              bottom: 20,
              right: 20,
              child: ScaleTransition(
                scale: _scaleAnimation,
                child: GestureDetector(
                  onTap: _maximize,
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0891B2), Color(0xFF06B6D4)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.cyan.withOpacity(0.5),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        const Center(
                          child: Icon(
                            Icons.groups,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.orange,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
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
                  child: FadeTransition(
                    opacity: _fadeAnimation,
                    child: RotationTransition(
                      turns: Tween<double>(begin: 0.02, end: 0.0).animate(
                        _rotateAnimation,
                      ),
                      child: Container(
                      margin: EdgeInsets.symmetric(horizontal: ResponsiveHelper.popupPadding(context)),
                      constraints: BoxConstraints(maxWidth: ResponsiveHelper.popupMaxWidth(context)),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(ResponsiveHelper.popupBorderRadius(context)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.cyan.withOpacity(0.4),
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
            ),
            )
        ],
      ),
      ),
    );
  }

  Widget _buildPopupContent() {
    return Container(
      height: ResponsiveHelper.popupHeight(context),
      decoration: const BoxDecoration(
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
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _bubbleController,
              builder: (context, child) {
                return CustomPaint(
                  painter: BubblePainter(_bubbleController.value),
                );
              },
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: CustomPaint(
              size: const Size(double.infinity, 150),
              painter: CoralPainter(),
            ),
          ),
          Positioned.fill(
            child: _buildSwimmingFish(),
          ),
          Column(
            children: [
              _buildHeader(),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.all(ResponsiveHelper.popupPadding(context)),
                  child: Column(
                    children: [
                      _buildCrewIllustration(),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 24, tablet: 20)),
                      Text(
                        'Ahoy, Crew!',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.popupTitleSize(context),
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          height: 1.2,
                          decoration: TextDecoration.none,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 12, tablet: 10)),
                      Text(
                        'Siapkan dokumen Anda untuk bergabung dalam pelayaran',
                        style: TextStyle(
                          fontSize: ResponsiveHelper.popupSubtitleSize(context),
                          color: Colors.white70,
                          decoration: TextDecoration.none,
                        ),
                        textAlign: TextAlign.center,
                      ),
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
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.groups, color: Colors.white, size: 16),
                SizedBox(width: 6),
                Text(
                  'CREW',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: _closePopup,
            icon: const Icon(Icons.close, color: Colors.white, size: 24),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white.withOpacity(0.2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCrewIllustration() {
    return Container(
      width: ResponsiveHelper.popupIllustrationSize(context),
      height: ResponsiveHelper.popupIllustrationSize(context),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Icon(
          Icons.groups,
          size: ResponsiveHelper.popupLottieSize(context),
          color: Colors.white.withOpacity(0.8),
        ),
      ),
    );
  }

  Widget _buildSwimmingFish() {
    return Container();
  }

  Widget _buildActionButtons() {
    return SizedBox(
      width: double.infinity,
      height: ResponsiveHelper.popupButtonHeight(context),
      child: ElevatedButton(
        onPressed: () {
          Navigator.of(context).pop();
          Navigator.pushNamed(context, '/crew-document-upload');
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF0891B2),
          padding: EdgeInsets.symmetric(
            horizontal: ResponsiveHelper.width(context, mobile: 48, tablet: 40),
            vertical: ResponsiveHelper.height(context, mobile: 18, tablet: 16),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
          elevation: 4,
        ),
        child: Text(
          'Lengkapi Dokumen',
          style: TextStyle(
            fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 14),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class BubblePainter extends CustomPainter {
  final double animationValue;

  BubblePainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.1)
      ..style = PaintingStyle.fill;

    for (int i = 0; i < 10; i++) {
      final x = (size.width / 10) * i;
      final y = size.height * ((animationValue + i * 0.1) % 1.0);
      canvas.drawCircle(Offset(x, y), 5, paint);
    }
  }

  @override
  bool shouldRepaint(BubblePainter oldDelegate) => true;
}

class CoralPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF164E63).withOpacity(0.3)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..moveTo(0, size.height)
      ..lineTo(0, size.height * 0.5)
      ..quadraticBezierTo(
        size.width * 0.25,
        size.height * 0.3,
        size.width * 0.5,
        size.height * 0.5,
      )
      ..quadraticBezierTo(
        size.width * 0.75,
        size.height * 0.7,
        size.width,
        size.height * 0.5,
      )
      ..lineTo(size.width, size.height)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(CoralPainter oldDelegate) => false;
}
