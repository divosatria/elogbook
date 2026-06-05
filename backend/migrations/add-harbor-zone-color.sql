-- Add color column to harbor_zones table
ALTER TABLE harbor_zones 
ADD COLUMN color VARCHAR(7) DEFAULT '#10b981' COMMENT 'Zone color in hex format';
