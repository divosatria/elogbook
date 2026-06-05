-- Migration: Add gpsDeviceId column to kapals table
-- File: add-gps-device-id-to-kapals.sql

ALTER TABLE kapals 
ADD COLUMN gpsDeviceId INT NULL 
COMMENT 'ID perangkat GPS dari tabel perangkats';

-- Add foreign key constraint
ALTER TABLE kapals 
ADD CONSTRAINT fk_kapals_gps_device 
FOREIGN KEY (gpsDeviceId) REFERENCES perangkats(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX idx_kapals_gps_device_id ON kapals(gpsDeviceId);