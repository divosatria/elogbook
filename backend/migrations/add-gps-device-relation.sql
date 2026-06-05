-- Add GPS device relation to kapals table
ALTER TABLE kapals 
ADD COLUMN gpsDeviceId INT NULL,
ADD CONSTRAINT fk_kapals_gps_device 
FOREIGN KEY (gpsDeviceId) REFERENCES perangkats(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_kapals_gps_device ON kapals(gpsDeviceId);

-- Update existing GPS data structure in perangkats table for GPS devices
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