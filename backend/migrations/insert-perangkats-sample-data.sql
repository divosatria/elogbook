-- Sample data for perangkats table
INSERT INTO `perangkats` (`namaPerangkat`, `jenisPerangkat`, `merk`, `model`, `nomorSeri`, `tahunPembuatan`, `kondisi`, `statusOperasional`, `tanggalPembelian`, `hargaPembelian`, `spesifikasi`, `keterangan`, `kapalId`, `createdBy`, `createdAt`, `updatedAt`) VALUES
('GPS Garmin GPSMAP 8612xsv', 'gps', 'Garmin', 'GPSMAP 8612xsv', 'GM8612-2024-001', 2024, 'baik', 'aktif', '2024-01-15 00:00:00', 25000000.00, '{"layar": "12 inch", "resolusi": "1280x800", "waterproof": "IPX7", "fitur": ["GPS", "GLONASS", "Galileo", "Sonar", "Radar"]}', 'GPS dengan sonar terintegrasi untuk navigasi dan deteksi ikan', 2, 1, NOW(), NOW()),

('Radio VHF Icom IC-M506', 'radio', 'Icom', 'IC-M506', 'IC506-2024-002', 2024, 'baik', 'aktif', '2024-01-20 00:00:00', 8500000.00, '{"frekuensi": "156-162 MHz", "power": "25W", "channel": 200, "waterproof": "IPX8", "fitur": ["DSC", "AIS", "GPS"]}', 'Radio VHF untuk komunikasi maritim dengan fitur DSC dan AIS', 2, 1, NOW(), NOW()),

('Fish Finder Lowrance HDS-12 Live', 'sonar', 'Lowrance', 'HDS-12 Live', 'HDS12-2024-003', 2024, 'baik', 'aktif', '2024-02-01 00:00:00', 18000000.00, '{"layar": "12 inch", "sonar": "CHIRP", "resolusi": "1280x800", "fitur": ["LiveSight", "StructureScan", "GPS"]}', 'Fish finder dengan teknologi LiveSight untuk deteksi ikan real-time', 3, 1, NOW(), NOW()),

('Radar Furuno DRS4W', 'radar', 'Furuno', 'DRS4W', 'DRS4W-2024-004', 2024, 'baik', 'aktif', '2024-02-10 00:00:00', 35000000.00, '{"range": "36 NM", "power": "4kW", "antenna": "4ft", "fitur": ["WiFi", "Ethernet", "ARPA"]}', 'Radar maritim untuk navigasi dan deteksi objek', 3, 1, NOW(), NOW()),

('Kompas Gyro Sperry Marine', 'kompas', 'Sperry Marine', 'NAVIGAT X MK1', 'NAVX-2024-005', 2024, 'baik', 'aktif', '2024-02-15 00:00:00', 45000000.00, '{"type": "Gyrocompass", "accuracy": "0.1°", "settling_time": "4 hours", "fitur": ["Auto-alignment", "Digital display"]}', 'Kompas gyro untuk navigasi presisi', 5, 1, NOW(), NOW()),

('Mesin Yamaha F150', 'mesin', 'Yamaha', 'F150AETX', 'YMH150-2024-006', 2024, 'baik', 'aktif', '2024-01-10 00:00:00', 85000000.00, '{"power": "150 HP", "cylinder": 4, "displacement": "2.8L", "fuel_system": "EFI", "fitur": ["Electric start", "Power trim", "Digital gauge"]}', 'Mesin tempel 4-tak untuk propulsi utama', 2, 1, NOW(), NOW()),

('Jaring Trawl 40m', 'alat_tangkap', 'Local Made', 'Trawl Net 40', 'TN40-2024-007', 2024, 'baik', 'aktif', '2024-01-25 00:00:00', 15000000.00, '{"panjang": "40m", "lebar": "25m", "mesh_size": "40mm", "material": "Nylon", "fitur": ["Reinforced edges", "Float line", "Lead line"]}', 'Jaring trawl untuk penangkapan ikan demersal', 3, 1, NOW(), NOW()),

('Life Jacket Pelampung 20 pcs', 'keselamatan', 'Yamaha Marine', 'YM-LJ-001', 'YMLJ-2024-008', 2024, 'baik', 'aktif', '2024-01-05 00:00:00', 5000000.00, '{"quantity": 20, "type": "Inflatable", "buoyancy": "150N", "material": "PVC", "fitur": ["Auto-inflate", "Manual inflate", "Whistle", "Light"]}', 'Pelampung otomatis untuk keselamatan ABK', 5, 1, NOW(), NOW()),

('EPIRB Emergency Beacon', 'keselamatan', 'ACR Electronics', 'GlobalFix V4', 'GFV4-2024-009', 2024, 'baik', 'aktif', '2024-01-30 00:00:00', 12000000.00, '{"frequency": "406 MHz", "battery_life": "5 years", "gps": "Yes", "fitur": ["Automatic activation", "Manual activation", "Strobe light"]}', 'Emergency beacon untuk situasi darurat di laut', NULL, 1, NOW(), NOW()),

('Winch Hydraulic 5 Ton', 'lainnya', 'Brevini', 'BH-5000', 'BH5000-2024-010', 2024, 'baik', 'maintenance', '2024-02-20 00:00:00', 65000000.00, '{"capacity": "5 ton", "type": "Hydraulic", "speed": "15 m/min", "power": "15 kW", "fitur": ["Variable speed", "Load monitoring", "Emergency stop"]}', 'Winch hidrolik untuk operasi jaring dan jangkar', NULL, 1, NOW(), NOW());