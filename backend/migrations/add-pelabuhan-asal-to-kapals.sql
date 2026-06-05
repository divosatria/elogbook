-- Migration: Tambah kolom pelabuhan_asal ke tabel kapals
-- Jalankan: mysql -u root -p e_logbook < add-pelabuhan-asal-to-kapals.sql

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'kapals' AND COLUMN_NAME = 'pelabuhanAsal');

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE kapals ADD COLUMN pelabuhanAsal VARCHAR(255) NULL COMMENT "Pelabuhan asal/pangkalan tetap kapal"',
  'SELECT "Column pelabuhanAsal already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
