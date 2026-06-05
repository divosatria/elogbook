import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:e_logbook/models/harbor_zone_model.dart';
import 'package:e_logbook/services/api/zone_service.dart';
import 'package:e_logbook/provider/tracking_minimize_provider.dart';

class ProductionTrackingMap extends StatefulWidget {
  final Position currentPosition;
  final double harborLat;
  final double harborLng;
  final String harborName;
  final double zoneRadius;
  final bool isViolating;
  final String? selectedCatchZoneName;
  final String zoneStatus; // 'inside', 'approaching', 'outside'
  final bool isMinimized;

  const ProductionTrackingMap({
    super.key,
    required this.currentPosition,
    required this.harborLat,
    required this.harborLng,
    required this.harborName,
    required this.zoneRadius,
    required this.isViolating,
    this.selectedCatchZoneName,
    this.zoneStatus = 'unknown',
    this.isMinimized = false,
  });

  @override
  State<ProductionTrackingMap> createState() => _ProductionTrackingMapState();
}

class _ProductionTrackingMapState extends State<ProductionTrackingMap> {
  final MapController _mapController = MapController();
  List<HarborZoneModel> _harborZones = [];
  List<Map<String, dynamic>> _harborPOIs = [];
  List<Map<String, dynamic>> _catchPolygons = [];
  bool _isLoading = true;
  bool _showZones = false;
  bool _showPOIs = true;
  bool _showCatchZones = true;

  @override
  void initState() {
    super.initState();
    _loadMapData();
  }

  Future<void> _loadMapData() async {
    try {
      final zones = await ZoneService.getAllHarborZones();
      final pois = await ZoneService.getAllHarborPOIs();
      final catchZones = await ZoneService.getAllCatchPolygons();

      if (mounted) {
        setState(() {
          _harborZones = zones;
          _harborPOIs = pois;
          _catchPolygons = catchZones
              .map((z) => {
                    'id': z.id,
                    'name': z.name,
                    'coordinates': z.coordinates
                        .map((c) => {
                              'lat': c.latitude,
                              'lng': c.longitude,
                            })
                        .toList(),
                    'color': z.color,
                    'isActive': z.isActive,
                  })
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      print('❌ Error loading map data: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final vesselPosition = LatLng(
      widget.currentPosition.latitude,
      widget.currentPosition.longitude,
    );
    final harborPosition = LatLng(widget.harborLat, widget.harborLng);

    // Hitung bearing ke tujuan
    double rotation = 0;
    if (widget.isMinimized ||
        context.watch<TrackingMinimizeProvider>().showCompass) {
      // Mode navigasi: rotate ke arah tujuan
      final lat1 = vesselPosition.latitude * pi / 180;
      final lat2 = harborPosition.latitude * pi / 180;
      final dLon =
          (harborPosition.longitude - vesselPosition.longitude) * pi / 180;
      final y = sin(dLon) * cos(lat2);
      final x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
      rotation = -(atan2(y, x) * 180 / pi);
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: vesselPosition,
            initialZoom: widget.isMinimized
                ? 16
                : (context.read<TrackingMinimizeProvider>().showCompass
                    ? 16
                    : 11),
            initialRotation: rotation,
            maxZoom: 20,
            minZoom: 8,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all,
            ),
          ),
          children: [
            // Base Map Layer - Satellite (Google Satellite)
            TileLayer(
              urlTemplate: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              userAgentPackageName: 'com.elogbook.app',
              maxZoom: 20,
              errorTileCallback: (tile, error, stackTrace) {
                // Silently handle tile loading errors
              },
            ),

            // Overlay labels
            TileLayer(
              urlTemplate: 'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
              userAgentPackageName: 'com.elogbook.app',
              maxZoom: 20,
              errorTileCallback: (tile, error, stackTrace) {
                // Silently handle tile loading errors
              },
            ),

            // Harbor Zones Layer
            if (_showZones && !widget.isMinimized) ..._buildHarborZoneLayers(),

            // Catch Polygons Layer (Zona Tangkap)
            if (_showCatchZones && !widget.isMinimized)
              _buildCatchPolygonsLayer(),

            // Current Harbor Zone
            _buildCurrentHarborZone(),

            // Vessel Trail
            _buildVesselTrail(vesselPosition),

            // POIs Layer
            if (_showPOIs && !widget.isMinimized) _buildPOIsLayer(),

            // Markers Layer
            _buildMarkersLayer(vesselPosition),
          ],
        ),

        // Loading Overlay
        if (_isLoading)
          Container(
            color: Colors.black26,
            child: const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
          ),

        // Map Controls
        _buildMapControls(),

        // Legend
        if (!widget.isMinimized) _buildLegend(),

        // Status Badge
        if (!widget.isMinimized) _buildStatusBadge(),
      ],
    );
  }

