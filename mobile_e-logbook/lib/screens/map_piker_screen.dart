import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class MapPickerScreen extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;

  const MapPickerScreen({
    super.key,
    this.initialLat,
    this.initialLng,
  });

  @override
  State<MapPickerScreen> createState() => _MapPickerScreenState();
}

class _MapPickerScreenState extends State<MapPickerScreen> {
  GoogleMapController? _mapController;
  LatLng _selectedLocation = const LatLng(-6.2088, 106.8456); // Jakarta default
  String _selectedAddress = 'Memuat alamat...';
  bool _isLoading = false;
  Set<Marker> _markers = {};

  // RESPONSIVE FUNCTION
  late double width;
  double fs(double size) => size * (width / 390);
  double sp(double size) => size * (width / 390);

  @override
  void initState() {
    super.initState();
    if (widget.initialLat != null && widget.initialLng != null) {
      _selectedLocation = LatLng(widget.initialLat!, widget.initialLng!);
    } else {
      _getCurrentLocation();
    }
    _updateMarker(_selectedLocation);
    _getAddressFromLatLng(_selectedLocation);
  }

  // ========================
  // GET CURRENT LOCATION
  // ========================
  Future<void> _getCurrentLocation() async {
    setState(() => _isLoading = true);

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw Exception('Layanan lokasi tidak aktif');

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Izin lokasi ditolak');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Izin lokasi ditolak permanen');
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _selectedLocation = LatLng(position.latitude, position.longitude);
        _isLoading = false;
      });

      _updateMarker(_selectedLocation);
      _getAddressFromLatLng(_selectedLocation);

      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(_selectedLocation, 15),
      );
    } catch (e) {
      setState(() => _isLoading = false);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mendapatkan lokasi: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // ========================
  // GET ADDRESS BY LAT LNG
  // ========================
  Future<void> _getAddressFromLatLng(LatLng location) async {
    try {
      List<Placemark> placemarks =
          await placemarkFromCoordinates(location.latitude, location.longitude);

      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        setState(() {
          _selectedAddress =
              "${p.subLocality ?? p.locality ?? 'Tidak diketahui'}, ${p.administrativeArea ?? ''}";
        });
      }
    } catch (e) {
      setState(() => _selectedAddress = 'Gagal mendapatkan alamat');
    }
  }

  // ========================
  // UPDATE MARKER
  // ========================
  void _updateMarker(LatLng location) {
    setState(() {
      _markers = {
        Marker(
          markerId: const MarkerId('selected'),
          position: location,
          draggable: true,
          onDragEnd: (newPos) {
            _selectedLocation = newPos;
            _getAddressFromLatLng(newPos);
          },
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        ),
      };
    });
  }

  // Tap map
  void _onMapTapped(LatLng pos) {
    setState(() => _selectedLocation = pos);
    _updateMarker(pos);
    _getAddressFromLatLng(pos);
  }

  // RETURN RESULT
  void _confirmLocation() {
    Navigator.pop(context, {
      'latitude': _selectedLocation.latitude,
      'longitude': _selectedLocation.longitude,
      'address': _selectedAddress,
    });
  }

  @override
  Widget build(BuildContext context) {
    width = MediaQuery.of(context).size.width;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Pilih Lokasi Tangkapan',
          style: TextStyle(
            fontSize: fs(16),
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white, size: fs(20)),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1B4F9C), Color(0xFF2563EB)],
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.my_location, size: fs(22), color: Colors.white),
            onPressed: _getCurrentLocation,
          )
        ],
      ),

      // ========================
      // BODY
      // ========================
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition:
                CameraPosition(target: _selectedLocation, zoom: 15),
            onMapCreated: (c) => _mapController = c,
            markers: _markers,
            onTap: _onMapTapped,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
          ),

          // LOADING OVERLAY
          if (_isLoading)
            Container(
              color: Colors.black26,
              child: const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            ),

          // ADDRESS CARD
          Positioned(
            top: sp(16),
            left: sp(16),
            right: sp(16),
            child: Card(
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(sp(12)),
              ),
              child: Padding(
                padding: EdgeInsets.all(sp(14)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.location_on,
                            size: fs(20), color: const Color(0xFF1B4F9C)),
                        SizedBox(width: sp(8)),
                        Text(
                          "Lokasi Dipilih",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: fs(14),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: sp(8)),
                    Text(
                      _selectedAddress,
                      style: TextStyle(fontSize: fs(13)),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: sp(4)),
                    Text(
                      "Lat: ${_selectedLocation.latitude.toStringAsFixed(6)}, "
                      "Lng: ${_selectedLocation.longitude.toStringAsFixed(6)}",
                      style: TextStyle(fontSize: fs(11), color: Colors.grey[700]),
                    )
                  ],
                ),
              ),
            ),
          ),

          // INFO BOX
          Positioned(
            bottom: sp(90),
            left: sp(16),
            right: sp(16),
            child: Container(
              padding: EdgeInsets.all(sp(10)),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(sp(8)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black12,
                    blurRadius: sp(4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline,
                      color: Colors.blue[700], size: fs(18)),
                  SizedBox(width: sp(8)),
                  Expanded(
                    child: Text(
                      'Tap pada map atau drag marker untuk memilih lokasi',
                      style: TextStyle(fontSize: fs(12)),
                    ),
                  )
                ],
              ),
            ),
          ),

          // CONFIRM BUTTON
          Positioned(
            bottom: sp(16),
            left: sp(16),
            right: sp(16),
            child: ElevatedButton(
              onPressed: _confirmLocation,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B4F9C),
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: sp(14)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(sp(12)),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, size: fs(20)),
                  SizedBox(width: sp(8)),
                  Text(
                    'Konfirmasi Lokasi',
                    style: TextStyle(
                      fontSize: fs(14),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
