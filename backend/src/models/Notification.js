const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notifications', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipe: {
    type: DataTypes.ENUM('cuaca', 'perizinan', 'emergency', 'broadcast', 'trip', 'trip_assignment'),
    allowNull: false
  },
  judul: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pesan: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional notification data'
  },
  penerima: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of recipient user IDs'
  },
  dibaca: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of read status by users'
  },
  dikirimOleh: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true
});

module.exports = Notification;