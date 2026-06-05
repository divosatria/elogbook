import 'package:e_logbook/services/api/profile_service.dart';
import 'package:e_logbook/services/realtime/realtime_update_service.dart';
import 'package:e_logbook/utils/navigation_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../../provider/user_provider.dart';
import 'edit_name_screen.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      print('📸 [EditProfile] Starting image picker...');
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (image == null) {
        print('⚠️ [EditProfile] No image selected');
        return;
      }

      print('✅ [EditProfile] Image selected: ${image.path}');

      if (!mounted) return;
      setState(() => _isLoading = true);

      try {
        print('📤 [EditProfile] Calling updateProfile API...');
        final result = await ProfileService.updateProfile(photoPath: image.path);
        print('📥 [EditProfile] API Response: $result');
        
        if (result['success'] == true) {
          print('✅ [EditProfile] Upload success, photoUrl: ${result['photoUrl']}');
          
          // Wait for backend to commit changes
          await Future.delayed(const Duration(milliseconds: 500));
          
          // Force reload profile to get updated photo
          print('🔄 [EditProfile] Reloading profile...');
          await _loadProfile();
          print('✅ [EditProfile] Profile reloaded');
          
          // Trigger realtime update
          RealtimeUpdateService.notifyListeners('profile');
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Foto profil berhasil diperbarui'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          print('❌ [EditProfile] Upload failed: ${result['message']}');
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Gagal mengupload foto'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } catch (e) {
        print('❌ [EditProfile] Exception during upload: $e');
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal mengupload foto: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }

      setState(() => _isLoading = false);
    } catch (e) {
      print('❌ [EditProfile] Exception in _pickImage: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengambil gambar: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _loadProfile() async {
    try {
      print('🔄 Loading profile...');
      
      // Clear image cache
      imageCache.clear();
      imageCache.clearLiveImages();
      
      if (mounted) {
        await Provider.of<UserProvider>(context, listen: false)
            .syncProfileFromAPI();
        print('✅ Profile synced from API');
      }
    } catch (e) {
      print('❌ Error loading profile: $e');
    }
  }

  void _showImageSourcePicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (BuildContext context) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(20),
              topRight: Radius.circular(20),
            ),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Ubah Foto Profil',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              _buildOptionTile(
                icon: Icons.camera_alt,
                title: 'Ambil Foto',
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              const SizedBox(height: 12),
              _buildOptionTile(
                icon: Icons.photo_library,
                title: 'Pilih dari Galeri',
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFF1B4F9C).withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(icon, color: const Color(0xFF1B4F9C), size: 24),
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileItem({
    required String title,
    required String value,
    String? subtitle,
    bool showCopy = false,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
        child: Row(
          children: [
            // Title
            SizedBox(
              width: 120,
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Colors.black87,
                ),
              ),
            ),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.black87,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            subtitle,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                        if (showCopy)
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: subtitle));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Link disalin ke clipboard'),
                                  duration: Duration(seconds: 2),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              child: Icon(
                                Icons.copy,
                                size: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            // Arrow icon for editable items
            if (onTap != null)
              Icon(
                Icons.chevron_right,
                color: Colors.grey[400],
                size: 24,
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Scaffold(
          appBar: AppBar(
            elevation: 0,
            backgroundColor: Colors.transparent,
            flexibleSpace: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
            title: const Text(
              'Edit Profil',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
            centerTitle: true,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 20),
                Consumer<UserProvider>(
                  builder: (context, userProvider, child) {
                    final user = userProvider.user;
                    final photoUrl = user?.profilePicture;
                    
                    print('🖼️ UI Render - photoUrl: $photoUrl');
                    
                    final hasValidPhoto = photoUrl != null && 
                                          photoUrl.isNotEmpty && 
                                          (photoUrl.startsWith('http') || photoUrl.startsWith('file://'));
                    
                    print('🖼️ hasValidPhoto: $hasValidPhoto');

                    return GestureDetector(
                      onTap: _isLoading ? null : _showImageSourcePicker,
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 60,
                            backgroundColor: Colors.grey[200],
                            child: hasValidPhoto
                                ? ClipOval(
                                    child: Image(
                                      image: photoUrl.startsWith('file://')
                                          ? FileImage(File(photoUrl.replaceFirst('file://', '')))
                                          : NetworkImage(photoUrl) as ImageProvider,
                                      fit: BoxFit.cover,
                                      width: 120,
                                      height: 120,
                                      errorBuilder: (context, error, stackTrace) {
                                        return const Icon(Icons.person, size: 60, color: Colors.grey);
                                      },
                                    ),
                                  )
                                : const Icon(Icons.person, size: 60, color: Colors.grey),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: _isLoading ? Colors.grey : const Color(0xFF1B4F9C),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.camera_alt,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
                Consumer<UserProvider>(
                  builder: (context, userProvider, child) {
                    final user = userProvider.user;
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        children: [
                          _buildProfileItem(
                            title: 'Nama',
                            value: user?.name ?? 'Nama Pengguna',
                            onTap: () async {
                              await NavigationHelper.pushNoTransition(
                                context,
                                const EditNameScreen(),
                              );
                              _loadProfile();
                            },
                          ),
                          _buildProfileItem(
                            title: 'Nama Pengguna',
                            value: user?.username ?? 'username',
                            onTap: null,
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                            child: Row(
                              children: [
                                const SizedBox(width: 120),
                                Expanded(
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          'elogbook.com/@${user?.username ?? 'username'}',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ),
                                      InkWell(
                                        onTap: () {
                                          Clipboard.setData(ClipboardData(
                                            text: 'elogbook.com/@${user?.username ?? 'username'}',
                                          ));
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Link disalin ke clipboard'),
                                              duration: Duration(seconds: 2),
                                            ),
                                          );
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.all(4),
                                          child: Icon(
                                            Icons.copy,
                                            size: 16,
                                            color: Colors.grey[600],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ),
        if (_isLoading)
          Container(
            color: Colors.black54,
            child: const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
          ),
      ],
    );
  }
}
