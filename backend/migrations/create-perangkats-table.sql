-- Migration: Create perangkats table
-- File: migrations/create-perangkats-table.sql

CREATE TABLE IF NOT EXISTS `perangkats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `namaPerangkat` varchar(255) NOT NULL COMMENT 'Nama perangkat (GPS, Radio, Sonar, dll)',
  `jenisPerangkat` enum('gps','radio','sonar','radar','kompas','mesin','alat_tangkap','keselamatan','lainnya') NOT NULL DEFAULT 'lainnya',
  `merk` varchar(255) DEFAULT NULL COMMENT 'Merk/brand perangkat',
  `model` varchar(255) DEFAULT NULL COMMENT 'Model perangkat',
  `nomorSeri` varchar(255) DEFAULT NULL COMMENT 'Serial number perangkat',
  `tahunPembuatan` int(11) DEFAULT NULL,
  `kondisi` enum('baik','rusak_ringan','rusak_berat','tidak_berfungsi') DEFAULT 'baik',
  `statusOperasional` enum('aktif','maintenance','rusak','tidak_digunakan') DEFAULT 'aktif',
  `tanggalPembelian` datetime DEFAULT NULL,
  `hargaPembelian` decimal(15,2) DEFAULT NULL COMMENT 'Harga pembelian dalam rupiah',
  `spesifikasi` json DEFAULT NULL COMMENT 'Spesifikasi teknis perangkat',
  `foto` text DEFAULT NULL COMMENT 'Path foto perangkat',
  `keterangan` text DEFAULT NULL COMMENT 'Keterangan tambahan',
  `kapalId` int(11) DEFAULT NULL COMMENT 'ID kapal yang menggunakan perangkat (null jika perangkat cadangan)',
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_perangkats_kapal` (`kapalId`),
  KEY `idx_perangkats_jenis` (`jenisPerangkat`),
  KEY `idx_perangkats_kondisi` (`kondisi`),
  KEY `idx_perangkats_status` (`statusOperasional`),
  KEY `idx_perangkats_created_by` (`createdBy`),
  CONSTRAINT `fk_perangkats_kapal` FOREIGN KEY (`kapalId`) REFERENCES `kapals` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_perangkats_created_by` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;