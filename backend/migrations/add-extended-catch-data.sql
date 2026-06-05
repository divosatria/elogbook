-- Add extendedData column to hasil_tangkap table
-- This stores additional mobile app fields that don't fit in existing schema

ALTER TABLE `hasil_tangkap` 
ADD COLUMN `extendedData` JSON NULL COMMENT 'Extended catch data from mobile app' 
AFTER `status`;
