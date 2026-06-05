-- Create catch_polygons table
-- This table stores fishing zone polygons with coordinates and metadata

CREATE TABLE IF NOT EXISTS catch_polygons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coordinates JSON NOT NULL COMMENT 'Array of lat/lng coordinates forming the polygon',
  zone_type ENUM('fishing', 'restricted', 'conservation', 'special') DEFAULT 'fishing',
  fish_types JSON COMMENT 'Array of fish types allowed in this zone',
  max_vessels INT COMMENT 'Maximum number of vessels allowed',
  color VARCHAR(7) DEFAULT '#3b82f6' NOT NULL,
  regulations JSON COMMENT 'Zone regulations and restrictions',
  seasonal_restrictions JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_zone_type (zone_type),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;