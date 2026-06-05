-- Migration untuk menambah relasi pemantauan langsung
-- Jalankan query ini di database MySQL

-- 1. Cek dan tambah kolom harborZoneId ke trips
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'trips' 
    AND COLUMN_NAME = 'harborZoneId');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE trips ADD COLUMN harborZoneId INT NULL', 
    'SELECT "Column harborZoneId already exists in trips" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cek dan tambah kolom currentLocation ke trips
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'trips' 
    AND COLUMN_NAME = 'currentLocation');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE trips ADD COLUMN currentLocation JSON NULL COMMENT "Real-time vessel location"', 
    'SELECT "Column currentLocation already exists in trips" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Cek dan tambah kolom harborZoneId ke trip_tasks
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'trip_tasks' 
    AND COLUMN_NAME = 'harborZoneId');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE trip_tasks ADD COLUMN harborZoneId INT NULL', 
    'SELECT "Column harborZoneId already exists in trip_tasks" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Cek dan tambah kolom harbor_zone_id ke operational_tasks
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'operational_tasks' 
    AND COLUMN_NAME = 'harbor_zone_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE operational_tasks ADD COLUMN harbor_zone_id INT NULL', 
    'SELECT "Column harbor_zone_id already exists in operational_tasks" as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Buat tabel POIs
CREATE TABLE IF NOT EXISTS pois (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('harbor_office', 'shipping_office', 'customs', 'fuel_station', 'repair_dock', 'warehouse', 'lighthouse', 'pilot_station') NOT NULL,
  coordinates JSON NOT NULL,
  description TEXT,
  contact JSON,
  operating_hours VARCHAR(255),
  services JSON,
  harbor_zone_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Insert sample POI data
INSERT IGNORE INTO pois (name, type, coordinates, description, contact, operating_hours, services, harbor_zone_id) VALUES
('Kantor Pelabuhan Muara Baru', 'harbor_office', '{"lat": -6.1075, "lng": 106.7803}', 'Kantor administrasi pelabuhan utama', '{"phone": "021-6693456", "email": "admin@pelabuhanmuarabaru.id"}', '24 Jam', '["Perizinan Kapal", "Sertifikat Kelaikan", "Administrasi"]', NULL),
('SPBU Pelabuhan', 'fuel_station', '{"lat": -6.1080, "lng": 106.7800}', 'Stasiun pengisian bahan bakar kapal', '{"phone": "021-6693457"}', '06:00-22:00', '["Bahan Bakar Solar", "Oli Mesin"]', NULL),
('Kantor Pelayaran Nasional', 'shipping_office', '{"lat": -6.1070, "lng": 106.7810}', 'Kantor pelayaran dan shipping', '{"phone": "021-6693458"}', '08:00-17:00', '["Dokumen Kapal", "Manifest", "Clearance"]', NULL),
('Kantor Bea Cukai', 'customs', '{"lat": -6.1065, "lng": 106.7795}', 'Kantor bea cukai pelabuhan', '{"phone": "021-6693459"}', '08:00-16:00', '["Pemeriksaan Barang", "Dokumen Ekspor-Impor"]', NULL),
('Dok Reparasi Kapal', 'repair_dock', '{"lat": -6.1085, "lng": 106.7790}', 'Fasilitas perbaikan dan maintenance kapal', '{"phone": "021-6693460"}', '07:00-19:00', '["Reparasi Mesin", "Perbaikan Hull", "Maintenance"]', NULL),
('Gudang Pelabuhan A', 'warehouse', '{"lat": -6.1090, "lng": 106.7805}', 'Gudang penyimpanan barang pelabuhan', '{"phone": "021-6693461"}', '24 Jam', '["Penyimpanan Barang", "Loading/Unloading"]', NULL),
('Mercusuar Muara Baru', 'lighthouse', '{"lat": -6.1050, "lng": 106.7820}', 'Mercusuar navigasi pelabuhan', '{"phone": "021-6693462"}', '24 Jam', '["Navigasi", "Sinyal Kapal"]', NULL),
('Stasiun Pandu Pelabuhan', 'pilot_station', '{"lat": -6.1060, "lng": 106.7815}', 'Stasiun pemandu kapal masuk pelabuhan', '{"phone": "021-6693463"}', '24 Jam', '["Pemanduan Kapal", "Navigasi Pelabuhan"]', NULL);