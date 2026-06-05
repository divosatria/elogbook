const { sequelize } = require('../config/database');

async function migrate() {
  try {
    // Cek apakah kolom sudah ada
    const [cols] = await sequelize.query(`SHOW COLUMNS FROM catch_polygons LIKE 'min_gt'`);
    if (cols.length === 0) {
      await sequelize.query(`ALTER TABLE catch_polygons ADD COLUMN min_gt DECIMAL(10,2) NULL COMMENT 'Minimum GT kapal yang diizinkan'`);
      console.log('✅ Added min_gt column');
    } else {
      console.log('ℹ️ min_gt already exists');
    }
    const [cols2] = await sequelize.query(`SHOW COLUMNS FROM catch_polygons LIKE 'max_gt'`);
    if (cols2.length === 0) {
      await sequelize.query(`ALTER TABLE catch_polygons ADD COLUMN max_gt DECIMAL(10,2) NULL COMMENT 'Maximum GT kapal yang diizinkan'`);
      console.log('✅ Added max_gt column');
    } else {
      console.log('ℹ️ max_gt already exists');
    }
    console.log('✅ Migration complete');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

migrate();
