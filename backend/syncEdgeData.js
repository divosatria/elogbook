const { sequelize } = require('./src/config/database');
const EdgeData = require('./src/models/EdgeData');

async function syncEdgeTable() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Sync only the EdgeData table
    await EdgeData.sync({ alter: true });
    console.log('EdgeData table has been created/updated successfully.');
    
    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database or sync table:', error);
    process.exit(1);
  }
}

syncEdgeTable();
