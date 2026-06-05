-- Create test users for mobile app (nahkoda and abk)
-- Password: password123 (hashed with bcrypt)

-- Insert Nahkoda user
INSERT INTO `Users` (`username`, `email`, `password`, `nama`, `noTelepon`, `role`, `isActive`, `createdAt`, `updatedAt`) 
VALUES (
  'nahkoda_test',
  'nahkoda@example.com',
  '$2b$10$YourBcryptHashHere',  -- Ganti dengan hash bcrypt yang benar
  'Kapten Ahmad',
  '+6281234567890',
  'nahkoda',
  1,
  NOW(),
  NOW()
);

-- Insert ABK user
INSERT INTO `Users` (`username`, `email`, `password`, `nama`, `noTelepon`, `role`, `isActive`, `createdAt`, `updatedAt`) 
VALUES (
  'abk_test',
  'abk@example.com',
  '$2b$10$YourBcryptHashHere',  -- Ganti dengan hash bcrypt yang benar
  'Budi Santoso',
  '+6281234567891',
  'abk',
  1,
  NOW(),
  NOW()
);
