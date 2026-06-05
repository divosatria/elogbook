-- Add lastLoginIp column to Users table to track client IP on login
ALTER TABLE `Users`
  ADD COLUMN `lastLoginIp` VARCHAR(45) NULL AFTER `noTelepon`;
