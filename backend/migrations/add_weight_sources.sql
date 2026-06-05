-- Migration: Add beratMobile and beratIot columns to hasil_tangkap table
-- Date: 2026-02-06
-- Purpose: Support separate weight tracking from Mobile App and IOT devices

-- Add new columns
ALTER TABLE hasil_tangkap
ADD COLUMN berat_mobile DECIMAL(10,2) DEFAULT NULL COMMENT 'Berat dari input Manual Mobile App',
ADD COLUMN berat_iot DECIMAL(10,2) DEFAULT NULL COMMENT 'Berat dari sensor IOT Device';

-- Migrate existing data: assume all existing berat_kg came from mobile input
UPDATE hasil_tangkap 
SET berat_mobile = berat_kg 
WHERE berat_mobile IS NULL;

-- Verify migration
SELECT id, berat_kg, berat_mobile, berat_iot FROM hasil_tangkap LIMIT 10;
