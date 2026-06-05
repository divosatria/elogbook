import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api/sos_service.dart';

class SosAlertDialog extends StatefulWidget {
  const SosAlertDialog({Key? key}) : super(key: key);

  @override
  State<SosAlertDialog> createState() => _SosAlertDialogState();
}

class _SosAlertDialogState extends State<SosAlertDialog> with WidgetsBindingObserver {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final _textFieldKey = GlobalKey();
  final _textFieldFocusNode = FocusNode();
  bool _isLoading = false;
  bool _keyboardVisible = false;

  @override
  void initState() {
    super.initState();
    _textFieldFocusNode.addListener(_onFocusChange);
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeMetrics() {
    super.didChangeMetrics();
    final isTablet = MediaQuery.of(context).size.shortestSide >= 540;
    final bottomInset = WidgetsBinding.instance.window.viewInsets.bottom;
    final newKeyboardVisible = bottomInset > 0;
    
    print('⌨️ Keyboard metrics changed: bottomInset=$bottomInset, visible=$newKeyboardVisible, isTablet=$isTablet');
    
    if (_keyboardVisible != newKeyboardVisible) {
      print('🔄 Keyboard state changed from $_keyboardVisible to $newKeyboardVisible');
      setState(() {
        _keyboardVisible = newKeyboardVisible;
      });
      print('✅ setState called, _keyboardVisible=$_keyboardVisible');
      
      // Hanya auto-scroll di tablet
      if (isTablet) {
        if (newKeyboardVisible) {
          // Keyboard baru muncul, scroll ke bawah setelah rebuild
          print('⬆️ Keyboard OPENED (TABLET), scheduling scroll down');
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted && _scrollController.hasClients) {
              final maxScroll = _scrollController.position.maxScrollExtent;
              print('📜 After rebuild - Max scroll: $maxScroll');
              if (maxScroll > 0) {
                _scrollController.animateTo(
                  maxScroll,
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                );
                print('✅ Scrolled to bottom');
              }
            }
          });
        } else if (!newKeyboardVisible) {
          // Keyboard baru saja ditutup
          print('⬇️ Keyboard CLOSED (TABLET) detected!');
          _scrollToTop();
        }
      } else {
        print('📱 Mobile device - skipping auto-scroll');
      }
    }
  }

  void _scrollToTop() {
    print('⬆️ Scrolling back to top...');
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted && _scrollController.hasClients) {
        print('📜 Current position before scroll: ${_scrollController.position.pixels}');
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        ).then((_) {
          print('✅ Scrolled to top: ${_scrollController.position.pixels}');
        });
      } else {
        print('❌ Cannot scroll to top: mounted=$mounted, hasClients=${_scrollController.hasClients}');
      }
    });
  }

  void _onFocusChange() {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 540;
    print('🔍 Focus changed: ${_textFieldFocusNode.hasFocus}, isTablet=$isTablet');
    
    // Hanya auto-scroll di tablet
    if (_textFieldFocusNode.hasFocus && isTablet) {
      print('⏳ Scheduling scroll down (TABLET)...');
      Future.delayed(const Duration(milliseconds: 400), () {
        if (mounted && _scrollController.hasClients) {
          final maxScroll = _scrollController.position.maxScrollExtent;
          print('📜 Max scroll extent: $maxScroll');
          print('📜 Current position: ${_scrollController.position.pixels}');
          
          _scrollController.animateTo(
            maxScroll,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
          print('✅ Scroll to $maxScroll executed');
        } else {
          print('❌ ScrollController not ready');
        }
      });
    } else if (!isTablet) {
      print('📱 Mobile device - skipping auto-scroll on focus');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _textFieldFocusNode.removeListener(_onFocusChange);
    _textFieldFocusNode.dispose();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendSosAlert() async {
    setState(() => _isLoading = true);

    try {
      // Get current location
      Position position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        );
      } catch (e) {
        throw Exception('Gagal mendapatkan lokasi GPS. Pastikan GPS aktif.');
      }

      // Prepare message
      final message = _messageController.text.trim().isEmpty
          ? 'DARURAT! Kapal memerlukan bantuan segera. Lokasi: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}'
          : _messageController.text.trim();

      print('🚨 Sending SOS:');
      print('   Location: ${position.latitude}, ${position.longitude}');
      print('   Message: $message');

      // Send SOS
      await SosService.sendSosAlert(note: message);

      if (mounted) {
        Navigator.pop(context, true); // Close dialog and return success
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(Icons.error, color: Colors.white),
                SizedBox(width: 12),
                Expanded(child: Text('Gagal mengirim SOS: $e')),
              ],
            ),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.shortestSide >= 540;
    final maxWidth = isTablet ? 450.0 : 400.0;
    final animationSize = isTablet ? 90.0 : 100.0;
    final titleSize = isTablet ? 20.0 : 24.0;
    final maxLength = isTablet ? 100 : 200;
    
    print('🏛️ Building dialog, _keyboardVisible=$_keyboardVisible');
    
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.transparent,
      child: SingleChildScrollView(
        controller: _scrollController,
        child: Container(
          constraints: BoxConstraints(maxWidth: maxWidth),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.red.withOpacity(0.3),
                blurRadius: 30,
                offset: Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
            // Header with Animation
            Stack(
              children: [
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.only(top: isTablet ? 20 : 24, bottom: isTablet ? 12 : 16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.red.shade700, Colors.red.shade900],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(24),
                      topRight: Radius.circular(24),
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: animationSize,
                        height: animationSize,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Lottie.asset(
                          'assets/animations/emergecy.json',
                          width: animationSize - 20,
                          height: animationSize - 20,
                          fit: BoxFit.contain,
                          repeat: true,
                        ),
                      ),
                      SizedBox(height: isTablet ? 12 : 16),
                      Text(
                        'SINYAL DARURAT',
                        style: TextStyle(
                          fontSize: titleSize,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 1.2,
                        ),
                      ),
                      SizedBox(height: isTablet ? 6 : 8),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: isTablet ? 12 : 16, vertical: isTablet ? 4 : 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'SOS ALERT',
                          style: TextStyle(
                            fontSize: isTablet ? 10 : 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    onPressed: _isLoading ? null : () => Navigator.pop(context),
                    icon: Icon(Icons.close, color: Colors.white, size: isTablet ? 20 : 24),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withOpacity(0.2),
                    ),
                  ),
                ),
              ],
            ),

            // Content
            Padding(
              padding: EdgeInsets.all(isTablet ? 20 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Message Input
                  Row(
                    children: [
                      Icon(Icons.message_rounded, color: Colors.red[700], size: isTablet ? 16 : 20),
                      SizedBox(width: 8),
                      Text(
                        'Pesan Darurat (Opsional)',
                        style: TextStyle(
                          fontSize: isTablet ? 12 : 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[800],
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  TextFormField(
                    key: _textFieldKey,
                    controller: _messageController,
                    focusNode: _textFieldFocusNode,
                    decoration: InputDecoration(
                      hintText: 'Contoh: Kapal bocor, butuh bantuan segera...',
                      hintStyle: TextStyle(color: Colors.grey[400], fontSize: isTablet ? 11 : 13),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey[300]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.red, width: 2),
                      ),
                      filled: true,
                      fillColor: Colors.grey[50],
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: isTablet ? 10 : 14),
                    ),
                    style: TextStyle(fontSize: isTablet ? 11 : 13),
                    maxLines: isTablet ? 2 : 3,
                    maxLength: maxLength,
                    enabled: !_isLoading,
                  ),
                  SizedBox(height: isTablet ? 8 : 12),

                  // Customer Service Info
                  Row(
                    children: [
                      Icon(Icons.support_agent, size: isTablet ? 14 : 16, color: Colors.blue[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Ada pertanyaan atau bug? Hubungi Customer Service kami',
                          style: TextStyle(
                            fontSize: isTablet ? 9 : 11,
                            color: Colors.blue[700],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: isTablet ? 16 : 24),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _sendSosAlert,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(vertical: isTablet ? 12 : 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                        shadowColor: Colors.red.withOpacity(0.4),
                      ),
                      child: _isLoading
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2.5,
                              ),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.warning_rounded, size: isTablet ? 16 : 20),
                                SizedBox(width: 8),
                                Text(
                                  'KIRIM SOS',
                                  style: TextStyle(
                                    fontSize: isTablet ? 13 : 16,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                  // Extra padding saat keyboard muncul (hanya di tablet)
                  if (_keyboardVisible && isTablet) SizedBox(height: 120),
                ],
              ),
            ),
          ],
        ),
      ),
      )
    );
  }
}

// Helper function untuk menampilkan dialog
Future<bool?> showSosAlertDialog(BuildContext context) async {
  return await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (context) => SosAlertDialog(),
  );
}