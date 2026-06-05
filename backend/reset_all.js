require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'e_logbook',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql',
    storage: './database.sqlite',
    logging: false
  }
);

const User = sequelize.define('users', {
  username: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING }
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to', process.env.DB_DIALECT);
    // update
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin', 10);
    await User.update({ password: hash }, { where: { username: 'admin' }, hooks: false });
    console.log('Password reset to admin successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}
run();
