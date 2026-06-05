import 'dart:convert';
import 'package:e_logbook/screens/main_screen.dart';
import 'package:e_logbook/widgets/account_inactive_dialog.dart';
import 'package:e_logbook/services/api/auth_service.dart';
import 'package:e_logbook/services/local/user_activity_service.dart';
import 'package:e_logbook/services/fcm/fcm_service.dart';
import 'package:e_logbook/services/fcm/fcm_token_service.dart';
import 'package:e_logbook/models/user_model.dart';
import 'package:e_logbook/provider/user_provider.dart';
import 'package:e_logbook/utils/vessel_cache_helper.dart';
import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import 'package:lottie/lottie.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailPhoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _emailPhoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = ResponsiveHelper.isTablet(context);
    final isLandscape = ResponsiveHelper.isLandscape(context);
    
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: _buildResponsiveLayout(isTablet, isLandscape),
    );
  }

  Widget _buildResponsiveLayout(bool isTablet, bool isLandscape) {
    // Mobile Portrait - Full gradient background
    if (!isTablet && !isLandscape) {
      return _buildMobilePortrait();
    }
    
    // Mobile Landscape atau Tablet - Split layout
    return _buildSplitLayout(isTablet, isLandscape);
  }

  // ==========================================
  // MOBILE PORTRAIT LAYOUT
  // ==========================================
  Widget _buildMobilePortrait() {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: ResponsiveHelper.padding(context, mobile: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: _buildLoginCard(
                logoSize: ResponsiveHelper.loginLogoSize(context, mobile: 150),
                padding: ResponsiveHelper.value(context, mobile: 20),
                fontSize: ResponsiveHelper.font(context, mobile: 12),
                inputFontSize: ResponsiveHelper.font(context, mobile: 11),
                buttonHeight: ResponsiveHelper.height(context, mobile: 38),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // SPLIT LAYOUT (Landscape Mobile & Tablet)
  // ==========================================
  Widget _buildSplitLayout(bool isTablet, bool isLandscape) {
    final imageFlex = isTablet ? 6 : 3;
    final contentFlex = isTablet ? 4 : 2;
    
    return Stack(
      children: [
        Row(
          children: [
            // LEFT SIDE - Brand/Logo Section
            Expanded(
              flex: imageFlex,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Center(
                    child: SingleChildScrollView(
                      child: Padding(
                        padding: ResponsiveHelper.padding(context, mobile: 9, tablet: 12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                          // Logo IPB dengan background putih lebih kecil
                          Flexible(
                            child: Container(
                              constraints: BoxConstraints(
                                maxWidth: ResponsiveHelper.loginLogoSize(context, mobile: 70, tablet: 120),
                                maxHeight: ResponsiveHelper.loginLogoSize(context, mobile: 70, tablet: 120),
                              ),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: ResponsiveHelper.width(context, mobile: 3, tablet: 4),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.15),
                                    blurRadius: 15,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: ClipOval(
                                child: Lottie.asset(
                                  DateTime.now().hour >= 18 || DateTime.now().hour < 6
                                      ? 'assets/animations/tripmalam.json'
                                      : 'assets/animations/tripsiang.json',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                          
                          SizedBox(height: ResponsiveHelper.spacing(context, mobile: 12, tablet: 24)),
                          
                          // Title
                          Text(
                            'E-Logbook',
                            style: TextStyle(
                              fontSize: ResponsiveHelper.adaptiveValue(
                                context,
                                mobile: 18,
                                smallTablet: 24,
                                mediumTablet: 26,
                                largeTablet: 28,
                                mobileLandscape: 16,
                              ),
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: 1.0,
                            ),
                          ),
                          
                          SizedBox(height: ResponsiveHelper.spacing(context, mobile: 6, tablet: 8)),
                          
                          // Subtitle
                          Flexible(
                            child: Container(
                              constraints: BoxConstraints(
                                maxWidth: ResponsiveHelper.width(context, mobile: 200, tablet: 280),
                              ),
                              child: Text(
                                'Sistem Manajemen Logbook Digital untuk Pelayaran Modern',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: ResponsiveHelper.adaptiveValue(
                                  context,
                                  mobile: 10,
                                  smallTablet: 11,
                                  mediumTablet: 12,
                                  largeTablet: 13,
                                  mobileLandscape: 9,
                                ),
                                  color: Colors.white.withOpacity(0.9),
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ),
                          

                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // RIGHT SIDE - Spacer
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
          left: MediaQuery.of(context).size.width * (imageFlex / (imageFlex + contentFlex)) - ResponsiveHelper.width(context, mobile: 50, tablet: 80),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(ResponsiveHelper.width(context, mobile: 20, tablet: 24)),
                bottomLeft: Radius.circular(ResponsiveHelper.width(context, mobile: 20, tablet: 24)),
              ),
            ),
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: ResponsiveHelper.padding(context, mobile: 20, tablet: 40),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxWidth: ResponsiveHelper.adaptiveValue(
                        context,
                        mobile: 380,
                        smallTablet: 420,
                        mediumTablet: 460,
                        largeTablet: 480,
                        mobileLandscape: 350,
                      ),
                    ),
                    child: _buildLoginCard(
                      logoSize: ResponsiveHelper.loginLogoSize(context, mobile: 90, tablet: 150),
                      padding: ResponsiveHelper.value(context, mobile: 20, tablet: 32),
                      fontSize: ResponsiveHelper.font(context, mobile: 11, tablet: 13),
                      inputFontSize: ResponsiveHelper.font(context, mobile: 10, tablet: 12),
                      buttonHeight: ResponsiveHelper.height(context, mobile: 36, tablet: 42),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }


  // ==========================================
  // LOGIN CARD (Reusable)
  // ==========================================
  Widget _buildLoginCard({
    required double logoSize,
    required double padding,
    required double fontSize,
    required double inputFontSize,
    required double buttonHeight,
  }) {
    print('🎨 [LOGIN CARD] logoSize: $logoSize, padding: $padding');
    print('🎨 [LOGIN CARD] fontSize: $fontSize, inputFontSize: $inputFontSize');
    print('🎨 [LOGIN CARD] buttonHeight: $buttonHeight');
    
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(padding, 0, padding, padding),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            spreadRadius: 2,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
          // Logo IPB di dalam form (hanya untuk tablet)
          if (logoSize <= 90) ...[
            Center(
              child: Image.asset(
                "assets/OIPT.png",
                width: logoSize,
                height: logoSize,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  width: logoSize,
                  height: logoSize,
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.school,
                    size: logoSize * 0.5,
                    color: Colors.blue[800],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
          
          // Logo IPB di dalam form (untuk mobile portrait)
          if (logoSize > 90) ...[
            Center(
              child: Image.asset(
                "assets/OIPT.png",
                width: logoSize,
                height: logoSize,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  width: logoSize,
                  height: logoSize,
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.school,
                    size: logoSize * 0.5,
                    color: Colors.blue[800],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 15),
          ],
          
          // Welcome text dengan garis untuk semua ukuran
          Text(
            logoSize > 90 ? 'Selamat datang kembali di E-Logbook' : 'Hi Selamat Datang di E-Logbook',
            style: TextStyle(
              fontSize: fontSize,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 5),
          Container(
            height: 1,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 15),
          
          // Email Label
          Text(
            "Email",
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          
          const SizedBox(height: 10),
          
          // Email Input Field
          TextField(
            controller: _emailPhoneController,
            keyboardType: TextInputType.emailAddress,
            style: TextStyle(fontSize: inputFontSize),
            decoration: InputDecoration(
              hintText: "contoh@email.com",
              hintStyle: TextStyle(fontSize: inputFontSize),
              prefixIcon: const Icon(Icons.email_outlined, size: 18),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[400]!, width: 1.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[400]!, width: 1.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Password Label
          Text(
            "Password",
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: Colors.grey[800],
            ),
          ),
          
          const SizedBox(height: 10),
          
          // Password Field
          TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: TextStyle(fontSize: inputFontSize),
            decoration: InputDecoration(
              hintText: "Masukkan password",
              hintStyle: TextStyle(fontSize: inputFontSize),
              prefixIcon: const Icon(Icons.lock_outline, size: 18),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  size: 18,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[400]!, width: 1.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey[400]!, width: 1.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF1B4F9C), width: 2),
              ),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Remember & Forgot
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: Checkbox(
                      value: _rememberMe,
                      activeColor: const Color(0xFF1B4F9C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      onChanged: (val) => setState(() => _rememberMe = val ?? false),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text("Ingat saya", style: TextStyle(fontSize: fontSize - 1)),
                ],
              ),
              TextButton(
                onPressed: () {},
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  "Lupa password?",
                  style: TextStyle(
                    fontSize: fontSize - 1,
                    color: const Color(0xFF1B4F9C),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Login Button
          SizedBox(
            width: double.infinity,
            height: buttonHeight,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B4F9C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        strokeWidth: 2.5,
                      ),
                    )
                  : Text(
                      "Masuk",
                      style: TextStyle(
                        fontSize: fontSize + 2,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
            ),
          ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    
    try {
      final result = await AuthService.login(
        email: _emailPhoneController.text,
        password: _passwordController.text,
      );
      
      if (result['success'] == true && result['user'] != null) {
        final user = result['user'] as UserModel;
        
        final prefs = await SharedPreferences.getInstance();
        
        // 🧹 CLEAR VESSEL CACHE untuk fresh data dari server baru
        await VesselCacheHelper.clearVesselCache();
        
        await prefs.setString('user_data', jsonEncode({
          'id': user.id,
          'name': user.name,
          'email': user.email,
          'phone': user.phone,
          'role': user.role,
        }));
        
        // Save login activity
        await UserActivityService.saveLastLogin(user.email);
        await UserActivityService.saveActivity(
          userId: user.email,
          activityType: 'login',
          description: 'User berhasil login',
          data: {
            'role': user.role,
            'name': user.name,
          },
        );
        
        if (mounted) {
          final userProvider = Provider.of<UserProvider>(context, listen: false);
          await userProvider.setUser(user);
          
          // Send FCM token to backend
          try {
            String? fcmToken = await FCMService.getToken();
            if (fcmToken != null) {
              await FCMTokenService.sendTokenToBackend(fcmToken, user.id.toString());
            }
          } catch (e) {
            print('⚠️ Failed to send FCM token: $e');
          }
          
          Navigator.pushAndRemoveUntil(
            context,
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) => const MainScreen(),
              transitionDuration: Duration.zero,
              reverseTransitionDuration: Duration.zero,
            ),
            (route) => false,
          );
        }
      } else {
        if (mounted) {
          if (result['isAccountInactive'] == true) {
            AccountInactiveDialog.show(
              context,
              result['message'] ?? 'Akun tidak aktif',
              isFromLogin: true,
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Login gagal'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Terjadi kesalahan koneksi'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
    
    setState(() => _isLoading = false);
  }
}