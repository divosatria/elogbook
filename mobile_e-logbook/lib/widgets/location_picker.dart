import 'package:flutter/material.dart';


class LocationPickerWidget extends StatelessWidget {
  final TextEditingController locationController;
  final double? latitude;
  final double? longitude;
  final bool isLoading;
  final Function() onGetCurrentLocation;
  final Function() onPickFromMap;
  final Function()? onOpenInMaps;

  const LocationPickerWidget({
    super.key,
    required this.locationController,
    required this.latitude,
    required this.longitude,
    required this.isLoading,
    required this.onGetCurrentLocation,
    required this.onPickFromMap,
    this.onOpenInMaps,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    double fs(double size) => size * (width / 390);
    double sp(double size) => size * (width / 390);

    return Column(
      children: [
        // Text Field Lokasi
        TextFormField(
          controller: locationController,
          decoration: InputDecoration(
            labelText: 'Lokasi Tangkapan',
            hintText: 'Pilih lokasi dari GPS atau Map',
            prefixIcon: Icon(
              Icons.location_on_rounded,
              color: const Color(0xFF1B4F9C),
              size: fs(18),
            ),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(color: Colors.grey[200]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(sp(12)),
              borderSide: BorderSide(
                color: const Color(0xFF1B4F9C),
                width: sp(2),
              ),
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: sp(12),
              vertical: sp(12),
            ),
          ),
          readOnly: true,
          style: TextStyle(fontSize: fs(14)),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Lokasi harus diisi';
            }
            return null;
          },
        ),

        SizedBox(height: sp(12)),

        // Tombol GPS dan Map
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: isLoading ? null : onGetCurrentLocation,
                icon: isLoading
                    ? SizedBox(
                        width: sp(16),
                        height: sp(16),
                        child: const CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(Icons.my_location, size: fs(18)),
                label: Text(
                  isLoading ? 'Mengambil...' : 'GPS Saya',
                  style: TextStyle(fontSize: fs(14)),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: sp(12)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(sp(10)),
                  ),
                ),
              ),
            ),
            SizedBox(width: sp(8)),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: onPickFromMap,
                icon: Icon(Icons.map, size: fs(18)),
                label: Text(
                  'Pilih di Map',
                  style: TextStyle(fontSize: fs(14)),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1B4F9C),
                  foregroundColor: Colors.white,
                  padding: EdgeInsets.symmetric(vertical: sp(12)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(sp(10)),
                  ),
                ),
              ),
            ),
          ],
        ),

        // Info Koordinat
        if (latitude != null && longitude != null) ...[
          SizedBox(height: sp(12)),
          Container(
            padding: EdgeInsets.all(sp(12)),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(sp(12)),
              border: Border.all(color: Colors.blue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue, size: fs(18)),
                SizedBox(width: sp(8)),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Koordinat:',
                        style: TextStyle(
                          fontSize: fs(12),
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                      Text(
                        'Lat: ${latitude!.toStringAsFixed(6)}, '
                        'Lng: ${longitude!.toStringAsFixed(6)}',
                        style: TextStyle(fontSize: fs(11)),
                      ),
                    ],
                  ),
                ),
                if (onOpenInMaps != null)
                  IconButton(
                    onPressed: onOpenInMaps,
                    icon: Icon(Icons.open_in_new, color: Colors.blue, size: fs(18)),
                    tooltip: 'Buka di Google Maps',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}