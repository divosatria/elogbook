-- Create signature_settings table for PDF signature configuration
CREATE TABLE IF NOT EXISTS signature_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL DEFAULT 'Kepala Dinas Kelautan dan Perikanan',
  position VARCHAR(255) NOT NULL DEFAULT 'Kepala Dinas',
  signature_image_path VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default signature settings
INSERT INTO signature_settings (name, position) 
VALUES ('Kepala Dinas Kelautan dan Perikanan', 'Kepala Dinas')
ON DUPLICATE KEY UPDATE id=id;
