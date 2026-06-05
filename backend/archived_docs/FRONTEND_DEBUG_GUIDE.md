# 🎨 Frontend Implementation - GPS Device Display

## 🔍 Problem Analysis
Backend sudah mengirim data GPS device dengan benar, tapi frontend belum menampilkan. 

## ✅ Backend Response (Sudah Benar)
```json
{
  "success": true,
  "data": {
    "id": 3,
    "namaKapal": "akbar",
    "gpsDeviceId": 21,
    "gpsDevice": {
      "id": 21,
      "namaPerangkat": "GPS Furuno GP-170",
      "merk": "Furuno",
      "model": "GP-170"
    }
  }
}
```

## 🔧 Frontend Implementation

### 1. Vessel Detail Component
```jsx
// VesselDetail.jsx
const VesselDetail = ({ vesselId }) => {
  const [vessel, setVessel] = useState(null);

  useEffect(() => {
    const fetchVessel = async () => {
      try {
        const response = await fetch(`/api/kapal/${vesselId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setVessel(result.data);
        }
      } catch (error) {
        console.error('Error fetching vessel:', error);
      }
    };

    fetchVessel();
  }, [vesselId]);

  if (!vessel) return <div>Loading...</div>;

  return (
    <div className="vessel-detail">
      <h2>{vessel.namaKapal}</h2>
      
      {/* GPS Device Section */}
      <div className="gps-section">
        <h3>GPS Device</h3>
        {vessel.gpsDevice ? (
          <div className="gps-info">
            <p><strong>Device:</strong> {vessel.gpsDevice.namaPerangkat}</p>
            <p><strong>Brand:</strong> {vessel.gpsDevice.merk}</p>
            <p><strong>Model:</strong> {vessel.gpsDevice.model}</p>
            <span className="status-badge">Active</span>
          </div>
        ) : (
          <p className="no-gps">No GPS device assigned</p>
        )}
      </div>
      
      {/* Other vessel info */}
    </div>
  );
};
```

### 2. Vessel Form Component
```jsx
// VesselForm.jsx
const VesselForm = ({ vesselId, onSave }) => {
  const [formData, setFormData] = useState({
    namaKapal: '',
    gpsDeviceId: '',
    // ... other fields
  });
  const [gpsDevices, setGpsDevices] = useState([]);

  // Load GPS devices for dropdown
  useEffect(() => {
    const loadGPSDevices = async () => {
      try {
        const response = await fetch('/api/kapal/gps-devices', {
          headers: { 'Authorization': `Bearer ${token}` }
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

  // Load vessel data if editing
  useEffect(() => {
    if (vesselId) {
      const loadVessel = async () => {
        try {
          const response = await fetch(`/api/kapal/${vesselId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          
          if (result.success) {
            setFormData({
              namaKapal: result.data.namaKapal,
              gpsDeviceId: result.data.gpsDeviceId || '',
              // ... other fields
            });
          }
        } catch (error) {
          console.error('Error loading vessel:', error);
        }
      };

      loadVessel();
    }
  }, [vesselId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = vesselId ? `/api/kapal/${vesselId}` : '/api/kapal';
      const method = vesselId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success || response.ok) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving vessel:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Vessel Name */}
      <div className="form-group">
        <label>Nama Kapal</label>
        <input
          type="text"
          value={formData.namaKapal}
          onChange={(e) => setFormData({...formData, namaKapal: e.target.value})}
          required
        />
      </div>

      {/* GPS Device Selection */}
      <div className="form-group">
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
              disabled={device.kapalId && device.kapalId !== parseInt(vesselId)}
            >
              {device.namaPerangkat} ({device.merk})
              {device.kapalId && device.kapalId !== parseInt(vesselId) && ' - Already Assigned'}
            </option>
          ))}
        </select>
      </div>

      <button type="submit">Save</button>
    </form>
  );
};
```

### 3. Vessel List Component
```jsx
// VesselList.jsx
const VesselList = () => {
  const [vessels, setVessels] = useState([]);

  useEffect(() => {
    const loadVessels = async () => {
      try {
        const response = await fetch('/api/kapal', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (Array.isArray(result)) {
          setVessels(result);
        } else if (result.success && Array.isArray(result.data)) {
          setVessels(result.data);
        }
      } catch (error) {
        console.error('Error loading vessels:', error);
      }
    };

    loadVessels();
  }, []);

  return (
    <div className="vessel-list">
      {vessels.map(vessel => (
        <div key={vessel.id} className="vessel-card">
          <h3>{vessel.namaKapal}</h3>
          
          {/* GPS Device Info */}
          <div className="gps-info">
            {vessel.gpsDevice ? (
              <span className="gps-badge">
                📡 {vessel.gpsDevice.namaPerangkat}
              </span>
            ) : (
              <span className="no-gps-badge">
                📡 No GPS
              </span>
            )}
          </div>
          
          <button onClick={() => viewDetail(vessel.id)}>
            View Detail
          </button>
        </div>
      ))}
    </div>
  );
};
```

## 🔍 Debugging Steps

### 1. Check API Response
```javascript
// In browser console
fetch('/api/kapal/3', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(data => {
  console.log('API Response:', data);
  console.log('GPS Device:', data.data?.gpsDevice);
});
```

### 2. Check Frontend State
```javascript
// In React component
console.log('Vessel data:', vessel);
console.log('GPS Device:', vessel?.gpsDevice);
```

### 3. Common Issues
- ❌ Missing Authorization header
- ❌ Not parsing `response.data.gpsDevice`
- ❌ Component not re-rendering after update
- ❌ Wrong API endpoint URL

## ✅ Expected Behavior
1. **Dropdown**: Shows available GPS devices
2. **Form**: Saves `gpsDeviceId` correctly
3. **Detail**: Displays GPS device info
4. **List**: Shows GPS status badge

Backend sudah perfect ✅ - masalah ada di frontend implementation!