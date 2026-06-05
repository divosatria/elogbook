# 📡 GPS Device Integration Guide

## 🎯 Overview

Sistem E-Logbook Maritime sekarang mendukung integrasi GPS device dengan data kapal. Setiap kapal dapat memiliki GPS device yang terdaftar sebagai perangkat, dan data GPS akan disinkronkan antara device dan kapal.

## 🔗 Relasi Database

### Model Relationships
```javascript
// Kapal -> GPS Device (One-to-One)
Kapal.belongsTo(Perangkat, { foreignKey: 'gpsDeviceId', as: 'gpsDevice' });

// GPS Device -> Vessels using it
Perangkat.hasMany(Kapal, { foreignKey: 'gpsDeviceId', as: 'vesselsUsingAsGPS' });

// Kapal -> All Equipment (One-to-Many)
Kapal.hasMany(Perangkat, { foreignKey: 'kapalId', as: 'perangkats' });
```

### Database Schema
```sql
-- Kapal table
ALTER TABLE kapals 
ADD COLUMN gpsDeviceId INT NULL,
ADD CONSTRAINT fk_kapals_gps_device 
FOREIGN KEY (gpsDeviceId) REFERENCES perangkats(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Perangkat table (existing)
-- jenisPerangkat ENUM includes 'gps'
-- spesifikasi JSON field stores GPS capabilities and data
```

## 🛠️ Implementation

### 1. GPS Device Management

#### Create GPS Device
```javascript
const gpsDevice = await Perangkat.create({
  namaPerangkat: 'GPS Garmin GPSMAP 8212',
  jenisPerangkat: 'gps',
  merk: 'Garmin',
  model: 'GPSMAP 8212',
  nomorSeri: 'GPS001234',
  kondisi: 'baik',
  statusOperasional: 'aktif',
  spesifikasi: {
    gpsCapabilities: {
      realTimeTracking: true,
      accuracy: '3-5 meters',
      updateInterval: 30,
      batteryLife: '24 hours'
    },
    gpsData: {
      currentPosition: null,
      lastUpdate: null,
      locationHistory: [],
      batteryLevel: null,
      signalStrength: null
    }
  }
});
```

#### Assign GPS Device to Vessel
```javascript
// Update vessel with GPS device
await vessel.update({ 
  gpsDeviceId: gpsDevice.id 
});

// Update device assignment
await gpsDevice.update({ 
  kapalId: vessel.id 
});
```

### 2. GPS Data Flow

#### Data Structure
```javascript
// GPS Device spesifikasi.gpsData
{
  currentPosition: {
    latitude: -6.2000,
    longitude: 106.8166,
    speed: 12.5,
    heading: 180,
    altitude: 10,
    accuracy: 'high',
    satellites: 8,
    timestamp: '2024-01-15T10:30:00Z'
  },
  lastUpdate: '2024-01-15T10:30:00Z',
  locationHistory: [...], // Last 50 positions
  batteryLevel: 85,
  signalStrength: 'strong'
}

// Vessel gps field
{
  currentPosition: {...}, // Same as device
  lastUpdate: '2024-01-15T10:30:00Z',
  isActive: true,
  deviceId: 123,
  locations: [...] // Last 100 positions
}
```

### 3. API Endpoints

#### GPS Device Management
```javascript
// Get all GPS devices
GET /api/gps/devices

// Get vessel GPS from device
GET /api/gps/vessel/:id/device-data

// Update GPS data from device (for hardware)
POST /api/gps/device/:deviceId/update
```

#### Mobile API Integration
```javascript
// Update location with device sync
POST /api/mobile/location
{
  "lat": -6.2000,
  "lng": 106.8166,
  "kapalId": 1,
  "deviceId": 123 // Optional
}

// Get vessel with GPS device info
GET /api/mobile/vessels/:id
// Response includes gpsDevice and gpsDeviceStatus
```

### 4. Real-time Updates

#### Socket Events
```javascript
// Location update with device info
socket.emit('location_update', {
  vesselId: 1,
  lat: -6.2000,
  lng: 106.8166,
  updatedBy: userId,
  role: 'nahkoda',
  deviceId: 123
});

// Vessel tracking with device data
socket.emit('vessel-location-update', {
  vesselId: 1,
  deviceId: 123,
  location: {...},
  status: 'sailing'
});
```

## 📱 Mobile Integration

### Flutter Implementation

#### Get Vessel GPS Device Info
```dart
class VesselGPSService {
  Future<VesselGPSData> getVesselGPS(int vesselId) async {
    final response = await dio.get('/api/mobile/vessels/$vesselId');
    final vessel = VesselData.fromJson(response.data['data']);
    
    return VesselGPSData(
      vessel: vessel,
      gpsDevice: vessel.gpsDevice,
      deviceStatus: vessel.gpsDeviceStatus,
      currentPosition: vessel.gps?.currentPosition,
      isDeviceActive: vessel.gpsDeviceStatus?.isActive ?? false
    );
  }
}
```

#### Update Location with Device Sync
```dart
Future<void> updateLocationWithDevice({
  required int vesselId,
  required double lat,
  required double lng,
  int? deviceId,
}) async {
  await dio.post('/api/mobile/location', data: {
    'kapalId': vesselId,
    'lat': lat,
    'lng': lng,
    'deviceId': deviceId,
  });
}
```

