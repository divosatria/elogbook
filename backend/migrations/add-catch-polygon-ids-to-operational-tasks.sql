-- Add catch_polygon_ids column to operational_tasks table
-- This column stores array of catch polygon IDs for multiple fishing zones

ALTER TABLE operational_tasks 
ADD COLUMN catch_polygon_ids JSON NULL 
COMMENT 'Array of catch polygon IDs for multiple fishing zones';