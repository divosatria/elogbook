import 'package:e_logbook/utils/responsive_helper.dart';
import 'package:flutter/material.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
          'Bantuan & FAQ',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.white,
          ),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: ResponsiveHelper.padding(
          context,
          mobile: 20,
          tablet: 32,
        ),
        child: Column(
          children: [
            _buildFaqItem(
              context,
              'Bagaimana cara mengubah profil?',
              'Anda dapat mengubah data profil dengan menghubungi admin. Saat ini fitur ubah profil mandiri belum tersedia demi keamanan data.',
            ),
            _buildFaqItem(
              context,
              'Bagaimana cara mengisi laporan tangkapan?',
              'Masuk ke menu Beranda, lalu tekan tombol "+" (tambah). Isi formulir yang tersedia mulai dari keberangkatan hingga detail tangkapan ikan.',
            ),
            _buildFaqItem(
              context,
              'Apa itu E-Logbook?',
              'E-Logbook adalah aplikasi pencatatan kegiatan penangkapan ikan secara digital yang memudahkan nelayan dalam melaporkan hasil tangkapan sesuai regulasi.',
            ),
            _buildFaqItem(
              context,
              'Saya lupa password, apa yang harus dilakukan?',
              'Silakan hubungi administrator sistem atau datang ke kantor dinas terkait untuk melakukan reset password akun Anda.',
            ),
            _buildFaqItem(
              context,
              'Mengapa lokasi saya tidak terdeteksi?',
              'Pastikan GPS pada perangkat Anda sudah aktif dan Anda telah memberikan izin akses lokasi pada aplikasi ini.',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaqItem(BuildContext context, String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          title: Text(
            question,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xFF1B4F9C),
            ),
          ),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(
              answer,
              style: TextStyle(color: Colors.grey[700], height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
