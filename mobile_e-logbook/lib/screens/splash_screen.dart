import 'package:flutter/material.dart';
import 'package:e_logbook/screens/Login/welcome_screen.dart';
import 'package:e_logbook/screens/main_screen.dart';
import 'package:e_logbook/services/api/auth_service.dart';
import 'package:e_logbook/utils/responsive_helper.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _navigateAfterDelay();
  }

  void _initAnimations() {
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );

    _controller.forward();
  }

  Future<void> _navigateAfterDelay() async {
    await Future.delayed(const Duration(seconds: 3));
    if (!mounted) return;

    final nextScreen = await _determineNextScreen();
    _navigateToScreen(nextScreen);
  }

  Future<Widget> _determineNextScreen() async {
    final token = await AuthService.getToken();
    return (token != null && token.isNotEmpty) 
        ? const MainScreen() 
        : const WelcomeScreen();
  }

  void _navigateToScreen(Widget screen) {
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, _) => screen,
        transitionsBuilder: (context, animation, _, child) {
          return FadeTransition(opacity: animation, child: child);
        },
        transitionDuration: const Duration(milliseconds: 700),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Gunakan ResponsiveHelper untuk konsistensi
    final isTablet = ResponsiveHelper.isTablet(context);
    final isLandscape = ResponsiveHelper.isLandscape(context);
    final size = MediaQuery.of(context).size;
    final tabletSize = ResponsiveHelper.tabletSize(context);
    
    // DEBUG: Print detail screen
    print('📱 ========== SPLASH SCREEN DEBUG ==========');
    print('📱 Screen Width: ${size.width}');
    print('📱 Screen Height: ${size.height}');
    print('📱 Shortest Side: ${size.shortestSide}');
    print('📱 isTablet: $isTablet (ResponsiveHelper)');
    print('📱 isLandscape: $isLandscape');
    print('📱 Tablet Size: $tabletSize');
    print('📱 ==========================================');
    
    return Scaffold(
      body: _buildLayout(isTablet, isLandscape, tabletSize),
    );
  }

  Widget _buildLayout(bool isTablet, bool isLandscape, String tabletSize) {
    print('\n🏛️ ========== LAYOUT DEBUG ==========');
    print('🏛️ isTablet: $isTablet');
    print('🏛️ isLandscape: $isLandscape');
    print('🏛️ tabletSize: $tabletSize');
    print('🏛️ Kondisi: !isTablet && !isLandscape = ${!isTablet && !isLandscape}');
    
    if (!isTablet && !isLandscape) {
      print('🏛️ Layout: Mobile Portrait');
      print('🏛️ ==================================\n');
      return _buildMobilePortraitLayout();
    } else {
      print('🏛️ Layout: Horizontal (Tablet/Mobile Landscape)');
      print('🏛️ ==================================\n');
      return _buildHorizontalLayout(isTablet, isLandscape, tabletSize);
    }
  }

  Widget _buildMobilePortraitLayout() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.white, Color(0xFFF8FAFC)],
        ),
      ),
      child: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildLogo(false, false),
                  const SizedBox(height: 24),
                  _buildTitle(false, false),
                  const SizedBox(height: 8),
                  _buildVersion(false, false),
                  const SizedBox(height: 32),
                  _buildLoadingIndicator(false, false),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHorizontalLayout(bool isTablet, bool isLandscape, String tabletSize) {
    print('\n📏 ========== HORIZONTAL LAYOUT DEBUG ==========');
    print('📏 isTablet: $isTablet');
    print('📏 isLandscape: $isLandscape');
    print('📏 tabletSize: $tabletSize');
    
    // Gunakan ResponsiveHelper untuk maxWidth
    final maxWidth = ResponsiveHelper.adaptiveValue(
      context,
      mobile: 300,
      smallTablet: 400,
      mediumTablet: 450,
      largeTablet: 500,
    );
    
    print('📏 maxWidth: $maxWidth (from ResponsiveHelper)');
    
    final spacing1 = ResponsiveHelper.spacing(context, mobile: 20, tablet: 28);
    final spacing2 = ResponsiveHelper.spacing(context, mobile: 8, tablet: 12);
    final spacing3 = ResponsiveHelper.spacing(context, mobile: 24, tablet: 32);
    
    print('📏 Spacing: $spacing1, $spacing2, $spacing3');
    print('📏 ============================================\n');
    
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.white, Color(0xFFF8FAFC)],
        ),
      ),
      child: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Padding(
                padding: ResponsiveHelper.paddingHorizontal(
                  context,
                  mobile: 24,
                  tablet: 40,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildLogo(isTablet, isLandscape, tabletSize),
                    SizedBox(height: spacing1),
                    _buildTitle(isTablet, isLandscape, tabletSize),
                    SizedBox(height: spacing2),
                    _buildVersion(isTablet, isLandscape, tabletSize),
                    SizedBox(height: spacing3),
                    _buildLoadingIndicator(isTablet, isLandscape, tabletSize),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogo(bool isTablet, bool isLandscape, [String tabletSize = 'mobile']) {
    print('\n🖼️ ========== LOGO DEBUG ==========');
    print('🖼️ isTablet: $isTablet');
    print('🖼️ isLandscape: $isLandscape');
    print('🖼️ tabletSize: $tabletSize');
    
    // Gunakan ResponsiveHelper untuk ukuran otomatis
    final logoSize = ResponsiveHelper.adaptiveValue(
      context,
      mobile: 200,           // Mobile portrait - lebih kecil
      smallTablet: 220,      // Small tablet landscape - sedang
      mediumTablet: 250,     // Medium tablet landscape - besar
      largeTablet: 280,      // Large tablet landscape - sangat besar
      mobileLandscape: 100,  // Mobile landscape - kecil
    );
    
    print('🖼️ FINAL Logo Size: $logoSize (from ResponsiveHelper)');
    print('🖼️ ==================================\n');
    
    return Image.asset(
      'assets/OIP.png',
      width: logoSize,
      height: logoSize,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stackTrace) {
        return Container(
          width: logoSize,
          height: logoSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.grey[300],
          ),
          child: Icon(
            Icons.school,
            size: logoSize * 0.5,
            color: Colors.grey[600],
          ),
        );
      },
    );
  }

  Widget _buildTitle(bool isTablet, bool isLandscape, [String tabletSize = 'mobile']) {
    final fontSize = ResponsiveHelper.font(
      context,
      mobile: 24,
      tablet: 32,
    );
    
    return Text(
      'e-Logbook',
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: FontWeight.bold,
        color: const Color(0xFF1B4F9C),
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildVersion(bool isTablet, bool isLandscape, [String tabletSize = 'mobile']) {
    final fontSize = ResponsiveHelper.font(
      context,
      mobile: 12,
      tablet: 14,
    );
    
    final padding = ResponsiveHelper.width(
      context,
      mobile: 10,
      tablet: 12,
    );
    
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: padding + 4,
        vertical: padding - 2,
      ),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        'Versi 1.0',
        style: TextStyle(
          fontSize: fontSize,
          color: Colors.grey[600],
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildLoadingIndicator(bool isTablet, bool isLandscape, [String tabletSize = 'mobile']) {
    final size = ResponsiveHelper.width(
      context,
      mobile: 24,
      tablet: 28,
    );
    
    return SizedBox(
      width: size,
      height: size,
      child: const CircularProgressIndicator(
        strokeWidth: 2.5,
        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1B4F9C)),
      ),
    );
  }
}