### GPS Device Status Widget
```dart
class GPSDeviceStatusWidget extends StatelessWidget {
  final GPSDeviceStatus? deviceStatus;
  
  Widget build(BuildContext context) {
    if (deviceStatus == null) {
      return Text('No GPS Device');
    }
    
    return Row(
      children: [
        Icon(
          Icons.gps_fixed,
          color: deviceStatus.isActive ? Colors.green : Colors.red,
        ),
        Text('GPS: ${deviceStatus.condition}'),
        if (deviceStatus.lastUpdate != null)
          Text('Updated: ${formatTime(deviceStatus.lastUpdate)}'),
      ],
    );
  }
}
```

## 🔧 Configuration

### Environment Variables
```env
# GPS Device settings
GPS_UPDATE_INTERVAL=30
GPS_HISTORY_LIMIT=50
GPS_VESSEL_HISTORY_LIMIT=100
GPS_ACCURACY_THRESHOLD=10
```

### Device Configuration
```javascript
// GPS Device spesifikasi template
const gpsDeviceTemplate = {
  gpsCapabilities: {
    realTimeTracking: true,
    accuracy: '3-5 meters',
    updateInterval: 30, // seconds
    batteryLife: '24 hours',
    waterproof: true,
    operatingTemp: '-10°C to 70°C'
  },
  gpsData: {
    currentPosition: null,
    lastUpdate: null,
    locationHistory: [],
    batteryLevel: null,
    signalStrength: null,
    satellites: 0
  }
};
```

## 🧪 Testing

### Unit Tests
```javascript
describe('GPS Device Integration', () => {
  test('should assign GPS device to vessel', async () => {
    const vessel = await Kapal.create({...});
    const gpsDevice = await Perangkat.create({...});
    
    await vessel.update({ gpsDeviceId: gpsDevice.id });
    await gpsDevice.update({ kapalId: vessel.id });
    
    const updatedVessel = await Kapal.findByPk(vessel.id, {
      include: [{ model: Perangkat, as: 'gpsDevice' }]
    });
    
    expect(updatedVessel.gpsDevice.id).toBe(gpsDevice.id);
  });
});
```

### API Testing
```bash
# Test GPS device endpoints
curl -X GET "http://localhost:5000/api/gps/devices" \
  -H "Authorization: Bearer $TOKEN"

# Test vessel GPS data
curl -X GET "http://localhost:5000/api/gps/vessel/1/device-data" \
  -H "Authorization: Bearer $TOKEN"

# Test GPS update from device
curl -X POST "http://localhost:5000/api/gps/device/123/update" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -6.2000,
    "longitude": 106.8166,
    "speed": 12.5,
    "heading": 180,
    "satellites": 8
  }'
```

## 🚀 Deployment

### Migration Steps
```bash
# 1. Run GPS device relation migration
node migrate-gps-device-relation.js

# 2. Update existing GPS devices
UPDATE perangkats 
SET spesifikasi = JSON_SET(
  COALESCE(spesifikasi, '{}'),
  '$.gpsCapabilities', JSON_OBJECT(
    'realTimeTracking', true,
    'accuracy', '3-5 meters',
    'updateInterval', 30,
    'batteryLife', '24 hours'
  )
)
WHERE jenisPerangkat = 'gps';

# 3. Restart application
pm2 restart e-logbook-maritime
```

### Monitoring
```javascript
// GPS device health check
const healthCheck = async () => {
  const activeDevices = await Perangkat.count({
    where: {
      jenisPerangkat: 'gps',
      statusOperasional: 'aktif'
    }
  });
  
  const devicesWithRecentData = await Perangkat.count({
    where: {
      jenisPerangkat: 'gps',
      [Op.and]: [
        { 'spesifikasi.gpsData.lastUpdate': { [Op.not]: null } },
        { 'spesifikasi.gpsData.lastUpdate': { [Op.gte]: new Date(Date.now() - 3600000) } }
      ]
    }
  });
  
  return {
    totalGPSDevices: activeDevices,
    devicesWithRecentData,
    healthPercentage: (devicesWithRecentData / activeDevices) * 100
  };
};
```

## 📊 Benefits

1. **Centralized GPS Management**: All GPS devices managed in one system
2. **Real-time Sync**: GPS data synchronized between device and vessel
3. **Device Health Monitoring**: Track GPS device status and battery
4. **Historical Data**: Maintain location history from both device and vessel
5. **Mobile Integration**: Seamless GPS data access in mobile app
6. **Scalability**: Support multiple GPS devices per fleet

## 🔍 Troubleshooting

### Common Issues

1. **GPS Device Not Syncing**
   - Check device `statusOperasional` is 'aktif'
   - Verify `gpsDeviceId` in vessel table
   - Check device `spesifikasi.gpsData` structure

2. **Location Data Missing**
   - Verify GPS device has recent `lastUpdate`
   - Check vessel `gps.currentPosition` field
   - Ensure real-time updates are working

3. **Mobile App Not Showing Device Info**
   - Check vessel includes `gpsDevice` relation
   - Verify `gpsDeviceStatus` calculation
   - Test mobile API endpoints

---

**📞 Support**: Contact development team for GPS device integration issues.