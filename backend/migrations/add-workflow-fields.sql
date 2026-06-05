-- Add storageData column to kapals table
ALTER TABLE `kapals` 
ADD COLUMN `storageData` JSON NULL COMMENT 'Ice and fish storage data' 
AFTER `dataBahanBakar`;

-- Update Trips status enum to include menunggu_dokumen
ALTER TABLE `Trips` 
MODIFY COLUMN `status` ENUM('menunggu_dokumen', 'menunggu_izin', 'disetujui', 'ditolak', 'sedang_melaut', 'selesai', 'darurat') 
DEFAULT 'menunggu_dokumen';
