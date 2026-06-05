-- Migration: Add shape_type to harbor_zones table
-- Date: 2024-01-XX
-- Description: Support both circle and polygon shapes for harbor zones

USE e_logbook;

-- Add shape_type column
ALTER TABLE harbor_zones 
ADD COLUMN shape_type ENUM('circle', 'polygon') DEFAULT 'circle' 
COMMENT 'Shape type: circle (uses radius) or polygon (uses coordinates array)'
AFTER coordinates;

-- Update existing records to use circle shape
UPDATE harbor_zones SET shape_type = 'circle' WHERE shape_type IS NULL;

-- Verify changes
DESCRIBE harbor_zones;

SELECT id, name, shape_type, 
  CASE 
    WHEN JSON_TYPE(coordinates) = 'ARRAY' THEN 'polygon'
    WHEN JSON_TYPE(coordinates) = 'OBJECT' THEN 'circle'
    ELSE 'unknown'
  END as detected_type
FROM harbor_zones;
