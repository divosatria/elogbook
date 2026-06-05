import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../routes/crew_routes.dart';

class ImagePickerWidget extends StatelessWidget {
  final List<XFile> images;
  final Function(ImageSource) onPickImage;
  final Function(int) onRemoveImage;

  const ImagePickerWidget({
    super.key,
    required this.images,
    required this.onPickImage,
    required this.onRemoveImage,
  });

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final width = size.width;
    final isTablet = width >= 600;
    
    // Responsive scaling
    double fs(double size) {
      if (isTablet) {
        return (size * (width / 768)).clamp(size * 0.9, size * 1.3);
      }
      return size * (width / 390);
    }
    
    double sp(double size) {
      if (isTablet) {
        return (size * (width / 768)).clamp(size, size * 1.5);
      }
      return size * (width / 390);
    }
    
    // Image preview height - lebih kecil untuk tablet
    final imagePreviewHeight = isTablet ? sp(100) : sp(140);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Rules Info Card - Clickable
        GestureDetector(
          onTap: () => CrewRoutes.navigateToFishPhotoTips(context),
          child: Container(
            padding: EdgeInsets.all(sp(12)),
            margin: EdgeInsets.only(bottom: sp(12)),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(sp(10)),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: Colors.blue.shade700,
                  size: fs(18),
                ),
                SizedBox(width: sp(10)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tips Foto Ikan Agar Hasil Deteksi Optimal',
                        style: TextStyle(
                          fontSize: fs(12),
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade800,
                        ),
                      ),
                      SizedBox(height: sp(4)),
                      Text(
                        'Tap untuk melihat panduan lengkap',
                        style: TextStyle(
                          fontSize: fs(10),
                          color: Colors.blue.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_ios,
                  color: Colors.blue.shade600,
                  size: fs(14),
                ),
              ],
            ),
          ),
        ),

        // Tombol Upload - Hanya tampil jika belum ada foto
        if (images.isEmpty)
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => onPickImage(ImageSource.camera),
                  icon: Icon(Icons.camera_alt, size: fs(16)),
                  label: Text(
                    'Kamera',
                    style: TextStyle(
                      fontSize: fs(13),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: sp(14)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(sp(12)),
                    ),
                    elevation: 2,
                  ),
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => onPickImage(ImageSource.gallery),
                  icon: Icon(Icons.photo_library, size: fs(16)),
                  label: Text(
                    'Galeri',
                    style: TextStyle(
                      fontSize: fs(13),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF2563EB),
                    padding: EdgeInsets.symmetric(vertical: sp(14)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(sp(12)),
                      side: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
                    ),
                    elevation: 0,
                  ),
                ),
              ),
            ],
          ),
        
        SizedBox(height: sp(16)),

        // Preview Gambar - Maksimal 1 foto
        if (images.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Foto Tangkapan',
                style: TextStyle(
                  fontSize: fs(13),
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade800,
                ),
              ),
              GestureDetector(
                onTap: () => _showDeleteConfirmation(context),
                child: Container(
                  padding: EdgeInsets.all(sp(6)),
                  decoration: BoxDecoration(
                    color: Colors.red.shade500,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.delete_outline,
                    color: Colors.white,
                    size: fs(16),
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: sp(12)),
          _buildSingleImagePreview(
            context,
            images[0],
            sp,
            fs,
            imagePreviewHeight,
          ),
        ] else
          _buildEmptyState(sp, fs, imagePreviewHeight),
      ],
    );
  }

  Widget _buildSingleImagePreview(
    BuildContext context,
    XFile image,
    double Function(double) sp,
    double Function(double) fs,
    double height,
  ) {
    return Container(
      width: double.infinity,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(sp(16)),
        gradient: LinearGradient(
          colors: [Colors.blue.shade50, Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border.all(
          color: Colors.blue.shade200,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.15),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Image Preview
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(sp(14)),
              child: Image.file(
                File(image.path),
                fit: BoxFit.cover,
              ),
            ),
          ),

          // Gradient Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(sp(14)),
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.3),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),

          // Quality Badge
          Positioned(
            top: sp(12),
            left: sp(12),
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: sp(8),
                vertical: sp(4),
              ),
              decoration: BoxDecoration(
                color: Colors.green.shade600,
                borderRadius: BorderRadius.circular(sp(12)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    blurRadius: 4,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.hd,
                    size: fs(14),
                    color: Colors.white,
                  ),
                  SizedBox(width: sp(4)),
                  Text(
                    'HD Quality',
                    style: TextStyle(
                      fontSize: fs(11),
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Tap to View Full
          Positioned.fill(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(sp(14)),
                onTap: () => _showFullImage(context, image),
                child: Container(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(
    double Function(double) sp,
    double Function(double) fs,
    double height,
  ) {
    return Container(
      height: height,
      width: double.infinity,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(sp(12)),
        border: Border.all(
          color: Colors.grey.shade300,
          width: 2,
          style: BorderStyle.solid,
        ),
        color: Colors.grey.shade50,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.add_photo_alternate_outlined,
            size: fs(40),
            color: Colors.grey.shade400,
          ),
          SizedBox(height: sp(8)),
          Text(
            'Belum ada foto',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: fs(13),
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(height: sp(4)),
          Text(
            'Ambil foto berkualitas tinggi',
            style: TextStyle(
              color: Colors.grey.shade500,
              fontSize: fs(11),
            ),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Hapus Foto'),
        content: Text('Apakah Anda yakin ingin menghapus foto ini?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Batal'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              onRemoveImage(0);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: Text('Hapus'),
          ),
        ],
      ),
    );
  }

  void _showFullImage(BuildContext context, XFile image) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          children: [
            // Full Image
            Center(
              child: InteractiveViewer(
                minScale: 0.5,
                maxScale: 4.0,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.file(
                    File(image.path),
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            
            // Close Button
            Positioned(
              top: 20,
              right: 20,
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
            
            // Quality Info
            Positioned(
              bottom: 20,
              left: 20,
              right: 20,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.hd,
                      color: Colors.white,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Foto HD - Siap untuk AI Detection',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    Icon(
                      Icons.zoom_in,
                      color: Colors.white.withOpacity(0.7),
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}