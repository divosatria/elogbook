-- Migration to add lastLoginAt field to Users table
-- Run this SQL to update existing database

ALTER TABLE Users ADD COLUMN lastLoginAt DATETIME NULL AFTER lastLoginIp;

-- Update existing records to set lastLoginAt to updatedAt for users who have logged in
UPDATE Users SET lastLoginAt = updatedAt WHERE lastLoginIp IS NOT NULL;