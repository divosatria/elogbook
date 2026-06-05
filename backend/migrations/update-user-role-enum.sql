-- Migration: Update role enum to include supervisor and nelayan
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'operator', 'supervisor', 'nahkoda', 'abk', 'nelayan') 
NOT NULL DEFAULT 'nelayan';
