import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../provider/user_provider.dart';

class VesselInfoDisplay extends StatelessWidget {
  const VesselInfoDisplay({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<UserProvider>(
      builder: (context, userProvider, child) {
        final user = userProvider.user;
        
        if (user?.vesselName == null) {
          return Consumer<UserProvider>(
            builder: (context, userProvider, child) {
              final currentUser = userProvider.user;
              final isABK = currentUser?.isABK == true;
              
              return Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning, color: Colors.orange),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Informasi Kapal Belum Diatur',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.orange[800],
                            ),
                          ),
                          Text(
                            isABK 
                                ? 'Hubungi Nahkoda untuk mengatur informasi kapal'
                                : 'Silakan atur informasi kapal di profil terlebih dahulu',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.orange[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!isABK)
                      TextButton(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Informasi kapal diatur melalui web admin'),
                              backgroundColor: Colors.blue,
                            ),
                          );
                        },
                        child: Text('Info'),
                      ),
                  ],
                ),
              );
            },
          );
        }

        return Container(
          padding: EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.blue.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.blue.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.directions_boat, color: Colors.blue[700]),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Informasi Kapal',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.blue[800],
                      ),
                    ),
                  ),
                  Consumer<UserProvider>(
                    builder: (context, userProvider, child) {
                      final currentUser = userProvider.user;
                      if (currentUser?.isNahkoda == true) {
                        return IconButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Informasi kapal diatur melalui web admin'),
                                backgroundColor: Colors.blue,
                              ),
                            );
                          },
                          icon: Icon(Icons.info, color: Colors.blue[700]),
                          tooltip: 'Info Kapal',
                        );
                      }
                      return SizedBox.shrink();
                    },
                  ),
                ],
              ),
              SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoItem('Nama Kapal', user!.vesselName!),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: _buildInfoItem('Nomor Kapal', user.vesselNumber!),
                  ),
                ],
              ),
              SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoItem('Nahkoda', user.captainName!),
                  ),
                  SizedBox(width: 16),
                  Expanded(
                    child: _buildInfoItem('Jumlah ABK', '${user.crewCount} orang'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}