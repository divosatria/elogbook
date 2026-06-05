-- Migration: Tambah kolom hasil_tangkap_ids dan submitted_by ke fishing_points
-- Jalankan sekali sebelum restart server

-- Cek dan tambah hasil_tangkap_ids
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fishing_points' AND COLUMN_NAME = 'hasil_tangkap_ids');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE fishing_points ADD COLUMN hasil_tangkap_ids JSON NULL COMMENT "Array semua ID hasil tangkap di titik ini"', 
  'SELECT "Column hasil_tangkap_ids already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cek dan tambah submitted_by
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fishing_points' AND COLUMN_NAME = 'submitted_by');

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE fishing_points ADD COLUMN submitted_by INT NULL COMMENT "User ID yang submit (nahkoda atau ABK)"', 
  'SELECT "Column submitted_by already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
