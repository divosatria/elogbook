const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'e_logbook',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    storage: './database.sqlite',
    logging: process.env.LOG_LEVEL === 'debug' ? console.log : false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      charset: 'utf8mb4',
      connectTimeout: 10000
    },
    define: {
      charset: 'utf8mb4'
    },
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ESOCKETTIMEDOUT/,
        /EHOSTDOWN/,
        /EPIPE/,
        /EAI_AGAIN/
      ]
    }
  }
);

const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL Connected successfully');
      console.log(`📊 Database: ${process.env.DB_NAME || 'e_logbook'}`);
      console.log(`🏠 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      
      // Skip sync to avoid key conflicts
      // await sequelize.sync({ 
      //   force: false, 
      //   alter: false, 
      //   logging: false 
      // });
      // console.log('✅ Database tables synced');
      
      return true;
    } catch (error) {
      console.error(`❌ MySQL connection attempt ${i + 1}/${retries} failed:`, error.message);
      
      if (i === retries - 1) {
        console.error('❌ All connection attempts failed');
        
        if (error.message.includes('Duplicate foreign key constraint')) {
          console.error('💡 Foreign key constraint conflict detected.');
          console.error('🔧 Run: mysql -u e_logbook_user -p e_logbook < fix-foreign-keys.sql');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.error('💡 Database server is not running or not accessible');
          console.error('🔧 Check if MySQL is running: systemctl status mysql');
        } else if (error.message.includes('Access denied')) {
          console.error('💡 Database credentials are incorrect');
          console.error('🔧 Check DB_USER and DB_PASSWORD in .env file');
        } else {
          console.error('💡 Please check your database configuration in .env file');
        }
        
        return false;
      }
      
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
};

const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
};

module.exports = { sequelize, connectDB, closeDB };