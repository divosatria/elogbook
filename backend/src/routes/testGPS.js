const express = require('express');
const router = express.Router();
const { Kapal, Perangkat } = require('../models');

// Test endpoint untuk cek GPS device
router.get('/test-gps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get vessel with GPS device
    const vessel = await Kapal.findByPk(id);
    if (!vessel) {
      return res.status(404).json({ error: 'Vessel not found' });
    }
    
    const vesselData = vessel.toJSON();
    
    // Get GPS device if assigned
    if (vesselData.gpsDeviceId) {
      const gpsDevice = await Perangkat.findByPk(vesselData.gpsDeviceId);
      if (gpsDevice) {
        vesselData.gpsDevice = {
          id: gpsDevice.id,
          namaPerangkat: gpsDevice.namaPerangkat,
          merk: gpsDevice.merk,
          model: gpsDevice.model,
          statusOperasional: gpsDevice.statusOperasional
        };
      }
    } else {
      vesselData.gpsDevice = null;
    }
    
    res.json({
      success: true,
      data: vesselData
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;