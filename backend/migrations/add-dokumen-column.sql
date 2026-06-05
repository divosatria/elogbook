-- Migration: Add dokumen column to Users table
-- Purpose: Store profile documents for nahkoda and abk users

ALTER TABLE `Users` 
ADD COLUMN `dokumen` JSON NULL COMMENT 'Profile documents array (KTP, Buku Pelaut, etc.)' 
AFTER `isActive`;
