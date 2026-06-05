const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailSetting = sequelize.define('email_settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  smtpHost: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'smtp_host',
    defaultValue: 'smtp.gmail.com'
  },
  smtpPort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'smtp_port',
    defaultValue: 587
  },
  smtpSecure: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'smtp_secure',
    defaultValue: false
  },
  emailUser: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'email_user',
    validate: {
      isEmail: true
    }
  },
  emailPass: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'email_pass'
  },
  fromName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'from_name',
    defaultValue: 'E-Logbook Maritime System'
  },
  fromAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'from_address',
    validate: {
      isEmail: true
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'is_active',
    defaultValue: true
  },
  testEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'test_email',
    validate: {
      isEmail: true
    }
  }
}, {
  tableName: 'email_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EmailSetting;