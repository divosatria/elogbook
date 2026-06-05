const { User } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function resetUsers() {
  try {
    // Authenticate and sync DB connection
    await sequelize.authenticate();
    console.log('Database connected.');

    // Delete all users
    await User.destroy({ where: {} });
    console.log('All existing users deleted.');

    // Create Admin
    await User.create({
      username: 'admin',
      email: 'admin@elogbookipb.web.id', // email is required and unique
      password: 'admin123',
      role: 'admin',
      nama: 'Administrator'
    });
    console.log('Admin account created.');

    // Create Nahkoda
    await User.create({
      username: 'testnahkoda',
      email: 'testnahkoda@gmail.com',
      password: 'Nahkoda123',
      role: 'nahkoda',
      nama: 'Nahkoda Tester'
    });
    console.log('Nahkoda account created.');

    // Create ABK
    await User.create({
      username: 'testabk',
      email: 'testabk@gmail.com',
      password: 'ABK12345',
      role: 'abk',
      nama: 'ABK Tester'
    });
    console.log('ABK account created.');

    console.log('User reset successful!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting users:', error);
    process.exit(1);
  }
}

resetUsers();
