-- Migration: Tambah kolom net_tonnage ke tabel kapals
-- Net Tonnage (NT) = kapasitas ruang muat kapal
-- Berbeda dari Gross Tonnage (GT) = volume total kapal

ALTER TABLE kapals
ADD COLUMN netTonnage DECIMAL(10,2) NULL COMMENT 'Net Tonnage (NT) - kapasitas ruang muat' AFTER beratKapal;
