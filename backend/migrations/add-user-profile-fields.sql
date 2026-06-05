-- Migration: Add alamat and foto fields to Users table
-- Date: 2024-01-XX
-- Description: Add profile fields for mobile app user profile management

USE e_logbook;

-- Add alamat column
ALTER TABLE Users 
ADD COLUMN alamat TEXT NULL COMMENT 'User address';

-- Add foto column
ALTER TABLE Users 
ADD COLUMN foto VARCHAR(255) NULL COMMENT 'Profile photo filename';

-- Verify columns
DESCRIBE Users;
