import 'dart:io';
import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;

class KTPScannerScreen extends StatefulWidget {
  const KTPScannerScreen({Key? key}) : super(key: key);

  @override
  State<KTPScannerScreen> createState() => _KTPScannerScreenState();
}

class _KTPScannerScreenState extends State<KTPScannerScreen>
    with SingleTickerProviderStateMixin {
  CameraController? _controller;
  bool _isInitialized = false;
  bool _isCapturing = false;
  bool _flashOn = false;
  bool _isScanning = false;
  
  late AnimationController _scanAnimationController;
  late Animation<double> _scanAnimation;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _setupAnimations();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  void _setupAnimations() {
    _scanAnimationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );

    _scanAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _scanAnimationController,
        curve: Curves.linear,
      ),
    );

    _scanAnimationController.repeat(reverse: true);
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (mounted) {
          _showError('Kamera tidak tersedia');
        }
        return;
      }

      _controller = CameraController(
        cameras.first,
        ResolutionPreset.veryHigh,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();
      await _controller!.setFlashMode(FlashMode.off);
      
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      if (mounted) {
        _showError('Error: $e');
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[700],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _toggleFlash() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    try {
      setState(() => _flashOn = !_flashOn);
      await _controller!.setFlashMode(_flashOn ? FlashMode.torch : FlashMode.off);
      
      HapticFeedback.lightImpact();
    } catch (e) {
      setState(() => _flashOn = !_flashOn);
      _showError('Gagal mengaktifkan flash');
    }
  }

  Future<void> _capturePhoto() async {
    if (_controller == null || !_controller!.value.isInitialized || _isCapturing) {
      return;
    }

    setState(() {
      _isCapturing = true;
      _isScanning = true;
    });

    HapticFeedback.mediumImpact();

    try {
      // Simulate scanning delay for better UX
      await Future.delayed(const Duration(milliseconds: 800));
      
      final image = await _controller!.takePicture();
      
      // Crop image to KTP frame area
      final croppedFile = await _cropImageToFrame(image.path);
      
      // Flash effect
      setState(() => _isScanning = false);
      await Future.delayed(const Duration(milliseconds: 100));
      
      if (mounted) {
        HapticFeedback.heavyImpact();
        Navigator.pop(context, croppedFile);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCapturing = false;
          _isScanning = false;
        });
        _showError('Gagal mengambil foto: $e');
      }
    }
  }

  Future<File> _cropImageToFrame(String imagePath) async {
    try {
      // Load image
      final bytes = await File(imagePath).readAsBytes();
      final originalImage = img.decodeImage(bytes);
      
      if (originalImage == null) {
        throw Exception('Failed to decode image');
      }

      // Get screen dimensions
      final screenWidth = MediaQuery.of(context).size.width;
      final screenHeight = MediaQuery.of(context).size.height;
      
      // Calculate frame dimensions (same as in UI)
      final frameWidth = screenWidth; // Full width
      final frameHeight = frameWidth / (85.6 / 53.98); // KTP aspect ratio
      
      // Calculate frame position (centered vertically)
      final frameTop = (screenHeight - frameHeight) / 2;
      
      // Calculate crop area in image coordinates
      final imageWidth = originalImage.width;
      final imageHeight = originalImage.height;
      
      // Map screen coordinates to image coordinates
      final scaleY = imageHeight / screenHeight;
      
      final cropX = 0; // Start from left edge
      final cropY = (frameTop * scaleY).round();
      final cropWidth = imageWidth; // Full width
      final cropHeight = (frameHeight * scaleY).round();
      
      // Ensure crop dimensions are within image bounds
      final safeCropY = cropY.clamp(0, imageHeight - 1);
      final safeCropHeight = cropHeight.clamp(1, imageHeight - safeCropY);
      
      // Crop image
      final croppedImage = img.copyCrop(
        originalImage,
        x: cropX,
        y: safeCropY,
        width: cropWidth,
        height: safeCropHeight,
      );
      
      // Save cropped image
      final croppedBytes = img.encodeJpg(croppedImage, quality: 95);
      final croppedFile = File(imagePath.replaceAll('.jpg', '_cropped.jpg'));
      await croppedFile.writeAsBytes(croppedBytes);
      
      // Delete original file
      await File(imagePath).delete();
      
      return croppedFile;
    } catch (e) {
      print('Error cropping image: $e');
      // Return original file if cropping fails
      return File(imagePath);
    }
  }

  @override
  void dispose() {
    _scanAnimationController.dispose();
    _controller?.dispose();
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: SystemUiOverlay.values,
    );
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera Preview - Full screen
          if (_isInitialized && _controller != null)
            Positioned.fill(
              child: FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _controller!.value.previewSize?.height ?? 1,
                  height: _controller!.value.previewSize?.width ?? 1,
                  child: CameraPreview(_controller!),
                ),
              ),
            )
          else
            const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 3,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Memuat kamera...',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),

          // Dimmed overlay with cutout
          if (_isInitialized)
            LayoutBuilder(
              builder: (context, constraints) {
                // Frame FULL WIDTH - tanpa margin
                final frameWidth = constraints.maxWidth; // Full width
                final frameHeight = frameWidth / (85.6 / 53.98); // KTP aspect ratio
                
                final frameRect = Rect.fromLTWH(
                  0, // Start dari 0 (kiri)
                  (constraints.maxHeight - frameHeight) / 2, // Center vertikal
                  frameWidth,
                  frameHeight,
                );

                return CustomPaint(
                  painter: OverlayPainter(frameRect: frameRect),
                  child: Container(),
                );
              },
            ),

          // KTP Frame with animated border
          Center(
            child: AspectRatio(
              aspectRatio: 85.6 / 53.98, // Aspect ratio KTP standar
              child: Container(
                margin: EdgeInsets.zero, // NO MARGIN - Full width
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Stack(
                      children: [
                        // Animated laser scanning line (vertical sweep)
                        if (!_isCapturing)
                          AnimatedBuilder(
                            animation: _scanAnimation,
                            builder: (context, child) {
                              return Positioned(
                                top: _scanAnimation.value * constraints.maxHeight,
                                left: 0,
                                right: 0,
                                child: Container(
                                  height: 3,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Colors.transparent,
                                        Colors.greenAccent.withOpacity(0.3),
                                        Colors.greenAccent.withOpacity(0.8),
                                        Colors.greenAccent,
                                        Colors.greenAccent.withOpacity(0.8),
                                        Colors.greenAccent.withOpacity(0.3),
                                        Colors.transparent,
                                      ],
                                      stops: const [0.0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0],
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.greenAccent.withOpacity(0.6),
                                        blurRadius: 15,
                                        spreadRadius: 3,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),

                        // Animated fast scanning line during capture
                        if (_isCapturing)
                          AnimatedBuilder(
                            animation: _scanAnimation,
                            builder: (context, child) {
                              return Positioned(
                                top: _scanAnimation.value * constraints.maxHeight,
                                left: 0,
                                right: 0,
                                child: Container(
                                  height: 2,
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      colors: [
                                        Colors.transparent,
                                        Colors.greenAccent.withOpacity(0.8),
                                        Colors.transparent,
                                      ],
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.greenAccent.withOpacity(0.5),
                                        blurRadius: 10,
                                        spreadRadius: 2,
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        
                        // Main frame
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: _isCapturing 
                                  ? Colors.greenAccent 
                                  : Colors.white,
                              width: 3,
                            ),
                            boxShadow: _isCapturing
                                ? [
                                    BoxShadow(
                                      color: Colors.greenAccent.withOpacity(0.5),
                                      blurRadius: 20,
                                      spreadRadius: 2,
                                    ),
                                  ]
                                : [],
                          ),
                          child: CustomPaint(
                            painter: CornerFramePainter(
                              isActive: _isCapturing,
                            ),
                          ),
                        ),
                        
                        // Custom corner decorations for KTP (enhanced)
                        Positioned.fill(
                          child: CustomPaint(
                            painter: KTPCornersPainter(
                              isActive: _isCapturing,
                            ),
                          ),
                        ),

                        // Photo corner indicator (kanan atas untuk posisi foto di KTP)
                        // Foto KTP biasanya di kanan atas dengan ukuran 3x4 cm
                        Positioned(
                          right: constraints.maxWidth * 0.05, // 5% dari kanan
                          top: constraints.maxHeight * 0.12, // 12% dari atas
                          child: CustomPaint(
                            // Ukuran foto 3x4 cm, scale ke layar (3:4 ratio)
                            size: Size(
                              constraints.maxWidth * 0.18, // ~18% dari lebar frame
                              constraints.maxWidth * 0.24, // 24% untuk ratio 3:4
                            ),
                            painter: PhotoCornerPainter(
                              isActive: _isCapturing,
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ),

          // White flash effect when capturing
          if (_isScanning)
            Container(
              color: Colors.white.withOpacity(0.8),
            ),

          // Top bar with close and flash buttons
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                top: MediaQuery.of(context).padding.top + 8,
                left: 16,
                right: 16,
                bottom: 16,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.7),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Close button
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      borderRadius: BorderRadius.circular(30),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.5),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: const Icon(
                          Icons.close,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ),
                  
                  // Flash button
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: _toggleFlash,
                      borderRadius: BorderRadius.circular(30),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _flashOn
                              ? Colors.yellow.withOpacity(0.3)
                              : Colors.black.withOpacity(0.5),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: _flashOn
                                ? Colors.yellow
                                : Colors.white.withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Icon(
                          _flashOn ? Icons.flash_on : Icons.flash_off,
                          color: _flashOn ? Colors.yellow : Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Title and instruction
          Positioned(
            top: MediaQuery.of(context).padding.top + 80,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    _isCapturing ? 'Memproses...' : 'Scan KTP',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 40),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Posisikan KTP di dalam frame',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Bottom tips and capture button
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: MediaQuery.of(context).padding.bottom + 24,
                top: 24,
              ),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withOpacity(0.8),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Tips
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        _buildTip(Icons.wb_sunny, 'Pastikan pencahayaan cukup'),
                        const SizedBox(height: 8),
                        _buildTip(Icons.center_focus_strong, 'KTP harus dalam fokus'),
                        const SizedBox(height: 8),
                        _buildTip(Icons.crop_free, 'Hindari pantulan cahaya'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Capture button
                  GestureDetector(
                    onTap: _isCapturing ? null : _capturePhoto,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _isCapturing ? Colors.greenAccent : Colors.white,
                          width: 4,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isCapturing ? Colors.greenAccent : Colors.white)
                                .withOpacity(0.3),
                            blurRadius: 20,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: _isCapturing
                          ? Padding(
                              padding: const EdgeInsets.all(20),
                              child: CircularProgressIndicator(
                                color: Colors.greenAccent,
                                strokeWidth: 3,
                              ),
                            )
                          : Container(
                              margin: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.white.withOpacity(0.5),
                                    blurRadius: 10,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                color: Colors.black,
                                size: 32,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _isCapturing ? 'Memproses...' : 'Tap untuk foto',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTip(IconData icon, String text) {
    return Row(
      children: [
        Icon(
          icon,
          color: Colors.white70,
          size: 18,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }
}

// Overlay painter for dimming outside frame
class OverlayPainter extends CustomPainter {
  final Rect frameRect;

  OverlayPainter({required this.frameRect});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.6)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));

    // Create cutout for KTP frame (exactly matching the frame size)
    final framePath = Path()
      ..addRect(frameRect);

    final overlayPath = Path.combine(
      PathOperation.difference,
      path,
      framePath,
    );

    canvas.drawPath(overlayPath, paint);
  }

  @override
  bool shouldRepaint(OverlayPainter oldDelegate) => 
      oldDelegate.frameRect != frameRect;
}

// Enhanced KTP corners painter
class KTPCornersPainter extends CustomPainter {
  final bool isActive;

  KTPCornersPainter({required this.isActive});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isActive ? Colors.greenAccent : Colors.white
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.square
      ..style = PaintingStyle.stroke;

    final cornerLength = 25.0;
    final inset = 1.5; // Half of border width to align inside

    // Top-left
    canvas.drawLine(
      Offset(inset, inset),
      Offset(cornerLength + inset, inset),
      paint,
    );
    canvas.drawLine(
      Offset(inset, inset),
      Offset(inset, cornerLength + inset),
      paint,
    );

    // Top-right
    canvas.drawLine(
      Offset(size.width - inset, inset),
      Offset(size.width - cornerLength - inset, inset),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - inset, inset),
      Offset(size.width - inset, cornerLength + inset),
      paint,
    );

    // Bottom-left
    canvas.drawLine(
      Offset(inset, size.height - inset),
      Offset(cornerLength + inset, size.height - inset),
      paint,
    );
    canvas.drawLine(
      Offset(inset, size.height - inset),
      Offset(inset, size.height - cornerLength - inset),
      paint,
    );

    // Bottom-right
    canvas.drawLine(
      Offset(size.width - inset, size.height - inset),
      Offset(size.width - cornerLength - inset, size.height - inset),
      paint,
    );
    canvas.drawLine(
      Offset(size.width - inset, size.height - inset),
      Offset(size.width - inset, size.height - cornerLength - inset),
      paint,
    );

    // Add glow effect for active state
    if (isActive) {
      final glowPaint = Paint()
        ..color = Colors.greenAccent.withOpacity(0.3)
        ..strokeWidth = 7
        ..strokeCap = StrokeCap.square
        ..style = PaintingStyle.stroke
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 5);

      // Redraw with glow
      canvas.drawLine(Offset(inset, inset), Offset(cornerLength + inset, inset), glowPaint);
      canvas.drawLine(Offset(inset, inset), Offset(inset, cornerLength + inset), glowPaint);
      canvas.drawLine(Offset(size.width - inset, inset), Offset(size.width - cornerLength - inset, inset), glowPaint);
      canvas.drawLine(Offset(size.width - inset, inset), Offset(size.width - inset, cornerLength + inset), glowPaint);
      canvas.drawLine(Offset(inset, size.height - inset), Offset(cornerLength + inset, size.height - inset), glowPaint);
      canvas.drawLine(Offset(inset, size.height - inset), Offset(inset, size.height - cornerLength - inset), glowPaint);
      canvas.drawLine(Offset(size.width - inset, size.height - inset), Offset(size.width - cornerLength - inset, size.height - inset), glowPaint);
      canvas.drawLine(Offset(size.width - inset, size.height - inset), Offset(size.width - inset, size.height - cornerLength - inset), glowPaint);
    }
  }

  @override
  bool shouldRepaint(KTPCornersPainter oldDelegate) =>
      oldDelegate.isActive != isActive;
}

// Photo corner indicator painter (untuk menunjukkan posisi foto di KTP)
// Foto KTP Indonesia standar di kanan atas, ukuran 3x4 cm
class PhotoCornerPainter extends CustomPainter {
  final bool isActive;

  PhotoCornerPainter({required this.isActive});

  @override
  void paint(Canvas canvas, Size size) {
    final rectPaint = Paint()
      ..color = (isActive ? Colors.greenAccent : Colors.white).withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final fillPaint = Paint()
      ..color = (isActive ? Colors.greenAccent : Colors.white).withOpacity(0.1)
      ..style = PaintingStyle.fill;

    // Draw photo rectangle dengan rounded corners
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(4),
    );

    canvas.drawRRect(rect, fillPaint);
    canvas.drawRRect(rect, rectPaint);

    // Draw corner brackets for photo area
    final cornerPaint = Paint()
      ..color = isActive ? Colors.greenAccent : Colors.white
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final cornerSize = size.width * 0.2; // 20% dari lebar foto

    // Top-left
    canvas.drawLine(const Offset(0, 0), Offset(cornerSize, 0), cornerPaint);
    canvas.drawLine(const Offset(0, 0), Offset(0, cornerSize), cornerPaint);

    // Top-right
    canvas.drawLine(Offset(size.width, 0), Offset(size.width - cornerSize, 0), cornerPaint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, cornerSize), cornerPaint);

    // Bottom-left
    canvas.drawLine(Offset(0, size.height), Offset(cornerSize, size.height), cornerPaint);
    canvas.drawLine(Offset(0, size.height), Offset(0, size.height - cornerSize), cornerPaint);

    // Bottom-right
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width - cornerSize, size.height), cornerPaint);
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width, size.height - cornerSize), cornerPaint);

    // Draw person icon (outline) - disesuaikan dengan ukuran foto 3x4
    final iconPaint = Paint()
      ..color = (isActive ? Colors.greenAccent : Colors.white).withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    // Head circle - di bagian atas (untuk foto formal)
    final headRadius = size.width * 0.18; // 18% dari lebar
    final headCenter = Offset(size.width / 2, size.height * 0.28);
    canvas.drawCircle(headCenter, headRadius, iconPaint);

    // Shoulders/body - trapezoid shape untuk foto formal
    final bodyPath = Path()
      ..moveTo(size.width / 2, size.height * 0.28 + headRadius) // Dari bawah kepala
      ..lineTo(size.width * 0.2, size.height * 0.8) // Kiri bawah
      ..lineTo(size.width * 0.8, size.height * 0.8) // Kanan bawah
      ..close();

    canvas.drawPath(bodyPath, iconPaint);
  }

  @override
  bool shouldRepaint(PhotoCornerPainter oldDelegate) =>
      oldDelegate.isActive != isActive;
}

// Corner frame painter
class CornerFramePainter extends CustomPainter {
  final bool isActive;

  CornerFramePainter({required this.isActive});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = (isActive ? Colors.greenAccent : Colors.white).withOpacity(0.2)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    // Draw grid lines (rule of thirds)
    final gridSpacing = size.width / 3;
    
    // Vertical lines
    canvas.drawLine(
      Offset(gridSpacing, 0),
      Offset(gridSpacing, size.height),
      paint,
    );
    canvas.drawLine(
      Offset(gridSpacing * 2, 0),
      Offset(gridSpacing * 2, size.height),
      paint,
    );

    // Horizontal lines
    final horizontalSpacing = size.height / 3;
    canvas.drawLine(
      Offset(0, horizontalSpacing),
      Offset(size.width, horizontalSpacing),
      paint,
    );
    canvas.drawLine(
      Offset(0, horizontalSpacing * 2),
      Offset(size.width, horizontalSpacing * 2),
      paint,
    );
  }

  @override
  bool shouldRepaint(CornerFramePainter oldDelegate) =>
      oldDelegate.isActive != isActive;
}