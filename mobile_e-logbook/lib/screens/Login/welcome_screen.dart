import 'package:flutter/material.dart';
import 'package:e_logbook/screens/Login/login_screen.dart';
import 'package:e_logbook/widgets/app_info.dart';
import 'package:e_logbook/utils/responsive_helper.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  @override
  Widget build(BuildContext context) {
    // Gunakan ResponsiveHelper
    final isTablet = ResponsiveHelper.isTablet(context);
    final isLandscape = ResponsiveHelper.isLandscape(context);
    
    return Theme(
      data: Theme.of(context).copyWith(
        hoverColor: Colors.transparent,
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
      ),
      child: Scaffold(
        body: _buildLayout(isTablet, isLandscape),
      ),
    );
  }

  Widget _buildLayout(bool isTablet, bool isLandscape) {
    if (!isTablet && !isLandscape) {
      return _buildMobilePortraitLayout();
    } else {
      return _buildHorizontalLayout(isTablet, isLandscape);
    }
  }

  Widget _buildMobilePortraitLayout() {
    return Column(
      children: [
        _buildHeader(false, false),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        const SizedBox(height: 24),
                        _buildTitle(false, false),
                        const SizedBox(height: 32),
                        _buildLoginButton(false, false),
                      ],
                    ),
                  ),
                ),
                _buildFooter(false, false),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHorizontalLayout(bool isTablet, bool isLandscape) {
    final imageFlex = isTablet ? 6 : 3;
    final contentFlex = isTablet ? 4 : 2;
    final maxWidth = ResponsiveHelper.adaptiveValue(
      context,
      mobile: 350,
      smallTablet: 380,
      mediumTablet: 400,
      largeTablet: 450,
      mobileLandscape: 320,
    );
    final padding = ResponsiveHelper.value(
      context,
      mobile: 24,
      tablet: 40,
      mobileLandscape: 20,
    );
    final overlayOffset = ResponsiveHelper.width(
      context,
      mobile: 50,
      tablet: 80,
    );
    
    return Stack(
      children: [
        Row(
          children: [
            // Left side - Image
            Expanded(
              flex: imageFlex,
              child: Container(
                decoration: const BoxDecoration(
                  image: DecorationImage(
                    image: AssetImage("assets/bgipb.jpg"),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [
                        Colors.black.withOpacity(0.4),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
            // Right side - Spacer
            Expanded(
              flex: contentFlex,
              child: const SizedBox(),
            ),
          ],
        ),
        // White content container overlaying
        Positioned(
          top: 0,
          bottom: 0,
          right: 0,
          left: MediaQuery.of(context).size.width * (imageFlex / (imageFlex + contentFlex)) - overlayOffset,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(ResponsiveHelper.width(context, mobile: 20, tablet: 24)),
                bottomLeft: Radius.circular(ResponsiveHelper.width(context, mobile: 20, tablet: 24)),
              ),
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxWidth),
                child: Padding(
                  padding: EdgeInsets.all(padding),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildTitle(isTablet, isLandscape),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 24, tablet: 40)),
                      _buildLoginButton(isTablet, isLandscape),
                      SizedBox(height: ResponsiveHelper.spacing(context, mobile: 32, tablet: 60)),
                      _buildFooter(isTablet, isLandscape),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(bool isTablet, bool isLandscape) {
    final height = ResponsiveHelper.height(
      context,
      mobile: 300,
      tablet: 350,
      mobileLandscape: 120,
    );
    
    return Container(
      height: height,
      width: double.infinity,
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage("assets/bgipb.jpg"),
          fit: BoxFit.cover,
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withOpacity(0.3),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTitle(bool isTablet, bool isLandscape) {
    final fontSize = ResponsiveHelper.font(
      context,
      mobile: 26,
      tablet: 32,
      mobileLandscape: 24,
    );
    
    return Text(
      'Selamat Datang di\nE-Logbook',
      textAlign: TextAlign.center,
      style: TextStyle(
        fontSize: fontSize,
        height: 1.2,
        fontWeight: FontWeight.bold,
        color: const Color(0xFF1B4F9C),
      ),
    );
  }

  Widget _buildLoginButton(bool isTablet, bool isLandscape) {
    final height = ResponsiveHelper.height(
      context,
      mobile: 52,
      tablet: 56,
      mobileLandscape: 48,
    );
    final fontSize = ResponsiveHelper.font(
      context,
      mobile: 18,
      tablet: 20,
      mobileLandscape: 16,
    );
    final borderRadius = ResponsiveHelper.width(
      context,
      mobile: 14,
      tablet: 16,
    );
    final buttonWidth = ResponsiveHelper.buttonWidth(context);
    
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
              transitionDuration: Duration.zero,
              reverseTransitionDuration: Duration.zero,
            ),
          );
        },
        child: Container(
          width: buttonWidth,
          height: height,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          child: Center(
            child: Text(
              'Masuk',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(bool isTablet, bool isLandscape) {
    final bottomPadding = ResponsiveHelper.height(
      context,
      mobile: 16,
      tablet: 0,
      mobileLandscape: 8,
    );
    
    return Padding(
      padding: EdgeInsets.only(bottom: bottomPadding),
      child: const AppInfo(version: "1.0", releaseYear: "2025"),
    );
  }
}