  Widget _buildCatchPolygonsLayer() {
    if (_catchPolygons.isEmpty) return const SizedBox.shrink();

    // Filter hanya zona tangkap yang dipilih admin
    final filteredZones = widget.selectedCatchZoneName != null
        ? _catchPolygons
            .where((zone) =>
                zone['name'].toString().toLowerCase() ==
                widget.selectedCatchZoneName!.toLowerCase())
            .toList()
        : _catchPolygons;

    if (filteredZones.isEmpty) return const SizedBox.shrink();

    return PolygonLayer(
      polygons: filteredZones.map((zone) {
        final coords = zone['coordinates'] as List;
        final points = coords.map((c) {
          double lat = (c['lat'] as num).toDouble();
          double lng = (c['lng'] as num).toDouble();

          // Validasi dan swap jika koordinat terbalik
          if (lat.abs() > 90) {
            print(
                '⚠️ [CatchPolygon] Swapping coordinates - lat=$lat, lng=$lng');
            final temp = lat;
            lat = lng;
            lng = temp;
            print('✅ [CatchPolygon] After swap - lat=$lat, lng=$lng');
          }

          return LatLng(lat, lng);
        }).toList();

        return Polygon(
          points: points,
          color: Colors.blue.shade100,
          borderColor: Colors.blue.shade600,
          borderStrokeWidth: 4,
        );
      }).toList(),
    );
  }

  List<Widget> _buildHarborZoneLayers() {
    List<Widget> layers = [];

    // Circle zones
    final circleZones = _harborZones.where((z) => z.isCircle).toList();
    if (circleZones.isNotEmpty) {
      layers.add(
        CircleLayer(
          circles: circleZones.map((zone) {
            final color = _getZoneColor(zone.type);
            return CircleMarker(
              point: zone.centerPoint!,
              radius: zone.radiusMeters ?? 1000,
              color: color.withAlpha(40),
              borderColor: color,
              borderStrokeWidth: 2.5,
            );
          }).toList(),
        ),
      );
    }

    // Polygon zones
    final polygonZones = _harborZones.where((z) => z.isPolygon).toList();
    if (polygonZones.isNotEmpty) {
      layers.add(
        PolygonLayer(
          polygons: polygonZones.map((zone) {
            final color = _getZoneColor(zone.type);

            // Validasi koordinat polygon
            final validatedPoints = zone.polygonCoordinates!.map((point) {
              double lat = point.latitude;
              double lng = point.longitude;

              // Validasi dan swap jika koordinat terbalik
              if (lat.abs() > 90) {
                print(
                    '⚠️ [HarborPolygon] Swapping coordinates - lat=$lat, lng=$lng');
                final temp = lat;
                lat = lng;
                lng = temp;
                print('✅ [HarborPolygon] After swap - lat=$lat, lng=$lng');
              }

              return LatLng(lat, lng);
            }).toList();

            return Polygon(
              points: validatedPoints,
              color: color.withAlpha(40),
              borderColor: color,
              borderStrokeWidth: 2.5,
            );
          }).toList(),
        ),
      );
    }

    return layers;
  }

  Widget _buildCurrentHarborZone() {
    final harborCenter = LatLng(widget.harborLat, widget.harborLng);

    return CircleLayer(
      circles: [
        CircleMarker(
          point: harborCenter,
          radius: widget.zoneRadius * 1000,
          color: widget.isViolating
              ? Colors.red.withAlpha(50)
              : Colors.green.withAlpha(50),
          borderColor:
              widget.isViolating ? Colors.red.shade600 : Colors.green.shade600,
          borderStrokeWidth: 3.5,
        ),
      ],
    );
  }

