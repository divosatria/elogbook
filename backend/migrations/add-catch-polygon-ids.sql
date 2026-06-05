-- Add catchPolygonIds column to trips table
-- This column stores array of catch polygon IDs for multiple fishing zones

ALTER TABLE trips 
ADD COLUMN catchPolygonIds JSON NULL 
COMMENT 'Array of catch polygon IDs for multiple fishing zones';