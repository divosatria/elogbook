import 'package:flutter/material.dart';

/// Widget untuk menampilkan informasi kapal secara compact
class VesselInfoCard extends StatelessWidget {
  final String vesselName;
  final String vesselNumber;
  final String captainName;
  final int crewCount;
  final String selectedHarbor;
  final bool isViolating;

  const VesselInfoCard({
    super.key,
    required this.vesselName,
    required this.vesselNumber,
    required this.captainName,
    required this.crewCount,
    required this.selectedHarbor,
    this.isViolating = false,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    double fs(double size) => size * (width / 390);
    double sp(double size) => size * (width / 390);

    return Container(
      margin: EdgeInsets.all(sp(16)),
      padding: EdgeInsets.all(sp(16)),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(sp(16)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header dengan icon kapal
          Row(
            children: [
              Container(
                padding: EdgeInsets.all(sp(10)),
                decoration: BoxDecoration(
                  color: const Color(0xFF1B4F9C).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(sp(10)),
                ),
                child: Icon(
                  Icons.directions_boat,
                  color: const Color(0xFF1B4F9C),
                  size: fs(24),
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vesselName,
                      style: TextStyle(
                        fontSize: fs(16),
                        fontWeight: FontWeight.bold,
                        color: Colors.grey[900],
                      ),
                    ),
                    Text(
                      'No. $vesselNumber',
                      style: TextStyle(
                        fontSize: fs(12),
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              // Status badge
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: sp(10),
                  vertical: sp(6),
                ),
                decoration: BoxDecoration(
                  color: isViolating 
                    ? Colors.red.withOpacity(0.1)
                    : Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(sp(20)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isViolating ? Icons.warning_amber : Icons.check_circle,
                      color: isViolating ? Colors.red : Colors.green,
                      size: fs(14),
                    ),
                    SizedBox(width: sp(4)),
                    Text(
                      isViolating ? 'Peringatan' : 'Aman',
                      style: TextStyle(
                        fontSize: fs(11),
                        fontWeight: FontWeight.bold,
                        color: isViolating ? Colors.red : Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          SizedBox(height: sp(16)),
          
          // Divider
          Divider(height: sp(1), color: Colors.grey[300]),
          
          SizedBox(height: sp(12)),
          
          // Info grid
          Row(
            children: [
              Expanded(
                child: _buildInfoItem(
                  icon: Icons.person,
                  label: 'Nahkoda',
                  value: captainName,
                  sp: sp,
                  fs: fs,
                ),
              ),
              SizedBox(width: sp(12)),
              Expanded(
                child: _buildInfoItem(
                  icon: Icons.groups,
                  label: 'ABK',
                  value: '$crewCount Orang',
                  sp: sp,
                  fs: fs,
                ),
              ),
            ],
          ),
          
          SizedBox(height: sp(12)),
          
          // Pelabuhan info
          _buildInfoItem(
            icon: Icons.anchor,
            label: 'Pelabuhan Asal',
            value: selectedHarbor,
            sp: sp,
            fs: fs,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
    required double Function(double) sp,
    required double Function(double) fs,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: fs(16),
          color: Colors.grey[600],
        ),
        SizedBox(width: sp(8)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: fs(11),
                  color: Colors.grey[600],
                ),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: fs(13),
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[900],
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}