  Widget _buildVesselTrail(LatLng vesselPosition) {
    // Validasi dan swap koordinat harbor jika terbalik
    double harborLat = widget.harborLat;
    double harborLng = widget.harborLng;

    if (harborLat.abs() > 90) {
      print(
          '⚠️ [VesselTrail] Swapping harbor - lat=$harborLat, lng=$harborLng');
      final temp = harborLat;
      harborLat = harborLng;
      harborLng = temp;
      print('✅ [VesselTrail] After swap - lat=$harborLat, lng=$harborLng');
    }

    // Validasi final - pastikan koordinat valid
    if (harborLat.abs() > 90 || harborLng.abs() > 180) {
      print(
          '❌ [VesselTrail] Invalid harbor coordinates after swap: lat=$harborLat, lng=$harborLng');
      return PolylineLayer(polylines: const <Polyline>[]);
    }

    final harborCenter = LatLng(harborLat, harborLng);

    List<Polyline> polylines = [
      // Garis dari harbor ke kapal
      Polyline(
        points: [harborCenter, vesselPosition],
        strokeWidth: 3.5,
        color: widget.isViolating ? Colors.red.shade700 : Colors.blue.shade600,
        pattern: const StrokePattern.dotted(),
      ),
    ];

    // Tambahkan garis ke zona tangkap jika ada
    if (_showCatchZones &&
        widget.selectedCatchZoneName != null &&
        _catchPolygons.isNotEmpty) {
      final filteredZones = _catchPolygons
          .where((zone) =>
              zone['name'].toString().toLowerCase() ==
              widget.selectedCatchZoneName!.toLowerCase())
          .toList();

      if (filteredZones.isNotEmpty) {
        final zone = filteredZones.first;
        final coords = zone['coordinates'] as List;
        if (coords.isNotEmpty) {
          // Hitung center dari polygon zona tangkap dengan validasi
          double sumLat = 0;
          double sumLng = 0;
          int validCount = 0;

          for (var c in coords) {
            double lat = (c['lat'] as num).toDouble();
            double lng = (c['lng'] as num).toDouble();

            // Validasi dan swap jika koordinat terbalik
            if (lat.abs() > 90) {
              final temp = lat;
              lat = lng;
              lng = temp;
            }

            // Validasi final sebelum menambahkan
            if (lat.abs() <= 90 && lng.abs() <= 180) {
              sumLat += lat;
              sumLng += lng;
              validCount++;
            } else {
              print(
                  '⚠️ [VesselTrail] Skipping invalid coordinate: lat=$lat, lng=$lng');
            }
          }

          // Hanya tambahkan polyline jika ada koordinat valid
          if (validCount > 0) {
            final zoneCenter = LatLng(sumLat / validCount, sumLng / validCount);

            // Garis dari kapal ke zona tangkap
            polylines.add(
              Polyline(
                points: [vesselPosition, zoneCenter],
                strokeWidth: 2.5,
                color: Colors.green.shade700,
                pattern: StrokePattern.dashed(segments: const [10, 5]),
              ),
            );
          }
        }
      }
    }

    return PolylineLayer(polylines: polylines);
  }

