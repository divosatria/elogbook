-- =====================================================
-- Migration: Add Password Reset Functionality
-- Description: Create password_reset_tokens table and 
--              add password change tracking to users table
-- Date: 2026-02-09
-- =====================================================

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_token (token),
  INDEX idx_expires (expiresAt),
  INDEX idx_user_id (userId),
  INDEX idx_used (used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add password change tracking fields to users table
ALTER TABLE users 
ADD COLUMN requirePasswordChange BOOLEAN DEFAULT FALSE COMMENT 'Flag to force password change on next login';

ALTER TABLE users
ADD COLUMN lastPasswordChange DATETIME COMMENT 'Timestamp of last password change';

-- Update existing users to set lastPasswordChange to current time
UPDATE users 
SET lastPasswordChange = NOW() 
WHERE lastPasswordChange IS NULL;

-- Create cleanup procedure for expired tokens (optional, for maintenance)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS cleanup_expired_reset_tokens()
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expiresAt < NOW() OR used = TRUE;
END //
DELIMITER ;

-- Log migration completion
SELECT 'Password reset migration completed successfully' AS status;
