# 🚢 Frontend Integration - GPS Device Selection

## 📡 Available API Endpoints

### 1. Get GPS Devices for Dropdown
```javascript
GET /api/kapal/gps-devices
Authorization: Bearer {token}

// Response
{
  "success": true,
  "data": [
    {
      "id": 21,
      "namaPerangkat": "GPS Furuno GP-170",
      "merk": "Furuno", 
      "model": "GP-170",
      "kapalId": null  // null = available, number = assigned
    },
    {
      "id": 11,
      "namaPerangkat": "GPS Garmin GPSMAP 8612xsv",
      "merk": "Garmin",
      "model": "GPSMAP 8612xsv", 
      "kapalId": 2     // already assigned to vessel 2
    }
  ]
}
```

### 2. Create Vessel with GPS Device
```javascript
POST /api/kapal
Authorization: Bearer {token}
Content-Type: application/json

{
  "namaKapal": "KM Bahari Nusantara",
  "nomorRegistrasi": "REG-2024-001",
  "pemilik": "PT Bahari",
  "gpsDeviceId": 21,  // <- GPS device selection
  // ... other vessel fields
}
```

### 3. Update Vessel GPS Device
```javascript
PUT /api/kapal/{vesselId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "gpsDeviceId": 22,  // <- Change GPS device
  // ... other fields to update
}
```

## 🎨 Frontend Implementation

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const VesselForm = () => {
  const [gpsDevices, setGpsDevices] = useState([]);
  const [formData, setFormData] = useState({
    namaKapal: '',
    gpsDeviceId: '',
    // ... other fields
  });

  // Load GPS devices for dropdown
  useEffect(() => {
    const loadGPSDevices = async () => {
      try {
        const response = await fetch('/api/kapal/gps-devices', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (result.success) {
          setGpsDevices(result.data);
        }
      } catch (error) {
        console.error('Error loading GPS devices:', error);
      }
    };

    loadGPSDevices();
  }, []);

  return (
    <form>
      {/* Vessel Name */}
      <div>
        <label>Nama Kapal</label>
        <input 
          type="text"
          value={formData.namaKapal}
          onChange={(e) => setFormData({...formData, namaKapal: e.target.value})}
        />
      </div>

      {/* GPS Device Selection */}
      <div>
        <label>GPS Device</label>
        <select 
          value={formData.gpsDeviceId}
          onChange={(e) => setFormData({...formData, gpsDeviceId: e.target.value})}
        >
          <option value="">-- Pilih GPS Device --</option>
          {gpsDevices.map(device => (
            <option 
              key={device.id} 
              value={device.id}
              disabled={device.kapalId !== null} // Disable if already assigned
            >
              {device.namaPerangkat} ({device.merk})
              {device.kapalId && ' - Already Assigned'}
            </option>
          ))}
        </select>
      </div>

      {/* Other fields... */}
    </form>
  );
};
```

### Vue.js Example
```vue
<template>
  <form>
    <!-- Vessel Name -->
    <div>
      <label>Nama Kapal</label>
      <input v-model="form.namaKapal" type="text" />
    </div>

    <!-- GPS Device Selection -->
    <div>
      <label>GPS Device</label>
      <select v-model="form.gpsDeviceId">
        <option value="">-- Pilih GPS Device --</option>
        <option 
          v-for="device in gpsDevices" 
          :key="device.id"
          :value="device.id"
          :disabled="device.kapalId !== null"
        >
          {{ device.namaPerangkat }} ({{ device.merk }})
          <span v-if="device.kapalId"> - Already Assigned</span>
        </option>
      </select>
    </div>
  </form>
</template>

<script>
export default {
  data() {
    return {
      gpsDevices: [],
      form: {
        namaKapal: '',
        gpsDeviceId: '',
      }
    }
  },
  async mounted() {
    await this.loadGPSDevices();
  },
  methods: {
    async loadGPSDevices() {
      try {
        const response = await fetch('/api/kapal/gps-devices', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const result = await response.json();
        if (result.success) {
          this.gpsDevices = result.data;
        }
      } catch (error) {
        console.error('Error loading GPS devices:', error);
      }
    }
  }
}
</script>
```

## 📊 Current Database Status

### Available GPS Devices:
- 🟢 **GPS Furuno GP-170** (ID: 21) - Available
- 🟢 **GPS Garmin GPSMAP 8612xsv** (ID: 11) - Assigned to "KM Samudra Indah"
- 🟢 **GPS Raymarine Axiom 7** (ID: 22) - Available
- 🟡 **GPS Lowrance HDS-12** (ID: 23) - Maintenance (not shown in dropdown)

### Vessels:
- **KM Samudra Indah** (ID: 2) → GPS Garmin (ID: 11)
- **akbar** (ID: 3) → No GPS assigned
- **satriabajahitam** (ID: 5) → No GPS assigned

## 🔧 Backend Logic

The backend automatically:
1. **Filters active GPS devices** (`statusOperasional = 'aktif'`)
2. **Shows assignment status** (`kapalId` field)
3. **Updates both tables** when assigning GPS to vessel:
   - `kapals.gpsDeviceId = deviceId`
   - `perangkats.kapalId = vesselId`

## ✅ Ready to Use!

The GPS device selection is now ready for frontend integration. The dropdown will show available GPS devices and prevent selection of already assigned devices.