  Widget _buildPOIsLayer() {
    return MarkerLayer(
      markers: _harborPOIs
          .map((poi) {
            final coords = poi['coordinates'];
            if (coords == null) return null;

            double lat = (coords['lat'] as num).toDouble();
            double lng = (coords['lng'] as num).toDouble();

            // Validasi dan swap jika koordinat terbalik
            if (lat.abs() > 90) {
              print('⚠️ [POI] Swapping coordinates - lat=$lat, lng=$lng');
              final temp = lat;
              lat = lng;
              lng = temp;
              print('✅ [POI] After swap - lat=$lat, lng=$lng');
            }

            return Marker(
              point: LatLng(lat, lng),
              width: 30,
              height: 30,
              child: GestureDetector(
                onTap: () => _showPOIInfo(poi),
                child: Container(
                  decoration: BoxDecoration(
                    color: _getPOIColor(poi['type']),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(77),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                  child: Icon(
                    _getPOIIcon(poi['type']),
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            );
          })
          .whereType<Marker>()
          .toList(),
    );
  }

  Widget _buildMarkersLayer(LatLng vesselPosition) {
    final harborCenter = LatLng(widget.harborLat, widget.harborLng);

    return MarkerLayer(
      markers: [
        // Harbor Marker
        Marker(
          point: harborCenter,
          width: widget.isMinimized ? 30 : 50,
          height: widget.isMinimized ? 30 : 50,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.blue,
              shape: BoxShape.circle,
              border: Border.all(
                  color: Colors.white, width: widget.isMinimized ? 2 : 3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(77),
                  blurRadius: widget.isMinimized ? 4 : 8,
                ),
              ],
            ),
            child: Icon(
              Icons.anchor,
              color: Colors.white,
              size: widget.isMinimized ? 14 : 24,
            ),
          ),
        ),

        // Vessel Marker
        Marker(
          point: vesselPosition,
          width: widget.isMinimized ? 24 : 60,
          height: widget.isMinimized ? 24 : 60,
          child: _buildVesselMarker(),
        ),
      ],
    );
  }

  Widget _buildVesselMarker() {
    final iconSize = widget.isMinimized ? 12.0 : 28.0;
    final containerSize = widget.isMinimized ? 24.0 : 60.0;
    final borderWidth = widget.isMinimized ? 1.5 : 3.0;

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.8, end: 1.0),
      duration: const Duration(milliseconds: 1000),
      curve: Curves.easeInOut,
      builder: (context, scale, child) {
        return Transform.scale(
          scale: scale,
          child: Container(
            width: containerSize,
            height: containerSize,
            decoration: BoxDecoration(
              color: widget.isViolating ? Colors.red : Colors.green,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: borderWidth),
              boxShadow: [
                BoxShadow(
                  color: (widget.isViolating ? Colors.red : Colors.green)
                      .withAlpha(128),
                  blurRadius: widget.isMinimized ? 4 : 12,
                  spreadRadius: widget.isMinimized ? 1 : 4,
                ),
              ],
            ),
            child: Icon(
              Icons.directions_boat,
              color: Colors.white,
              size: iconSize,
            ),
          ),
        );
      },
      onEnd: () {
        if (mounted) setState(() {});
      },
    );
  }

  Widget _buildMapControls() {
    // Sembunyikan kontrol saat minimized
    if (widget.isMinimized) return const SizedBox.shrink();

    final buttonSize = 48.0;
    final iconSize = 24.0;
    final spacing = 4.0;

    return Positioned(
      right: 16,
      top: 16,
      child: Column(
        children: [
          _buildControlButton(
            icon: Icons.add,
            onTap: () {
              _mapController.move(
                _mapController.camera.center,
                (_mapController.camera.zoom + 1).clamp(8, 18),
              );
            },
            tooltip: 'Zoom In',
            size: buttonSize,
            iconSize: iconSize,
          ),
          SizedBox(height: spacing),
          _buildControlButton(
            icon: Icons.remove,
            onTap: () {
              _mapController.move(
                _mapController.camera.center,
                (_mapController.camera.zoom - 1).clamp(8, 18),
              );
            },
            tooltip: 'Zoom Out',
            size: buttonSize,
            iconSize: iconSize,
          ),
          SizedBox(height: spacing * 2),
          _buildControlButton(
            icon: Icons.my_location,
            onTap: () {
              _mapController.move(
                LatLng(
                  widget.currentPosition.latitude,
                  widget.currentPosition.longitude,
                ),
                14,
              );
            },
            tooltip: 'Lokasi Saya',
            size: buttonSize,
            iconSize: iconSize,
          ),
          SizedBox(height: spacing * 2),
          _buildControlButton(
            icon: context.watch<TrackingMinimizeProvider>().showCompass
                ? Icons.navigation
                : Icons.explore,
            onTap: () {
              final provider = context.read<TrackingMinimizeProvider>();
              final newValue = !provider.showCompass;
              provider.toggleCompass(newValue);

              if (newValue) {
                // Hitung bearing ke tujuan
                final vesselPos = LatLng(
                  widget.currentPosition.latitude,
                  widget.currentPosition.longitude,
                );
                final harborPos = LatLng(widget.harborLat, widget.harborLng);

                final lat1 = vesselPos.latitude * pi / 180;
                final lat2 = harborPos.latitude * pi / 180;
                final dLon =
                    (harborPos.longitude - vesselPos.longitude) * pi / 180;
                final y = sin(dLon) * cos(lat2);
                final x =
                    cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
                final bearing = -(atan2(y, x) * 180 / pi);

                // Zoom dan rotate
                _mapController.moveAndRotate(vesselPos, 16, bearing);
              } else {
                // Kembali normal
                _mapController.rotate(0);
              }
            },
            tooltip: context.watch<TrackingMinimizeProvider>().showCompass
                ? 'Mode Normal'
                : 'Mode Navigasi',
            size: buttonSize,
            iconSize: iconSize,
            isActive: context.watch<TrackingMinimizeProvider>().showCompass,
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required String tooltip,
    bool isActive = true,
    double size = 48.0,
    double iconSize = 24.0,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(size / 4),
        elevation: 4,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(size / 4),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(size / 4),
              border: Border.all(
                color: isActive ? Colors.blue : Colors.grey.shade300,
                width: 2,
              ),
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.blue : Colors.grey,
              size: iconSize,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegend() {
    return Positioned(
      top: 16,
      left: 16,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(26),
              blurRadius: 8,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildLegendItem(
              Icons.anchor,
              widget.harborName,
              Colors.blue,
            ),
            const SizedBox(height: 8),
            _buildLegendItem(
              Icons.directions_boat,
              'Kapal Anda',
              widget.isViolating ? Colors.red : Colors.green,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: widget.isViolating ? Colors.red : Colors.green,
                      width: 2,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'Radius: ${widget.zoneRadius.toInt()} km',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(IconData icon, String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildStatusBadge() {
    Color badgeColor;
    IconData iconData;
    String statusText;

    switch (widget.zoneStatus) {
      case 'inside':
        badgeColor = Colors.green;
        iconData = Icons.check_circle;
        statusText = 'DALAM ZONA';
        break;
      case 'approaching':
        badgeColor = Colors.orange;
        iconData = Icons.navigation;
        statusText = 'MENUJU ZONA';
        break;
      case 'outside':
        badgeColor = Colors.red;
        iconData = Icons.warning;
        statusText = 'MELEWATI ZONA';
        break;
      default:
        badgeColor = Colors.grey;
        iconData = Icons.help_outline;
        statusText = 'MEMUAT...';
    }

    return Positioned(
      bottom: 16,
      left: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: badgeColor,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: badgeColor.withAlpha(102),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              iconData,
              color: Colors.white,
              size: 18,
            ),
            const SizedBox(width: 8),
            Text(
              statusText,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getZoneColor(String type) {
    switch (type.toLowerCase()) {
      case 'harbor':
        return Colors.green;
      case 'port':
        return Colors.blue;
      case 'restricted':
        return Colors.red;
      case 'conservation':
        return Colors.orange;
      case 'anchorage':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  Color _getPOIColor(String type) {
    switch (type.toLowerCase()) {
      case 'harbor_office':
        return Colors.blue;
      case 'fuel_station':
        return Colors.orange;
      case 'lighthouse':
        return Colors.yellow.shade700;
      case 'repair_dock':
        return Colors.brown;
      case 'warehouse':
        return Colors.grey;
      case 'shipping_office':
        return Colors.indigo;
      case 'pilot_station':
        return Colors.teal;
      case 'customs':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getPOIIcon(String type) {
    switch (type.toLowerCase()) {
      case 'harbor_office':
        return Icons.business;
      case 'fuel_station':
        return Icons.local_gas_station;
      case 'lighthouse':
        return Icons.lightbulb;
      case 'repair_dock':
        return Icons.build;
      case 'warehouse':
        return Icons.warehouse;
      case 'shipping_office':
        return Icons.sailing;
      case 'pilot_station':
        return Icons.radio_button_checked;
      case 'customs':
        return Icons.gavel;
      default:
        return Icons.place;
    }
  }

  void _showPOIInfo(Map<String, dynamic> poi) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(_getPOIIcon(poi['type']), color: _getPOIColor(poi['type'])),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                poi['name'] ?? 'POI',
                style: const TextStyle(fontSize: 16),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (poi['description'] != null && poi['description'].isNotEmpty)
              Text(poi['description']),
            if (poi['operating_hours'] != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16),
                  const SizedBox(width: 4),
                  Text(poi['operating_hours']),
                ],
              ),
            ],
            if (poi['contact']?['phone'] != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.phone, size: 16),
                  const SizedBox(width: 4),
                  Text(poi['contact']['phone']),
                ],
              ),
            ],
            if (poi['services'] != null && poi['services'].isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Layanan:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              ...List<String>.from(poi['services']).map((s) => Text('• $s')),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }
}
