-- Migration: Tambah kolom pelabuhanAsal dan pelabuhanAsalId ke tabel kapals

-- Cek dan tambah pelabuhanAsal (skip kalau sudah ada)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kapals' AND COLUMN_NAME = 'pelabuhanAsal');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE kapals ADD COLUMN pelabuhanAsal VARCHAR(255) NULL COMMENT "Nama pelabuhan asal (teks bebas)"',
  'SELECT "Column pelabuhanAsal already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cek dan tambah pelabuhanAsalId (skip kalau sudah ada)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kapals' AND COLUMN_NAME = 'pelabuhanAsalId');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE kapals ADD COLUMN pelabuhanAsalId INT NULL COMMENT "FK ke harbor_zones - pelabuhan asal/pangkalan tetap kapal"',
  'SELECT "Column pelabuhanAsalId already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Cek dan tambah foreign key (skip kalau sudah ada)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kapals' AND CONSTRAINT_NAME = 'fk_kapals_pelabuhan_asal');

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE kapals ADD CONSTRAINT fk_kapals_pelabuhan_asal FOREIGN KEY (pelabuhanAsalId) REFERENCES harbor_zones (id) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT "FK fk_kapals_pelabuhan_asal already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
