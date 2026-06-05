const { sequelize } = require('../config/database');

async function migrate() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fishing_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id INT NOT NULL,
        kapal_id INT NOT NULL,
        location JSON NOT NULL,
        depth_meters DECIMAL(10,2) NULL,
        action_type ENUM('net_deployed','net_retrieved') NOT NULL DEFAULT 'net_deployed',
        notes TEXT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (kapal_id) REFERENCES kapals(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Table fishing_points created');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
