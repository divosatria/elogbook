// lib/screens/documents/nahkoda_document_popup.dart

import 'package:flutter/material.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:lottie/lottie.dart';


class NahkodaDocumentPopup extends StatefulWidget {
  const NahkodaDocumentPopup({Key? key}) : super(key: key);

  @override
  State<NahkodaDocumentPopup> createState() => _NahkodaDocumentPopupState();
}

class _NahkodaDocumentPopupState extends State<NahkodaDocumentPopup>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  late AnimationController _slideController;
  late AnimationController _shakeController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _shakeAnimation;
  bool _isMinimized = false;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );

    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    );

    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _scaleAnimation = CurvedAnimation(
      parent: _scaleController,
      curve: Curves.easeOutCubic,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));

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

    // Start animations
    _scaleController.forward();
    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _fadeController.dispose();
    _slideController.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  void _shakePopup() {
    _shakeController.forward(from: 0);
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
        _shakePopup();
      },
      child: Stack(
        children: [
          // Background blur effect
          if (!_isMinimized)
            GestureDetector(
              onTap: _shakePopup,
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: Container(
                  color: Colors.black.withOpacity(0.5),
                ),
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
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF1E3A8A), Color(0xFF3B82F6)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.blue.withOpacity(0.5),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        const Center(
                          child: Icon(
                            Icons.sailing,
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
                              color: Colors.red,
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

          // Main popup content
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
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        margin: EdgeInsets.symmetric(horizontal: ResponsiveHelper.popupPadding(context)),
                        constraints: BoxConstraints(maxWidth: ResponsiveHelper.popupMaxWidth(context)),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(ResponsiveHelper.popupBorderRadius(context)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.3),
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
            ),
        ],
      ),
    );
  }

  Widget _buildPopupContent() {
    return Container(
      height: ResponsiveHelper.popupHeight(context, mobile: 525, smallTablet: 450, mediumTablet: 480, largeTablet: 525),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF0F172A), // Dark blue navy
            Color(0xFF1E3A8A), // Medium blue
            Color(0xFF3B82F6), // Bright blue
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          // Animated wave background
          Positioned.fill(
            child: CustomPaint(
              painter: WavePainter(),
            ),
          ),

          // Ocean particles effect
          Positioned.fill(
            child: _buildOceanParticles(),
          ),

          // Content
          Column(
            children: [
              // Header with close and minimize buttons
              _buildHeader(),

              // Main content
              Expanded(
                child: Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: EdgeInsets.all(ResponsiveHelper.popupPadding(context)),
                        child: Column(
                          children: [
                            // Captain illustration
                            _buildCaptainIllustration(),

                            SizedBox(height: ResponsiveHelper.spacing(context, mobile: 24, tablet: 20)),

                            // Title
                             Text(
                              'Selamat Datang, Nahkoda!',
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
                              'Lengkapi dokumen kepelayaran Anda untuk memulai perjalanan',
                              style: TextStyle(
                                fontSize: ResponsiveHelper.popupSubtitleSize(context),
                                color: Colors.white,
                                height: 1.4,
                                decoration: TextDecoration.none,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Action buttons at bottom
                    Padding(
                      padding: EdgeInsets.all(ResponsiveHelper.popupPadding(context)),
                      child: _buildActionButtons(),
                    ),
                  ],
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
              color: Colors.amber.withOpacity(0.3),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.amber, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.stars, color: Colors.amber, size: 16),
                SizedBox(width: 6),
                const Text(
                  'NAHKODA',
                  style: TextStyle(
                    color: Colors.amber,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                    decoration: TextDecoration.none,
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
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCaptainIllustration() {
    // Debug info
    final illustrationSize = ResponsiveHelper.popupIllustrationSize(context);
    final lottieSize = ResponsiveHelper.popupLottieSize(context, mobile: 120, smallTablet: 90, mediumTablet: 100, largeTablet: 110);
    print('🖼️ [POPUP] Illustration size: $illustrationSize');
    print('🖼️ [POPUP] Lottie size: $lottieSize');
    
    return Container(
      width: illustrationSize,
      height: illustrationSize,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [
            Colors.white.withOpacity(0.2),
            Colors.white.withOpacity(0.05),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Ripple effect
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withOpacity(0.3),
                  width: 2,
                ),
              ),
            ),
          ),
          Center(
            child: Lottie.asset(
              'assets/animations/captain.json',
              width: lottieSize,
              height: lottieSize,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(
                  Icons.sailing,
                  color: Colors.white,
                  size: 80,
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return SizedBox(
      width: double.infinity,
      height: ResponsiveHelper.popupButtonHeight(context),
      child: ElevatedButton(
        onPressed: () {
          Navigator.of(context).pop();
          Navigator.pushNamed(context, '/nahkoda-document-upload');
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF1E3A8A),
          padding: EdgeInsets.symmetric(
            horizontal: ResponsiveHelper.width(context, mobile: 24, tablet: 20),
            vertical: ResponsiveHelper.height(context, mobile: 16, tablet: 14),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 8,
          shadowColor: Colors.white.withOpacity(0.5),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.upload_file, size: 20),
            SizedBox(width: 8),
            Text(
              'Mulai Upload Dokumen',
              style: TextStyle(
                fontSize: ResponsiveHelper.font(context, mobile: 16, tablet: 14),
                fontWeight: FontWeight.bold,
                decoration: TextDecoration.none,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOceanParticles() {
    return Stack(
      children: List.generate(20, (index) {
        return Positioned(
          left: (index * 50.0) % 400,
          top: (index * 80.0) % 600,
          child: Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
          ),
        );
      }),
    );
  }
}

class WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint1 = Paint()
      ..color = Colors.white.withOpacity(0.05)
      ..style = PaintingStyle.fill;

    final paint2 = Paint()
      ..color = Colors.white.withOpacity(0.03)
      ..style = PaintingStyle.fill;

    final path1 = Path();
    path1.moveTo(0, size.height * 0.7);
    path1.quadraticBezierTo(
      size.width * 0.25,
      size.height * 0.65,
      size.width * 0.5,
      size.height * 0.7,
    );
    path1.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.75,
      size.width,
      size.height * 0.7,
    );
    path1.lineTo(size.width, size.height);
    path1.lineTo(0, size.height);
    path1.close();

    final path2 = Path();
    path2.moveTo(0, size.height * 0.8);
    path2.quadraticBezierTo(
      size.width * 0.25,
      size.height * 0.85,
      size.width * 0.5,
      size.height * 0.8,
    );
    path2.quadraticBezierTo(
      size.width * 0.75,
      size.height * 0.75,
      size.width,
      size.height * 0.8,
    );
    path2.lineTo(size.width, size.height);
    path2.lineTo(0, size.height);
    path2.close();

    canvas.drawPath(path1, paint1);
    canvas.drawPath(path2, paint2);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}