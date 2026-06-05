-- Create email_settings table for dynamic email configuration
CREATE TABLE IF NOT EXISTS `email_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `smtp_host` varchar(255) NOT NULL DEFAULT 'smtp.gmail.com',
  `smtp_port` int(11) NOT NULL DEFAULT 587,
  `smtp_secure` tinyint(1) NOT NULL DEFAULT 0,
  `email_user` varchar(255) NOT NULL,
  `email_pass` varchar(255) NOT NULL,
  `from_name` varchar(255) NOT NULL DEFAULT 'E-Logbook Maritime System',
  `from_address` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `test_email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default email settings from environment variables
INSERT INTO `email_settings` (
  `smtp_host`, 
  `smtp_port`, 
  `smtp_secure`, 
  `email_user`, 
  `email_pass`, 
  `from_name`, 
  `from_address`, 
  `is_active`
) VALUES (
  'smtp.gmail.com',
  587,
  0,
  'rahardianzzz01@gmail.com',
  'aepk nnxu tfva tlzv',
  'E-Logbook Maritime System',
  'rahardianzzz01@gmail.com',
  1
) ON DUPLICATE KEY UPDATE
  `smtp_host` = VALUES(`smtp_host`),
  `email_user` = VALUES(`email_user`),
  `from_address` = VALUES(`from_address`);